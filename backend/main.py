"""FastAPI API for the EasyPay prototype.

All wallet routes require the Supabase access token issued after email/password
sign-in. Razorpay signatures are verified server-side before a wallet credit is
recorded.
"""

from __future__ import annotations

import asyncio
import math
import re
import uuid
from dataclasses import dataclass

import razorpay
import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.ai_service import ask_easypay_ai
from backend.config import config
from backend.database import DatabaseError, apply_wallet_transaction, get_account


app = FastAPI(title="EasyPay API", version="1.0.0")

# Bearer tokens are sent explicitly rather than cookies, so this is suitable for
# local development and can be narrowed to a deployed frontend origin later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

razorpay_client = (
    razorpay.Client(auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET))
    if config.razorpay_ready
    else None
)


@dataclass
class AuthUser:
    id: str
    email: str
    full_name: str
    access_token: str


class AIQuery(BaseModel):
    prompt: str = Field(min_length=1, max_length=800)
    lang: str = Field(default="en", max_length=10)


LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada",
    "ml": "Malayalam",
}


class AmountRequest(BaseModel):
    amount: float = Field(gt=0, le=100000)


class RechargeVerification(BaseModel):
    razorpay_order_id: str = Field(min_length=3, max_length=100)
    razorpay_payment_id: str = Field(min_length=3, max_length=100)
    razorpay_signature: str = Field(min_length=3, max_length=300)


class VendorPayment(AmountRequest):
    vendor_name: str = Field(min_length=2, max_length=80)
    upi_id: str | None = Field(default=None, max_length=120)


def _raise_database_error(error: DatabaseError) -> None:
    raise HTTPException(status_code=503, detail=str(error)) from error


def _clean_amount(amount: float) -> float:
    if not math.isfinite(amount) or amount <= 0:
        raise HTTPException(status_code=422, detail="Enter a valid positive amount.")
    return round(amount, 2)


def _fetch_auth_user(access_token: str) -> dict:
    if not config.supabase_ready:
        raise HTTPException(status_code=503, detail="Supabase is not configured in backend/.env.")
    try:
        response = requests.get(
            f"{config.SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": config.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=10,
        )
    except requests.RequestException as error:
        raise HTTPException(status_code=503, detail="Could not reach Supabase authentication.") from error
    if not response.ok:
        raise HTTPException(status_code=401, detail="Your session expired. Please sign in again.")
    return response.json()


async def current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in is required.")
    access_token = authorization.split(" ", 1)[1].strip()
    raw_user = await asyncio.to_thread(_fetch_auth_user, access_token)
    user_id = raw_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="The sign-in session is invalid.")
    metadata = raw_user.get("user_metadata") or {}
    email = raw_user.get("email") or ""
    full_name = metadata.get("full_name") or metadata.get("name") or email.split("@", 1)[0] or "EasyPay user"
    return AuthUser(id=user_id, email=email, full_name=full_name, access_token=access_token)


def _command_from_text(prompt: str) -> dict | None:
    normalized = " ".join(prompt.lower().split())
    amount_match = re.search(r"(?:₹|rs\.?|inr|rupees?)?\s*(\d+(?:\.\d{1,2})?)", normalized)
    amount = float(amount_match.group(1)) if amount_match else None

    if re.search(r"\b(recharge|add money|top up|topup)\b", normalized) and amount:
        return {"name": "recharge", "amount": amount}

    # Match "pay 25 to xcx", "send 50 to john", "payment of 100 to amazon", "transfer 20 to sally"
    payment_match = re.search(
        r"\b(pay|send|transfer|payment)\b.*?\b(\d+(?:\.\d{1,2})?)\b.*?\bto\b\s+(.+)",
        prompt,
        flags=re.IGNORECASE,
    )
    if payment_match:
        amount = float(payment_match.group(2))
        vendor = payment_match.group(3).strip(" .,!?")
        if vendor:
            return {"name": "vendor_payment", "amount": amount, "vendor": vendor[:80]}
    return None


def _require_razorpay() -> razorpay.Client:
    if razorpay_client is None:
        raise HTTPException(status_code=503, detail="Razorpay is not configured in backend/.env.")
    return razorpay_client


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "supabase_configured": config.supabase_ready,
        "razorpay_configured": config.razorpay_ready,
        "ollama_model": config.OLLAMA_MODEL,
    }


@app.get("/public-config")
async def public_config() -> dict:
    if not config.supabase_ready:
        raise HTTPException(status_code=503, detail="Add SUPABASE_URL and SUPABASE_ANON_KEY to backend/.env.")
    return {
        "supabase_url": config.SUPABASE_URL,
        "supabase_anon_key": config.SUPABASE_ANON_KEY,
        "razorpay_key_id": config.RAZORPAY_KEY_ID,
    }


@app.get("/account")
async def account(user: AuthUser = Depends(current_user)) -> dict:
    try:
        return await asyncio.to_thread(get_account, user.access_token, user.id, user.full_name)
    except DatabaseError as error:
        _raise_database_error(error)


@app.get("/vendors/recent")
async def get_recent_vendors(user: AuthUser = Depends(current_user)) -> list[str]:
    try:
        account_data = await asyncio.to_thread(get_account, user.access_token, user.id, user.full_name)
        vendors = []
        for t in account_data["transactions"]:
            if t.get("category") == "Vendor payment":
                desc = t.get("description", "")
                if "Wallet payment to " in desc:
                    name = desc.split("Wallet payment to ")[1].split(" (")[0].strip()
                    if name not in vendors:
                        vendors.append(name)
        return vendors[:5]
    except DatabaseError as error:
        _raise_database_error(error)


@app.get("/insight")
async def insight(user: AuthUser = Depends(current_user)) -> dict:
    try:
        account_data = await asyncio.to_thread(get_account, user.access_token, user.id, user.full_name)
    except DatabaseError as error:
        _raise_database_error(error)
    prompt = "Give one short, practical insight based on this wallet activity."
    answer = await asyncio.to_thread(ask_easypay_ai, prompt, account_data["transactions"])
    return {"answer": answer, "model": config.OLLAMA_MODEL}


@app.post("/ask")
async def ask(query: AIQuery, user: AuthUser = Depends(current_user)) -> dict:
    # Give Qwen a language name, not an ambiguous two-letter code.
    prompt = query.prompt
    language_name = LANGUAGE_NAMES.get(query.lang.lower(), "English")
    prompt = f"Reply only in {language_name}. User request: {prompt}"

    command = _command_from_text(query.prompt)
    if command:
        if command["name"] == "recharge":
            return {
                "type": "action",
                "action": command,
                "answer": f"I can prepare a ₹{command['amount']:.2f} wallet recharge. You will confirm it in Razorpay.",
            }
        return {
            "type": "action",
            "action": command,
            "answer": f"I can prepare a ₹{command['amount']:.2f} wallet payment to {command['vendor']}. You will confirm the wallet debit.",
        }

    if re.search(r"\b(refund|reverse|undo)\b", query.prompt, flags=re.IGNORECASE):
        return {
            "type": "text",
            "answer": "For safety, refunds are not automatic. A real Razorpay refund must be initiated against the original captured payment in Razorpay; this wallet will not pretend that money was returned.",
        }

    try:
        account_data = await asyncio.to_thread(get_account, user.access_token, user.id, user.full_name)
    except DatabaseError as error:
        _raise_database_error(error)
    answer = await asyncio.to_thread(ask_easypay_ai, prompt, account_data["transactions"])
    return {"type": "text", "answer": answer, "model": config.OLLAMA_MODEL}


@app.post("/recharge/create-order")
async def create_recharge_order(request: AmountRequest, user: AuthUser = Depends(current_user)) -> dict:
    amount = _clean_amount(request.amount)
    client = _require_razorpay()
    try:
        order = await asyncio.to_thread(
            client.order.create,
            {
                "amount": int(round(amount * 100)),
                "currency": "INR",
                "payment_capture": 1,
                "receipt": f"ep_{uuid.uuid4().hex[:22]}",
                "notes": {"user_id": user.id, "purpose": "easypay_wallet_recharge"},
            },
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail="Razorpay could not create the recharge order.") from error
    return {
        "order_id": order["id"],
        "amount_paise": order["amount"],
        "currency": order["currency"],
        # Razorpay key IDs are publishable. The secret stays exclusively in backend/.env.
        "key_id": config.RAZORPAY_KEY_ID,
    }


@app.post("/recharge/verify")
async def verify_recharge(request: RechargeVerification, user: AuthUser = Depends(current_user)) -> dict:
    client = _require_razorpay()
    try:
        await asyncio.to_thread(
            client.utility.verify_payment_signature,
            {
                "razorpay_order_id": request.razorpay_order_id,
                "razorpay_payment_id": request.razorpay_payment_id,
                "razorpay_signature": request.razorpay_signature,
            },
        )
        order = await asyncio.to_thread(client.order.fetch, request.razorpay_order_id)
        payment = await asyncio.to_thread(client.payment.fetch, request.razorpay_payment_id)
    except Exception as error:
        raise HTTPException(status_code=400, detail="Razorpay could not verify this payment.") from error

    if order.get("notes", {}).get("user_id") != user.id or payment.get("order_id") != request.razorpay_order_id:
        raise HTTPException(status_code=403, detail="This Razorpay payment does not belong to this wallet.")
    if payment.get("status") != "captured":
        raise HTTPException(status_code=409, detail="The payment is not captured yet. Please try again shortly.")

    amount = _clean_amount(float(payment.get("amount", 0)) / 100)
    try:
        balance = await asyncio.to_thread(
            apply_wallet_transaction,
            user.access_token,
            amount=amount,
            description="Wallet recharge via Razorpay",
            category="Wallet recharge",
            ai_model="Razorpay Checkout",
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_order_id=request.razorpay_order_id,
        )
    except DatabaseError as error:
        _raise_database_error(error)
    return {"status": "success", "balance": balance}


@app.post("/vendor/pay")
async def pay_vendor(request: VendorPayment, user: AuthUser = Depends(current_user)) -> dict:
    amount = _clean_amount(request.amount)
    vendor_name = " ".join(request.vendor_name.split())
    if not vendor_name:
        raise HTTPException(status_code=422, detail="Enter a vendor name.")
    detail = f"Wallet payment to {vendor_name}"
    if request.upi_id:
        detail += f" ({request.upi_id.strip()[:120]})"
    try:
        balance = await asyncio.to_thread(
            apply_wallet_transaction,
            user.access_token,
            amount=-amount,
            description=detail,
            category="Vendor payment",
            ai_model="EasyPay wallet",
        )
    except DatabaseError as error:
        _raise_database_error(error)
    return {"status": "recorded", "balance": balance, "message": f"₹{amount:.2f} recorded for {vendor_name}."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
