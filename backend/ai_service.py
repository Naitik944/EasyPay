import requests
from backend.config import config

def ask_easypay_ai(prompt: str, transaction_history: list):
    # Context for the AI to act as a financial advisor
    history_str = "\n".join([f"{t['date']}: {t['description']} | {t['amount']} | {t['category']}" for t in transaction_history])
    system_prompt = (
        "You are the EasyPay AI Financial Assistant. Your goal is to help users track their spending and give smart financial advice. "
        "Be concise, professional, and helpful. Use the following recent transaction history to answer queries:\n\n"
        f"{history_str}"
    )
    
    payload = {
        "model": config.OLLAMA_MODEL,
        "prompt": f"{system_prompt}\n\nUser: {prompt}",
        "stream": False
    }
    
    try:
        response = requests.post(f"{config.OLLAMA_BASE_URL}/api/generate", json=payload)
        response.raise_for_status()
        return response.json().get("response", "I'm sorry, I couldn't analyze your finances right now.")
    except Exception as e:
        return f"AI Error: {str(e)}"
