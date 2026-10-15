"""Runtime configuration for EasyPay.

Only public Supabase credentials are used in the browser. Keep Razorpay's
secret key (and any future server-only credentials) in `.env`, never in the
frontend.
"""

import os

from dotenv import load_dotenv


load_dotenv()


class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    # SUPABASE_KEY is retained as a backwards-compatible name for the anon key.
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY", "")
    DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
    # A 5.2 GB local model may need time to load into memory on its first request.
    OLLAMA_TIMEOUT_SECONDS = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "150"))
    OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "120"))
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

    @property
    def supabase_ready(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY)

    @property
    def razorpay_ready(self) -> bool:
        return bool(self.RAZORPAY_KEY_ID and self.RAZORPAY_KEY_SECRET)


config = Config()
