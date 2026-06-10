import json
import logging
import os
import random
import re
import urllib.parse
from datetime import datetime
from typing import Any, Literal
import time

import feedparser
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pydantic import BaseModel, Field
from supabase import Client, create_client

# =========================================================
# LOAD ENV
# ========================================================

load_dotenv(override=True)

# =========================================================
# LOGGER
# =========================================================

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="AI Financial News Analyst API",
    version="2.0.0",
)

# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# SUPABASE
# =========================================================


def get_supabase() -> Client:

    url = os.getenv("SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_KEY")
    )

    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Missing Supabase credentials",
        )

    return create_client(url, key)


# =========================================================
# MODELS
# =========================================================


class AnalyzeRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    telegram_chat_id: str | None = None
    subscribe_alerts: bool = True


class AlertRequest(BaseModel):
    ticker: str
    sentiment: Literal["Bullish", "Bearish", "Neutral"]
    impact_score: int = Field(..., ge=1, le=10)
    summary: str
    telegram_chat_id: str | None = None
    send_notification: bool = False


# =========================================================
# HELPERS
# =========================================================


def clean_json(text: str) -> str:

    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text)
        text = re.sub(r"```$", "", text)

    return text.strip()


# =========================================================
# NEWS FETCH
# =========================================================


def get_news(ticker: str):

    query = urllib.parse.quote_plus(
        f"{ticker} stock market news"
    )

    url = (
        "https://news.google.com/rss/search?"
        f"q={query}&hl=en-US&gl=US&ceid=US:en"
    )

    parsed = feedparser.parse(url)

    news = []

    for entry in getattr(parsed, "entries", [])[:5]:

        news.append(
            {
                "title": getattr(entry, "title", ""),
                "link": getattr(entry, "link", ""),
                "published": getattr(entry, "published", ""),
            }
        )

    return news


# =========================================================
# GEMINI ANALYSIS
# =========================================================


def analyze_with_gemini(
    news_text: str,
    ticker: str,
) -> dict[str, Any]:

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing GEMINI_API_KEY",
        )

    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-1.5-flash-latest')

    prompt = f"""
You are a professional stock market AI analyst.

Analyze the stock news for ticker: {ticker}

Return ONLY valid JSON in this format:

{{
  "sentiment": "Bullish",
  "signal": "BUY",
  "impact_score": 8,
  "price_movement_pct": 3.5,
  "summary": "Two sentence summary only.",
  "risk_level": "Medium",
  "confidence": 87
}}

RULES:
- sentiment: Bullish / Bearish / Neutral
- signal: BUY / SELL
- impact_score: 1-10
- confidence: 1-100
- summary must contain exactly 2 sentences

NEWS:
{news_text}
"""

    try:

        response = model.generate_content(
            contents=prompt,
        )

        raw = response.text

        data = json.loads(
            clean_json(raw)
        )

        return {
            "sentiment": data.get(
                "sentiment",
                "Neutral",
            ),
            "signal": data.get(
                "signal",
                "BUY",
            ),
            "impact_score": int(
                data.get(
                    "impact_score",
                    5,
                )
            ),
            "price_movement_pct": float(
                data.get(
                    "price_movement_pct",
                    0,
                )
            ),
            "summary": data.get(
                "summary",
                "",
            ),
            "risk_level": data.get(
                "risk_level",
                "Medium",
            ),
            "confidence": int(
                data.get(
                    "confidence",
                    70,
                )
            ),
        }

    except Exception as e:

        logger.error(
            "Gemini Error: %s",
            e,
        )

        return {
            "sentiment": "Neutral",
            "signal": "BUY",
            "impact_score": 5,
            "price_movement_pct": 1.2,
            "summary": "AI analysis failed. Fallback response generated.",
            "risk_level": "Medium",
            "confidence": 50,
        }


# =========================================================
# DATABASE
# =========================================================


def save_tracked_ticker(
    supabase: Client,
    ticker: str,
):

    supabase.table(
        "tracked_assets"
    ).upsert(
        {
            "ticker": ticker,
        },
        on_conflict="ticker",
    ).execute()


def save_alert(
    supabase: Client,
    ticker: str,
    sentiment: str,
    impact_score: int,
    summary: str,
):

    supabase.table(
        "alerts_history"
    ).insert(
        {
            "ticker": ticker,
            "sentiment": sentiment,
            "impact_score": impact_score,
            "summary": summary,
            "created_at": datetime.utcnow().isoformat(),
        }
    ).execute()


# =========================================================
# TELEGRAM / N8N
# =========================================================


def send_n8n_notification(
    payload: dict[str, Any],
) -> bool:

    webhook = os.getenv(
        "N8N_WEBHOOK_URL",
        "",
    ).strip()

    if not webhook:
        logger.warning(
            "Missing N8N_WEBHOOK_URL"
        )
        return False

    try:

        response = requests.post(
            webhook,
            json=payload,
            timeout=30,
        )

        return response.status_code < 400

    except Exception as e:

        logger.error(
            "n8n Error: %s",
            e,
        )

        return False


# =========================================================
# MARKET SIMULATOR
# =========================================================


def market_rows(
    items: list[tuple[str, float, float]]
):

    rows = []

    for symbol, base_price, volatility in items:

        change = round(
            random.uniform(
                -volatility,
                volatility,
            ),
            2,
        )

        current_price = round(
            base_price * (1 + change / 100),
            2,
        )

        rows.append(
            {
                "symbol": symbol,
                "price": current_price,
                "change_pct": change,
                "volume": random.randint(
                    1000000,
                    50000000,
                ),
            }
        )

    return rows


# =========================================================
# ROOT
# =========================================================


@app.get("/")
def root():

    return {
        "message": "AI Financial News Analyst API Running",
        "version": "2.0.0",
    }


# =========================================================
# HEALTH
# =========================================================


@app.get("/health")
def health():

    return {
        "status": "ok",
    }


# =========================================================
# ANALYZE STOCK
# =========================================================


@app.post("/api/analyze")
def analyze_stock(
    req: AnalyzeRequest,
):

    ticker = req.ticker.upper().strip()

    if not ticker:
        raise HTTPException(
            status_code=400,
            detail="Invalid ticker",
        )

    news = get_news(ticker)

    if not news:
        raise HTTPException(
            status_code=404,
            detail="No news found",
        )

    news_blob = "\n".join(
        [
            f"- {item['title']}"
            for item in news
        ]
    )

    analysis = analyze_with_gemini(
        news_blob,
        ticker,
    )

    # SAVE DATABASE
    try:

        supabase = get_supabase()

        save_tracked_ticker(
            supabase,
            ticker,
        )

        save_alert(
                supabase,
                ticker,
                analysis["sentiment"],
                analysis["impact_score"],
                analysis["summary"],
            )

    except Exception as e:

        logger.error(
            "Database Error: %s",
            e,
        )

    # TELEGRAM ALERT
    telegram_status = ""

    chat_id = (
        req.telegram_chat_id
        or os.getenv(
             "TELEGRAM_CHAT_ID",
            "",
    )
    ).strip()

    # SEND ALL SIGNALS (NO IMPACT SCORE FILTER)
    if req.subscribe_alerts and chat_id:

        sent = send_n8n_notification(
        {
            "ticker": ticker,
            "signal": analysis["signal"],
            "sentiment": analysis["sentiment"],
            "impact_score": analysis["impact_score"],
            "summary": analysis["summary"],
            "telegram_chat_id": chat_id,
        }
    )

    telegram_status = (
            "sent"
             if sent
             else "failed"
    )

    return {
        "success": True,
        "ticker": ticker,
        **analysis,
        "news": news,
        "telegram_status": telegram_status,
    }


# =========================================================
# CREATE ALERT
# =========================================================


@app.post("/api/alerts")
def create_alert(
    req: AlertRequest,
):

    ticker = req.ticker.upper().strip()

    try:

        supabase = get_supabase()

        save_alert(
            supabase,
            ticker,
            req.sentiment,
            req.impact_score,
            req.summary,
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    telegram_status = "skipped"

    if req.send_notification:

        chat_id = (
            req.telegram_chat_id
            or os.getenv(
                "TELEGRAM_CHAT_ID",
                "",
            )
        ).strip()

        if chat_id:

            signal = (
                "BUY"
                if req.sentiment == "Bullish"
                else "SELL"
            )

            sent = send_n8n_notification(
                {
                    "ticker": ticker,
                    "signal": signal,
                    "sentiment": req.sentiment,
                    "impact_score": req.impact_score,
                    "summary": req.summary,
                    "telegram_chat_id": chat_id,
                }
            )

            telegram_status = (
                "sent"
                if sent
                else "failed"
            )

    return {
        "success": True,
        "telegram_status": telegram_status,
    }


# =========================================================
# MARKETS API
# =========================================================


@app.get("/api/markets/{region}")
def markets(
    region: Literal[
        "india",
        "global",
    ]
):

    if region == "india":

        indices = market_rows(
            [
                ("NIFTY 50", 22400, 1.2),
                ("SENSEX", 73800, 1.0),
                ("BANK NIFTY", 47800, 1.5),
            ]
        )

        stocks = market_rows(
            [
                ("RELIANCE", 2950, 1.3),
                ("TCS", 3850, 1.0),
                ("INFY", 1520, 1.1),
                ("SBIN", 780, 1.4),
            ]
        )

        return {
            "region": "india",
            "indices": indices,
            "stocks": stocks,
        }

    indices = market_rows(
        [
            ("S&P 500", 5280, 0.8),
            ("NASDAQ", 16850, 1.0),
            ("DOW JONES", 39200, 0.7),
        ]
    )

    stocks = market_rows(
        [
            ("AAPL", 189, 1.1),
            ("MSFT", 412, 0.9),
            ("NVDA", 118, 2.0),
        ]
    )

    return {
        "region": "global",
        "indices": indices,
        "stocks": stocks,
    }


# =========================================================
# INDIA LIVE TICKER
# =========================================================


@app.get("/api/ticker/india")
def india_ticker():

    items = market_rows(
        [
            ("NIFTY 50", 22400, 0.9),
            ("SENSEX", 73800, 0.8),
            ("RELIANCE", 2950, 1.0),
            ("TCS", 3850, 0.7),
            ("INFY", 1520, 0.9),
            ("SBIN", 780, 1.2),
        ]
    )

    return {
        "items": items,
    }


# =========================================================
# RUN HOURLY SCAN
# =========================================================


@app.get("/api/run-hourly-scan")
def run_hourly_scan():

    supabase = get_supabase()

    rows = (
        supabase.table(
            "tracked_assets"
        )
        .select("ticker")
        .execute()
    )

    tickers = [
        row["ticker"]
        for row in rows.data
    ]

    results = []

    for ticker in tickers:

        try:
     
            time.sleep(6)

            news = get_news(ticker)

            if not news:
                continue

            news_blob = "\n".join(
                [
                    item["title"]
                    for item in news
                ]
            )

            analysis = analyze_with_gemini(
                news_blob,
                ticker,
            )

            save_alert(
                    supabase,
                    ticker,
                    analysis["sentiment"],
                    analysis["impact_score"],
                    analysis["summary"],
                )

            chat_id = os.getenv(
                "TELEGRAM_CHAT_ID",
                "",
            ).strip()

# SEND ALL SIGNALS (NO IMPACT SCORE FILTER)
            if chat_id:

                 send_n8n_notification(
                     {
                    "ticker": ticker,
                    "signal": analysis["signal"],
                    "sentiment": analysis["sentiment"],
                    "impact_score": analysis["impact_score"],
                    "summary": analysis["summary"],
                    "telegram_chat_id": chat_id,
        }
    )

            results.append(
                {
                    "ticker": ticker,
                    "status": "processed",
                    "impact_score": analysis[
                        "impact_score"
                    ],
                }
            )

        except Exception as e:

            logger.error(
                "Hourly Scan Error: %s",
                e,
            )

            results.append(
                {
                    "ticker": ticker,
                    "status": "failed",
                }
            )

    return {
        "success": True,
        "results": results,
    }


# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )