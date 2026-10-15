# EasyPay

EasyPay is a local FastAPI and Supabase wallet prototype with email/password
sign-in, a Razorpay test recharge flow, an atomic wallet ledger, Supabase
Realtime updates, and a local Ollama assistant using `qwen3:8b`.

## What changed

- Email/password authentication only — no Google sign-in.
- The backend now verifies the signed-in Supabase user for every wallet route.
- Dashboard data no longer waits for Ollama; AI is requested separately.
- Razorpay recharge verification uses the server-side Razorpay signature check.
- Wallet credits and debits are saved atomically, with an AI/source column in
  history.
- Realtime refreshes the page immediately when `profiles` or `transactions`
  changes, with a quiet 45-second fallback rather than a five-second poll.

## One-time Supabase setup

1. In Supabase, open **SQL Editor**.
2. Run [`supabase/schema.sql`](supabase/schema.sql). It replaces the old test
   `profiles` and `transactions` tables, but does not remove Auth users.
3. In **Authentication → Providers**, keep **Email** enabled. Email confirmation
   is enabled by default for hosted projects. Add your local frontend URL (for
   example `http://localhost:63342`) under **Authentication → URL Configuration
   → Redirect URLs**.
4. Do not put a `service_role` or secret Supabase key in the frontend. The app
   uses only the anon/publishable key and Row Level Security.

## Configure and run locally

Create `backend/.env` from `backend/.env.example`. Your existing
`SUPABASE_KEY` is accepted for compatibility, but `SUPABASE_ANON_KEY` is the
preferred name.

```bash
cd /Users/naitiksingh/Desktop/EasyPay
python -m pip install -r backend/requirements.txt
python -m backend.main
```

Leave that terminal running. Open `frontend/index.html` with your local web
server (WebStorm's built-in server is fine), create an account, confirm the
email if prompted, then sign in.

Check `http://127.0.0.1:8000/health` if the browser says the backend is not
available.

## Payments and vendor transfers

The **Recharge** screen opens Razorpay Checkout in test mode. A successful
payment is checked server-side and then recorded once in the wallet ledger.

**Pay Vendor** currently records a verified *wallet debit* and UPI reference in
the demo ledger. It does not send money to a real UPI account. Real merchant
payouts need a suitable Razorpay payouts/route product, compliance/KYC, and a
server-side payout implementation; standard Razorpay Checkout is for collecting
payments, not sending payouts.

The AI can prepare a recharge or wallet payment command, but it always leaves a
visible confirmation before checkout or a debit. It never silently moves money.

## Security notes

- Keep `RAZORPAY_KEY_SECRET` only in `backend/.env`.
- Do not commit `.env` files.
- Use Razorpay test keys until the full business, compliance, refund, and payout
  flows are ready for a production review.
