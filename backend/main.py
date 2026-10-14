from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.database import get_account_balance, get_recent_transactions, update_balance, add_transaction
from backend.ai_service import ask_easypay_ai
from backend.translation_service import translate_text
from backend.config import config
import razorpay
import uuid
import requests
import json

app = FastAPI(title="EasyPay API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    client = razorpay.Client(auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET))
except Exception as e:
    print(f"Razorpay Init Error: {e}")
    client = None

class AIQuery(BaseModel):
    prompt: str
    lang: str = "en"

class RechargeRequest(BaseModel):
    amount: float
    user_id: str

class VerifyPaymentRequest(BaseModel):
    payment_id: str
    amount: float
    user_id: str

class VendorPaymentRequest(BaseModel):
    amount: float
    vendor_name: str
    user_id: str

class LoginRequest(BaseModel):
    email: str
    password: str

@app.get("/config")
async def get_config():
    return {"razorpay_key_id": config.RAZORPAY_KEY_ID}

@app.post("/login")
async def login(request: LoginRequest):
    # Simplified prototype login: accepts any email/pass and returns user_123
    return {"status": "success", "user_id": "user_123", "name": "Naitik Singh"}

@app.get("/account")
async def get_account():
    user_id = "user_123"
    transactions = get_recent_transactions(user_id)
    insight_prompt = "Analyze these transactions and give a one-sentence, punchy financial insight or tip. Be professional."
    ai_insight = ask_easypay_ai(insight_prompt, transactions)
    return {
        "balance": get_account_balance(user_id),
        "transactions": transactions,
        "insight": ai_insight,
        "stats": {"income": 0.0, "expenses": 0.0}
    }

@app.post("/ask")
async def ask_ai(query: AIQuery):
    try:
        transactions = get_recent_transactions("user_123")
        system_instruction = (
            "You are the EasyPay AI. "
            "If the user wants to make a payment, return ONLY JSON: {\"action\": \"pay\", \"amount\": number, \"vendor\": \"name\"}. "
            "If the user wants to recharge, return ONLY JSON: {\"action\": \"recharge\", \"amount\": number}. "
            "If the user wants a refund, return ONLY JSON: {\"action\": \"refund\"}. "
            "Otherwise, respond as a helpful financial advisor."
        )
        full_prompt = f"{system_instruction}\n\nUser: {query.prompt}"
        ai_response = ask_easypay_ai(full_prompt, transactions)
        try:
            cmd = json.loads(ai_//response)
            if "action" in cmd:
                return {"type": "command", "data": cmd}
        except:
            pass
        final_response = translate_text(ai_response, query.lang)
        return {"type": "text", "answer": final_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.post("/recharge/create-order")
async def create_recharge_order(request: RechargeRequest):
    if not client: raise HTTPException(status_code=500, detail="Razorpay not configured")
    try:
        data = {"amount": int(request.amount * 100), "currency": "INR", "payment_capture": 1}
        order = client.order.create(data=data)
        return {"order_id": order['id'], "amount": request.amount, "currency": "INR"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recharge/verify")
async def verify_recharge(request: VerifyPaymentRequest):
    if update_balance(request.user_id, request.amount):
        add_transaction(request.user_id, "Wallet Recharge via Razorpay", request.amount, "Income", config.OLLAMA_MODEL)
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Update failed")

@app.post("/pay-vendor/create-order")
async def create_vendor_order(request: VendorPaymentRequest):
    if not client: raise HTTPException(status_code=500, detail="Razorpay not configured")
    try:
        data = {"amount": int(request.amount * 100), "currency": "INR", "payment_capture": 1}
        order = client.order.create(data=data)
        return {"order_id": order['id'], "amount": request.amount, "currency": "INR"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/pay-vendor/verify")
async def verify_vendor_payment(request: VerifyPaymentRequest):
    # In a real app, we verify the payment_id first. 
    # Here, we treat the successful Razorpay callback as the trigger to deduct balance or log payment.
    # Since it's a vendor payment via Razorpay, we log the transaction.
    if add_transaction(request.user_id, f"Payment to Vendor", -request.amount, "Vendor", config.OLLAMA_MODEL):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Payment log failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
