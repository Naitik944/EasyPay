# 💸 EasyPay — A Smarter Way to Manage Digital Payments

**EasyPay is an AI-powered digital wallet prototype built with FastAPI, Supabase, Razorpay, and Ollama.**

The project combines wallet management, secure authentication, payment verification, real-time transaction updates, and a locally running AI assistant in one application.

Our goal is to explore how AI can make digital payments more accessible, intuitive, and convenient while keeping users in control of every transaction.

> 🚀 Built to explore the intersection of AI, fintech, and secure digital payments.

---

## 🌟 Why EasyPay?

Digital payment applications are convenient, but interacting with financial tools can still be complicated for some users.

EasyPay explores a different approach: combining a digital wallet with an AI assistant that can help users understand and prepare payment actions through natural language.

Instead of navigating every feature manually, users can interact with an assistant while retaining control over important financial actions.

The project also explores real-time wallet updates, server-side payment verification, and atomic transaction processing.

**EasyPay is currently a prototype intended for development, testing, and experimentation.**

---

## ✨ Features

### 🔐 Authentication and Security
- Email and password authentication using Supabase Auth.
- Backend verification of the signed-in Supabase user on wallet routes.
- Row Level Security (RLS) for database access control.
- Server-side verification of Razorpay payment signatures.
- Explicit user confirmation before AI-prepared payment actions.

### 💳 Digital Wallet
- Wallet balance management.
- Transaction history.
- Wallet credit and debit operations.
- Atomic wallet transaction processing.
- Transaction history that records the source of an operation.

### 💰 Payment Recharge
- Razorpay Checkout integration in test mode.
- Server-side payment signature verification.
- Verified recharge recording in the wallet ledger.
- Protection against recording the same verified recharge more than once.

### ⚡ Real-Time Updates
- Supabase Realtime integration.
- Automatic dashboard refreshes when relevant profile or transaction records change.
- A 45-second fallback refresh interval.

### 🤖 Local AI Assistant
- Powered by Ollama and `qwen3:8b`.
- Runs the language model locally rather than requiring a hosted LLM API.
- Helps prepare wallet and recharge commands.
- Keeps AI requests separate from initial dashboard loading.
- Requires visible confirmation before proceeding with a payment action.

### 🌐 Backend and Database
- FastAPI backend.
- Supabase authentication and PostgreSQL database.
- Environment-based configuration.
- Server-side handling of sensitive payment credentials.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Python | Core backend and application logic |
| FastAPI | Backend API |
| Supabase | Authentication, PostgreSQL database, and Realtime |
| PostgreSQL | Persistent application data |
| Razorpay | Test-mode payment checkout |
| Ollama | Local language model runtime |
| Qwen3:8B | AI assistant language model |
| HTML, CSS, JavaScript | Frontend interface |
| Git and GitHub | Version control and collaboration |

---

## 🏗️ How It Works

EasyPay connects the frontend, backend, database, payment gateway, and local AI assistant.

```text
                  ┌──────────────────────┐
                  │     EasyPay UI       │
                  │   HTML / CSS / JS    │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │     FastAPI API       │
                  │ Authentication checks │
                  │ Wallet operations     │
                  └─────┬──────────┬─────┘
                        │          │
             ┌──────────▼───┐  ┌───▼────────────┐
             │   Supabase   │  │    Razorpay    │
             │ Auth + DB    │  │  Test Checkout │
             │ + Realtime   │  │                │
             └──────────────┘  └────────────────┘

                  ┌──────────────────────┐
                  │   Local AI Assistant │
                  │   Ollama + Qwen3:8B  │
                  └──────────────────────┘
