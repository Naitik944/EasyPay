import requests
from backend.config import config

def translate_text(text: str, target_lang: str):
    if not config.DEEPL_API_KEY:
        return text
    
    # DeepL Free API endpoint (keys ending in :fx use the free endpoint)
    url = "https://api-free.deepl.com/v2/translate"
    
    data = {
        "auth_key": config.DEEPL_API_KEY,
        "text": text,
        "target_lang": target_lang.upper() # DeepL expects ISO codes like 'EN', 'ES', 'HI'
    }
    
    try:
        response = requests.post(url, data=data)
        response.raise_for_status()
        result = response.json()
        return result["translations"][0]["text"]
    except Exception as e:
        print(f"DeepL Translation Error: {e}")
        return text
