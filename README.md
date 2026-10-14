# EasyPay 💳

EasyPay is a smart financial portal that combines account management with an AI-powered financial advisor.

## 🛠️ Tech Stack
- **Backend**: Python FastAPI
- **Database**: Supabase (PostgreSQL)
- **AI Engine**: Ollama (Model: `qwen3:8b`)
- **Translation**: Google Cloud Translation API
- **Frontend**: Modern HTML, CSS (Inter Font), JavaScript

## 🚀 Quick Start

### 1. Prerequisites
- Install [Ollama](https://ollama.ai/)
- Pull the model: `ollama pull qwen3:8b`
- A Supabase account and project.
- A Google Cloud project with the Translation API enabled.

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your actual API keys
```

Run the server:
```bash
python main.py
```

### 3. Frontend Setup
Simply open `frontend/index.html` in any modern web browser.

## 📁 Project Structure
- `backend/`: FastAPI application logic, Supabase integration, and AI services.
- `frontend/`: Professional fintech dashboard files.

## 🔐 API Key Handling
All keys are managed via `.env` files. Ensure this file is never committed to version control.
