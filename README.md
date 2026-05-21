# STOCK EDGE — AI Financial Sentiment Agent

A professional, dark-themed financial analysis dashboard with automated research, Gemini-powered BUY/SELL signals, **n8n-powered Telegram alerts**, and simulated Indian & global market visualizations.

![Stack](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square)
![Gemini](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?style=flat-square)
![n8n](https://img.shields.io/badge/Alerts-n8n_Webhook-ff6d5a?style=flat-square)

## Overview

| Layer | Role |
|-------|------|
| **Frontend** | STOCK EDGE dashboard (Next.js) — analyze tickers, view markets, live ticker |
| **Backend** | FastAPI — Google News RSS, Gemini AI, Supabase, **n8n webhook** for notifications |
| **n8n** | Receives alert JSON → sends Telegram (bot token lives in n8n, not FastAPI) |
| **Supabase** | `tracked_assets`, `alerts_history` |

## UI features

- **Black theme (default)** — dark grey surfaces, electric blue accents, green/red indicators
- **Header:** STOCK EDGE logo (far left), dark/light toggle, center **Dashboard** & **Markets** dropdowns, circular **chatbot icon** only (far right)
- **Home:** AI agent form (ticker + Telegram Chat ID), BUY/SELL results, Gemini news bullets, disclaimer
- **Right sidebar:** Top Gainers, Top Losers, Market Sentiment meter, Recent Alerts feed
- **Floating chat:** Tap chatbot → *"Hello! Ask me any market question. How can I analyze a ticker today?"*
- **Markets:** `/markets/india` (NSE/BSE), `/markets/global` — heatmaps & trend charts
- **Bottom ticker:** NIFTY 50, SENSEX, RELIANCE, TCS, etc.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React, Tailwind CSS |
| Backend | Python **FastAPI** |
| Database | Supabase (PostgreSQL) |
| AI | Google Gemini (`gemini-1.5-flash`) |
| News | Google News RSS (feedparser) |
| Alerts | **n8n webhook** → Telegram Bot API (in n8n workflow) |

## Project structure

```
si project/
├── README.md
├── .env.example
├── supabase/
│   └── schema.sql
├── backend/
│   ├── main.py              # FastAPI + notify_via_n8n()
│   ├── requirements.txt
│   └── Procfile
└── frontend/
    ├── app/
    │   ├── page.tsx
    │   ├── markets/india/
    │   ├── markets/global/
    │   └── api/               # Proxies to FastAPI + fallbacks
    └── components/
        ├── stock-edge-header.tsx
        ├── analysis-agent.tsx
        ├── floating-chat-bot.tsx
        ├── market-context-sidebar.tsx
        ├── markets-dashboard.tsx
        └── india-live-ticker.tsx
```

## Quick start

### 1. Supabase

Run `supabase/schema.sql` in the Supabase SQL Editor.

Tables:

- `tracked_assets` — `id`, `ticker`, `created_at`
- `alerts_history` — `id`, `ticker`, `sentiment`, `impact_score`, `summary`, `timestamp`

### 2. Environment variables

**`backend/.env`**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-google-ai-studio-key

# n8n workflow webhook (Telegram is sent inside n8n)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/stock-edge-alerts

# Default chat id when /api/analyze omits telegram_chat_id (optional)
TELEGRAM_CHAT_ID=your-chat-or-channel-id

CORS_ORIGINS=http://localhost:3000
```

**`frontend/.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Note:** `TELEGRAM_BOT_TOKEN` is **not** used by FastAPI. Configure your Telegram bot credentials inside the **n8n** workflow.

### 3. n8n workflow (Telegram alerts)

1. Create a workflow with a **Webhook** trigger (POST).
2. Copy the production webhook URL → set as `N8N_WEBHOOK_URL` in `backend/.env`.
3. Add a **Telegram** node that reads fields from the webhook body:

| Field | Description |
|-------|-------------|
| `ticker` | Stock symbol |
| `signal` | `BUY` or `SELL` |
| `sentiment` | Bullish / Bearish / Neutral |
| `price_movement_pct` | Estimated % move |
| `summary` | AI summary text |
| `telegram_chat_id` | Recipient chat ID |

Example webhook payload from FastAPI:

```json
{
  "ticker": "RELIANCE",
  "signal": "BUY",
  "sentiment": "Bullish",
  "price_movement_pct": 3.5,
  "summary": "Two-sentence AI summary...",
  "telegram_chat_id": "123456789"
}
```

If the webhook fails or times out, FastAPI **still returns** the analysis to the frontend (`telegram_status: "n8n_failed"`).

### 4. Backend (FastAPI)

**PowerShell:**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Git Bash:**

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"ok"}`

### 5. Frontend (Next.js)

**PowerShell** (if `node` is not on PATH):

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## FastAPI endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/analyze` | Analyze ticker → BUY/SELL; saves alert if impact ≥ 7; optional n8n notify |
| POST | `/api/alerts` | Manually add alert to database (+ optional n8n) |
| GET | `/api/alerts` | List alert history (frontend proxy) |
| GET | `/api/markets/india` | Simulated NSE/BSE data |
| GET | `/api/markets/global` | Simulated global indices |
| GET | `/api/ticker/india` | Indian live ticker feed |
| GET | `/api/run-hourly-scan` | Scan tracked tickers, save alerts, notify via n8n |

### POST `/api/analyze`

**Request:**

```json
{
  "ticker": "RELIANCE",
  "telegram_chat_id": "123456789"
}
```

**Response:**

```json
{
  "success": true,
  "ticker": "RELIANCE",
  "signal": "BUY",
  "sentiment": "Bullish",
  "price_movement_pct": 3.5,
  "impact_score": 8,
  "summary": "Two-sentence AI summary...",
  "news_items": [
    { "title": "Quarterly Earnings Beat", "impact": 8 }
  ],
  "telegram_status": "sent",
  "alert_status": "saved",
  "tracked_status": "saved",
  "subscribe_alerts": true
}
```

**Status fields:**

| Field | Values |
|-------|--------|
| `alert_status` | `saved`, `failed`, `skipped_low_impact` |
| `tracked_status` | `saved`, `failed`, `skipped` |
| `telegram_status` | `sent`, `n8n_failed`, `skipped_no_chat_id`, `skipped_low_impact` |

**`telegram_status` values (legacy):**

| Value | Meaning |
|-------|---------|
| `sent` | n8n webhook accepted the alert |
| `n8n_failed` | Analysis succeeded; webhook failed (check logs) |
| `skipped` | No chat id or impact &lt; 7 |

## Frontend routes

| Route | Page |
|-------|------|
| `/` | AI Sentiment Agent dashboard |
| `/markets/india` | NSE/BSE (India Overview) |
| `/markets/global` | Major Global Indices |

## Automation

### Hourly scan (cron-job.org)

Schedule GET every hour:

```
https://your-api.onrender.com/api/run-hourly-scan
```

Uses `TELEGRAM_CHAT_ID` from env for n8n payload when no per-user id is available.

### n8n (recommended)

You can also trigger `/api/run-hourly-scan` from n8n on a schedule, or use n8n only for the Telegram leg after FastAPI posts to your webhook.

## Deployment

| Service | Platform | Root directory |
|---------|----------|----------------|
| Frontend | Vercel | `frontend` |
| Backend | Render | `backend` |
| n8n | n8n Cloud / self-hosted | — |

**Render env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `N8N_WEBHOOK_URL`, `TELEGRAM_CHAT_ID`, `CORS_ORIGINS`

**Vercel env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_API_URL`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm: command not found` | Install Node.js; add `C:\Program Files\nodejs` to PATH |
| `node` not found during `npm install` | Set PATH before running npm |
| Analysis works, no Telegram | Check `N8N_WEBHOOK_URL`, n8n workflow active, `telegram_chat_id` set |
| `telegram_status: n8n_failed` | Check FastAPI logs; test webhook URL in n8n |
| Alerts table empty / demo only | Configure `frontend/.env.local`; run `supabase/migration_add_update_policy.sql` if upsert fails |
| `alert_status: failed` | Check Supabase RLS policies and service role key |
| Alerts table 500 | Configure `frontend/.env.local` with Supabase keys |
| Backend unavailable from UI | Set `NEXT_PUBLIC_API_URL`; run uvicorn on port 8000 |

## Disclaimer

> This is an AI-generated prediction based on public news sentiment analysis. It is **NOT** financial advice. ALL trades involve risk. Financial decisions are solely your responsibility.

## License

MIT
