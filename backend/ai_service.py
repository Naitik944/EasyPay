"""Ollama integration for EasyPay AI."""

from __future__ import annotations

import requests
from backend.config import config

def ask_easypay_ai(prompt: str, transaction_history: list[dict]) -> str:
    """
    Interfaces with the local Ollama server to provide financial insights.
    """
    history = "\n".join(
        f"{item.get('created_at', 'recent')}: {item.get('description', 'Transaction')} | "
        f"₹{item.get('amount', 0)} | {item.get('category', 'General')}"
        for item in transaction_history[:12]
    ) or "No transactions yet."
    
    system_prompt = (
        "You are EasyPay's helpful financial assistant. Give concise, practical, "
        "non-judgmental guidance in at most 120 words. Do not claim that a payment "
        "or refund occurred. Use Indian rupees. If the user requests a language, "
        "answer completely in that language. Recent wallet activity follows:\n"
        f"{history}\n\nUser request: {prompt}"
    )
    
    try:
        # qwen3:8b is a local 5 GB model: the first request can take over 30 seconds
        # while it loads into RAM. Keep it warm and allow enough time for that startup.
        response = requests.post(
            f"{config.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": config.OLLAMA_MODEL,
                "prompt": system_prompt,
                "stream": False,
                "think": False,
                "keep_alive": "15m",
                "options": {
                    "temperature": 0.35,
                    "num_predict": config.OLLAMA_NUM_PREDICT,
                },
            },
            timeout=(10, config.OLLAMA_TIMEOUT_SECONDS),
        )
        response.raise_for_status()
        answer = response.json().get("response", "").strip()
        return answer or "I could not generate an answer just now. Please try again."
    except requests.exceptions.Timeout:
        return (
            "Qwen3:8B is still loading or generating locally. Please wait a moment "
            "and ask again; your wallet and payments are unaffected."
        )
    except requests.exceptions.ConnectionError:
        return "AI Service Error: I cannot connect to the Ollama server. Please make sure Ollama is running on your computer."
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return f"AI Service Error: The model {config.OLLAMA_MODEL} was not found. Please run 'ollama pull {config.OLLAMA_MODEL}' in your terminal."
        return "The local AI encountered an error. Your wallet and payments still work normally."
    except requests.RequestException:
        return "The local AI service could not complete that request. Please try again shortly."
