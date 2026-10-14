from supabase import create_client, Client
from backend.config import config

# Initialize Supabase client
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY) if config.SUPABASE_URL else None

def get_account_balance(user_id: str):
    if not supabase:
        return {"balance": 0.0, "currency": "₹", "account_type": "Standard"}
    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        if response.data:
            return response.data
        supabase.table("profiles").upsert({"id": user_id, "balance": 0.0, "currency": "₹", "account_type": "Standard"}).execute()
        return {"balance": 0.0, "currency": "₹", "account_type": "Standard"}
    except Exception as e:
        print(f"Database Error (Balance): {e}")
        return {"balance": 0.0, "currency": "₹", "account_type": "Error"}

def get_recent_transactions(user_id: str):
    if not supabase:
        return []
    try:
        # Now including 'ai_model' column
        response = supabase.table("transactions").select("*").eq("user_id", user_id).order("date", desc=True).limit(20).execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Database Error (Transactions): {e}")
        return []

def update_balance(user_id: str, amount: float):
    if not supabase:
        return False
    try:
        current = get_account_balance(user_id)
        current_bal = float(current.get('balance', 0))
        new_balance = current_bal + amount
        supabase.table("profiles").upsert({
            "id": user_id, 
            "balance": new_balance,
            "currency": current.get('currency', '₹'),
            "account_type": current.get('account_type', 'Standard')
        }).execute()
        return True
    except Exception as e:
        print(f"Update Balance Error: {e}")
        return False

def add_transaction(user_id: str, description: str, amount: float, category: str, ai_model: str = "None"):
    if not supabase:
        return False
    try:
        supabase.table("transactions").insert({
            "user_id": user_id,
            "description": description,
            "amount": amount,
            "category": category,
            "ai_model": ai_model
        }).execute()
        return True
    except Exception as e:
        print(f"Add Transaction Error: {e}")
        return False
