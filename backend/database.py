"""Small Supabase REST client used with the signed-in user's JWT.

Using the caller's JWT means Supabase RLS stays in charge of who can read or
write a wallet. A service_role key is deliberately not required or exposed.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from backend.config import config


class DatabaseError(RuntimeError):
    """A safe, user-facing database error."""


def _ensure_configured() -> None:
    if not config.supabase_ready:
        raise DatabaseError("Supabase is not configured. Add the URL and anon key to backend/.env.")


def _headers(access_token: str, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": config.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _request(
    method: str,
    path: str,
    access_token: str,
    *,
    params: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
    prefer: str | None = None,
) -> Any:
    _ensure_configured()
    try:
        response = requests.request(
            method,
            f"{config.SUPABASE_URL}/rest/v1/{path.lstrip('/')}",
            headers=_headers(access_token, prefer),
            params=params,
            json=payload,
            timeout=12,
        )
    except requests.RequestException as error:
        raise DatabaseError("Could not reach Supabase. Check your network and project URL.") from error

    if not response.ok:
        try:
            details = response.json()
            message = details.get("message") or details.get("hint") or str(details)
        except ValueError:
            message = response.text or "Unknown Supabase error"
        raise DatabaseError(f"Supabase rejected this request: {message}")

    if not response.content:
        return None
    try:
        return response.json()
    except ValueError:
        return response.text


def _number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def ensure_profile(access_token: str, user_id: str, full_name: str) -> dict[str, Any]:
    rows = _request(
        "GET",
        "profiles",
        access_token,
        params={"select": "id,full_name,balance,currency", "id": f"eq.{user_id}"},
    )
    if rows:
        return rows[0]

    created = _request(
        "POST",
        "profiles",
        access_token,
        payload={"id": user_id, "full_name": full_name, "balance": 0, "currency": "INR"},
        prefer="resolution=merge-duplicates,return=representation",
    )
    if isinstance(created, list) and created:
        return created[0]
    return {"id": user_id, "full_name": full_name, "balance": 0, "currency": "INR"}


def get_transactions(access_token: str, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
    rows = _request(
        "GET",
        "transactions",
        access_token,
        params={
            "select": "id,description,amount,category,ai_model,status,created_at,razorpay_payment_id",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": str(limit),
        },
    )
    return rows if isinstance(rows, list) else []


def _is_current_month(timestamp: str | None) -> bool:
    if not timestamp:
        return False
    try:
        when = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return False
    now = datetime.now(timezone.utc)
    return when.year == now.year and when.month == now.month


def get_account(access_token: str, user_id: str, full_name: str) -> dict[str, Any]:
    profile = ensure_profile(access_token, user_id, full_name)
    transactions = get_transactions(access_token, user_id)
    income = sum(
        _number(item.get("amount"))
        for item in transactions
        if _is_current_month(item.get("created_at")) and _number(item.get("amount")) > 0
    )
    expenses = abs(
        sum(
            _number(item.get("amount"))
            for item in transactions
            if _is_current_month(item.get("created_at")) and _number(item.get("amount")) < 0
        )
    )
    return {
        "profile": {
            "id": profile.get("id", user_id),
            "full_name": profile.get("full_name") or full_name,
            "balance": _number(profile.get("balance")),
            "currency": profile.get("currency") or "INR",
        },
        "transactions": transactions,
        "stats": {"income": income, "expenses": expenses},
    }


def apply_wallet_transaction(
    access_token: str,
    *,
    amount: float,
    description: str,
    category: str,
    ai_model: str | None = None,
    razorpay_payment_id: str | None = None,
    razorpay_order_id: str | None = None,
) -> float:
    """Apply an atomic, RLS-protected wallet ledger entry through SQL RPC."""
    result = _request(
        "POST",
        "rpc/apply_wallet_transaction",
        access_token,
        payload={
            "p_amount": round(float(amount), 2),
            "p_description": description,
            "p_category": category,
            "p_ai_model": ai_model,
            "p_razorpay_payment_id": razorpay_payment_id,
            "p_razorpay_order_id": razorpay_order_id,
        },
    )
    if isinstance(result, list):
        result = result[0] if result else 0
    return _number(result)
