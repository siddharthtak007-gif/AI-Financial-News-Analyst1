import json
import logging
import os
import random
import re
import urllib.parse
from typing import Any, Literal

logger = logging.getLogger(__name__)

import feedparser
import google.generativeai as genai
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

app = FastAPI(title="AI Financial News Analyst API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_KEY",
        )
    return create_client(url, key)


def get_free_news(ticker: str) -> list[dict[str, str]]:
    """Top 5 recent headlines from Google News RSS for a ticker."""
    q = urllib.parse.quote_plus(f"{ticker} stock financial news")
    url = (
        "https://news.google.com/rss/search?"
        f"q={q}&hl=en-US&gl=US&ceid=US:en"
    )
    parsed = feedparser.parse(url)
    out: list[dict[str, str]] = []
    for entry in getattr(parsed, "entries", [])[:5]:
        title = getattr(entry, "title", "") or ""
        link = getattr(entry, "link", "") or ""
        published = getattr(entry, "published", "") or ""
        out.append({"title": title, "link": link, "published": published})
    return out


def _strip_json_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


def analyze_news_with_gemini(news_text: str) -> dict[str, Any]:
    """Use Gemini to return strict JSON: sentiment, impact_score, summary."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.35,
        },
    )

    prompt = f"""You are a financial news analyst. Read the headlines/snippets below and respond with ONLY valid JSON (no markdown) matching this shape:
{{
  "sentiment": "Bullish" | "Bearish" | "Neutral",
  "impact_score": <integer 1-10>,
  "summary": "<exactly two sentences, plain text>"
}}

Rules:
- sentiment must be exactly one of: Bullish, Bearish, Neutral.
- impact_score is an integer from 1 to 10 (10 = highest potential market impact).
- summary must be exactly two sentences.

INPUT:
{news_text}
"""

    result = model.generate_content(prompt)
    raw = getattr(result, "text", None) or ""
    if not raw.strip():
        raise HTTPException(status_code=502, detail="Empty response from Gemini")

    try:
        data = json.loads(_strip_json_fence(raw))
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini returned non-JSON output")

    sentiment = data.get("sentiment")
    impact = data.get("impact_score")
    summary = data.get("summary")

    if sentiment not in ("Bullish", "Bearish", "Neutral"):
        raise HTTPException(status_code=502, detail="Invalid sentiment from model")
    try:
        impact_int = int(impact)
    except (TypeError, ValueError):
        raise HTTPException(status_code=502, detail="Invalid impact_score from model")
    if impact_int < 1 or impact_int > 10:
        raise HTTPException(status_code=502, detail="impact_score out of range")

    if not isinstance(summary, str) or not summary.strip():
        raise HTTPException(status_code=502, detail="Invalid summary from model")

    return {
        "sentiment": sentiment,
        "impact_score": impact_int,
        "summary": summary.strip(),
    }


def _track_ticker(supabase: Client, ticker: str) -> tuple[bool, str | None]:
    try:
        supabase.table("tracked_assets").upsert(
            {"ticker": ticker}, on_conflict="ticker"
        ).execute()
        return True, None
    except Exception as exc:
        logger.error("Failed to track ticker %s: %s", ticker, exc)
        return False, str(exc)


def _save_alert(
    supabase: Client,
    ticker: str,
    sentiment: str,
    impact_score: int,
    summary: str,
) -> tuple[bool, str | None]:
    try:
        supabase.table("alerts_history").insert(
            {
                "ticker": ticker,
                "sentiment": sentiment,
                "impact_score": impact_score,
                "summary": summary,
            }
        ).execute()
        return True, None
    except Exception as exc:
        logger.error("Failed to save alert for %s: %s", ticker, exc)
        return False, str(exc)


def notify_via_n8n(payload: dict[str, Any]) -> bool:
    """POST analysis alert to n8n webhook (Telegram delivery handled in n8n)."""
    webhook_url = os.environ.get("N8N_WEBHOOK_URL", "").strip()
    if not webhook_url:
        logger.warning("N8N_WEBHOOK_URL not set; skipping notification")
        return False

    try:
        resp = requests.post(webhook_url, json=payload, timeout=30)
        if resp.status_code >= 400:
            logger.error(
                "n8n webhook failed: status=%s body=%s",
                resp.status_code,
                resp.text[:500],
            )
            return False
        return True
    except requests.RequestException as exc:
        logger.error("n8n webhook request error: %s", exc)
        return False


class AnalyzeRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=32)
    telegram_chat_id: str | None = Field(default=None, max_length=64)
    subscribe_alerts: bool = Field(
        default=True,
        description="When true and chat_id is set, send n8n notification if impact >= 7",
    )


class AlertCreateRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=32)
    sentiment: Literal["Bullish", "Bearish", "Neutral"]
    impact_score: int = Field(..., ge=1, le=10)
    summary: str = Field(..., min_length=1, max_length=2000)
    telegram_chat_id: str | None = Field(default=None, max_length=64)
    send_notification: bool = Field(default=False)


def analyze_stock_full(ticker: str) -> dict[str, Any]:
    """Extended Gemini analysis for STOCK EDGE dashboard."""
    news = get_free_news(ticker)
    if not news:
        raise HTTPException(status_code=404, detail=f"No news found for {ticker}")

    blob = "\n".join(f"- {n['title']} ({n.get('published', '')})" for n in news)
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        sentiment = random.choice(["Bullish", "Bearish"])
        signal = "BUY" if sentiment == "Bullish" else "SELL"
        movement = round(random.uniform(1.2, 5.5), 1) * (1 if signal == "BUY" else -1)
        return {
            "ticker": ticker.upper(),
            "signal": signal,
            "sentiment": sentiment,
            "price_movement_pct": movement,
            "impact_score": random.randint(6, 9),
            "summary": (
                f"Simulated analysis for {ticker.upper()}: sentiment appears {sentiment.lower()} "
                "based on recent headline tone. Configure GEMINI_API_KEY for live AI output."
            ),
            "news_items": [
                {"title": n["title"], "impact": random.randint(5, 9)} for n in news[:4]
            ],
            "demo": True,
        }

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.35,
        },
    )

    prompt = f"""You are a financial news analyst. Analyze these headlines for ticker {ticker}.
Respond with ONLY valid JSON:
{{
  "sentiment": "Bullish" | "Bearish" | "Neutral",
  "signal": "BUY" | "SELL",
  "price_movement_pct": <float, e.g. 3.5 or -2.1>,
  "impact_score": <integer 1-10>,
  "summary": "<two sentences>",
  "news_items": [
    {{"title": "<headline>", "impact": <integer 1-10>}}
  ]
}}

Rules:
- signal: BUY if Bullish, SELL if Bearish, BUY or SELL if Neutral (pick stronger lean).
- price_movement_pct: estimated % move, positive for BUY bias, negative for SELL.
- news_items: 3-5 items from the headlines with impact scores.

HEADLINES:
{blob}
"""

    result = model.generate_content(prompt)
    raw = getattr(result, "text", None) or ""
    try:
        data = json.loads(_strip_json_fence(raw))
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini returned non-JSON output")

    sentiment = data.get("sentiment", "Neutral")
    signal = data.get("signal", "BUY" if sentiment == "Bullish" else "SELL")
    if signal not in ("BUY", "SELL"):
        signal = "BUY" if sentiment != "Bearish" else "SELL"

    try:
        movement = float(data.get("price_movement_pct", 0))
    except (TypeError, ValueError):
        movement = 2.5 if signal == "BUY" else -2.5

    news_items = data.get("news_items") or [
        {"title": n["title"], "impact": 7} for n in news[:4]
    ]

    return {
        "ticker": ticker.upper(),
        "signal": signal,
        "sentiment": sentiment,
        "price_movement_pct": round(movement, 1),
        "impact_score": int(data.get("impact_score", 7)),
        "summary": str(data.get("summary", "")).strip(),
        "news_items": news_items[:6],
        "demo": False,
    }


def _sim_market_rows(symbols: list[tuple[str, float, float]]) -> list[dict[str, Any]]:
    rows = []
    for sym, base, vol in symbols:
        chg = round(random.uniform(-vol, vol), 2)
        price = round(base * (1 + chg / 100), 2)
        rows.append(
            {
                "symbol": sym,
                "price": price,
                "change_pct": chg,
                "volume": random.randint(1_000_000, 50_000_000),
            }
        )
    return rows


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze")
def analyze_stock(req: AnalyzeRequest) -> dict[str, Any]:
    ticker = req.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Invalid ticker")

    result = analyze_stock_full(ticker)

    tracked_status = "skipped"
    alert_status = "skipped"
    track_error: str | None = None
    alert_error: str | None = None

    try:
        supabase = _supabase()
        track_ok, track_error = _track_ticker(supabase, ticker)
        tracked_status = "saved" if track_ok else "failed"

        if result["impact_score"] >= 7:
            alert_ok, alert_error = _save_alert(
                supabase,
                ticker,
                result["sentiment"],
                result["impact_score"],
                result["summary"],
            )
            alert_status = "saved" if alert_ok else "failed"
        else:
            alert_status = "skipped_low_impact"
    except HTTPException as exc:
        tracked_status = "failed"
        alert_status = "failed"
        track_error = str(exc.detail)
        logger.warning("Supabase unavailable during analyze: %s", exc.detail)

    chat_id = (req.telegram_chat_id or os.environ.get("TELEGRAM_CHAT_ID", "")).strip()
    telegram_status = "skipped"
    should_notify = (
        req.subscribe_alerts
        and bool(chat_id)
        and result["impact_score"] >= 7
    )
    if should_notify:
        sent = notify_via_n8n(
            {
                "ticker": ticker,
                "signal": result["signal"],
                "sentiment": result["sentiment"],
                "price_movement_pct": result["price_movement_pct"],
                "summary": result["summary"],
                "telegram_chat_id": chat_id,
            }
        )
        telegram_status = "sent" if sent else "n8n_failed"
    elif req.subscribe_alerts and chat_id and result["impact_score"] < 7:
        telegram_status = "skipped_low_impact"
    elif req.subscribe_alerts and not chat_id:
        telegram_status = "skipped_no_chat_id"

    return {
        "success": True,
        **result,
        "tracked_status": tracked_status,
        "alert_status": alert_status,
        "telegram_status": telegram_status,
        "errors": {
            k: v
            for k, v in {
                "track": track_error,
                "alert": alert_error,
            }.items()
            if v
        },
    }


@app.post("/api/alerts")
def create_alert(req: AlertCreateRequest) -> dict[str, Any]:
    """Manually add an alert to alerts_history and optionally notify via n8n."""
    ticker = req.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Invalid ticker")

    alert_status = "skipped"
    alert_error: str | None = None
    tracked_status = "skipped"

    try:
        supabase = _supabase()
        track_ok, track_err = _track_ticker(supabase, ticker)
        tracked_status = "saved" if track_ok else "failed"
        if track_err:
            alert_error = track_err

        alert_ok, save_err = _save_alert(
            supabase,
            ticker,
            req.sentiment,
            req.impact_score,
            req.summary.strip(),
        )
        alert_status = "saved" if alert_ok else "failed"
        if save_err:
            alert_error = save_err
    except HTTPException as exc:
        raise exc
    except Exception as exc:
        logger.error("create_alert failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    telegram_status = "skipped"
    chat_id = (req.telegram_chat_id or os.environ.get("TELEGRAM_CHAT_ID", "")).strip()
    if req.send_notification and chat_id:
        signal = (
            "BUY"
            if req.sentiment == "Bullish"
            else "SELL"
            if req.sentiment == "Bearish"
            else "BUY"
        )
        movement = round((req.impact_score - 5) * 0.8, 1)
        sent = notify_via_n8n(
            {
                "ticker": ticker,
                "signal": signal,
                "sentiment": req.sentiment,
                "price_movement_pct": movement,
                "summary": req.summary.strip(),
                "telegram_chat_id": chat_id,
            }
        )
        telegram_status = "sent" if sent else "n8n_failed"
    elif req.send_notification and not chat_id:
        telegram_status = "skipped_no_chat_id"

    return {
        "success": alert_status == "saved",
        "ticker": ticker,
        "alert_status": alert_status,
        "tracked_status": tracked_status,
        "telegram_status": telegram_status,
        "error": alert_error,
    }


@app.get("/api/markets/{region}")
def markets_dashboard(region: Literal["india", "global"]) -> dict[str, Any]:
    if region == "india":
        indices = _sim_market_rows(
            [
                ("NIFTY 50", 22405, 1.2),
                ("SENSEX", 73800, 1.0),
                ("BANK NIFTY", 47850, 1.5),
                ("NIFTY IT", 35200, 1.8),
            ]
        )
        stocks = _sim_market_rows(
            [
                ("RELIANCE", 2950, 1.4),
                ("TCS", 3850, 0.9),
                ("HDFCBANK", 1680, 1.1),
                ("INFY", 1520, 1.0),
                ("ICICIBANK", 1120, 1.3),
                ("SBIN", 780, 1.6),
            ]
        )
        return {"region": "india", "title": "NSE/BSE (India Overview)", "indices": indices, "stocks": stocks}

    indices = _sim_market_rows(
        [
            ("S&P 500", 5280, 0.8),
            ("NASDAQ", 16850, 1.1),
            ("DOW", 39200, 0.7),
            ("FTSE 100", 8120, 0.6),
            ("DAX", 18200, 0.9),
            ("NIKKEI", 39800, 1.0),
        ]
    )
    stocks = _sim_market_rows(
        [
            ("AAPL", 189.5, 1.0),
            ("MSFT", 412.0, 0.8),
            ("NVDA", 118.7, 2.0),
            ("GOOGL", 168.9, 0.9),
            ("AMZN", 178.5, 1.1),
            ("TSLA", 241.3, 1.8),
        ]
    )
    return {
        "region": "global",
        "title": "Major Global Indices",
        "indices": indices,
        "stocks": stocks,
    }


@app.get("/api/ticker/india")
def india_live_ticker() -> dict[str, Any]:
    items = _sim_market_rows(
        [
            ("NIFTY 50", 22405, 0.9),
            ("SENSEX", 73800, 0.95),
            ("RELIANCE", 2950, 1.2),
            ("TCS", 3850, 0.8),
            ("HDFCBANK", 1680, 1.0),
            ("INFY", 1520, 0.7),
            ("ICICIBANK", 1120, 1.1),
            ("SBIN", 780, 1.4),
            ("BHARTIARTL", 1180, 0.9),
            ("ITC", 445, 0.6),
        ]
    )
    return {"items": items}


@app.get("/api/run-hourly-scan")
def run_hourly_scan() -> dict[str, Any]:
    """
    Fetch tracked tickers, pull news, analyze with Gemini.
    If impact_score >= 7, persist alert and notify via n8n webhook.
    """
    supabase = _supabase()

    tickers_rows = supabase.table("tracked_assets").select("ticker").execute()
    rows = tickers_rows.data or []
    tickers = [r["ticker"] for r in rows if r.get("ticker")]

    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")

    processed: list[dict[str, Any]] = []

    for ticker in tickers:
        news = get_free_news(ticker)
        if not news:
            processed.append({"ticker": ticker, "status": "no_news"})
            continue

        blob = "\n".join(
            f"- {n['title']} ({n.get('published', '')})" for n in news
        )
        analysis = analyze_news_with_gemini(blob)

        item = {
            "ticker": ticker,
            "sentiment": analysis["sentiment"],
            "impact_score": analysis["impact_score"],
            "headlines_count": len(news),
        }

        if analysis["impact_score"] >= 7:
            alert_ok, alert_err = _save_alert(
                supabase,
                ticker,
                analysis["sentiment"],
                analysis["impact_score"],
                analysis["summary"],
            )
            if not alert_ok:
                item["alert_error"] = alert_err
                item["status"] = "alert_save_failed"
            else:
                item["status"] = "alert_saved"

            if chat_id and alert_ok:
                sentiment = analysis["sentiment"]
                signal = (
                    "BUY"
                    if sentiment == "Bullish"
                    else "SELL"
                    if sentiment == "Bearish"
                    else "BUY"
                )
                sent = notify_via_n8n(
                    {
                        "ticker": ticker,
                        "signal": signal,
                        "sentiment": sentiment,
                        "price_movement_pct": round(
                            (analysis["impact_score"] - 5) * 0.8, 1
                        ),
                        "summary": analysis["summary"],
                        "telegram_chat_id": chat_id,
                    }
                )
                item["telegram"] = "sent" if sent else "n8n_failed"
            elif not chat_id:
                item["telegram"] = "skipped_missing_chat_id"
            else:
                item["telegram"] = "skipped_alert_failed"
        else:
            item["status"] = "below_threshold"

        processed.append(item)

    return {
        "success": True,
        "scanned": len(tickers),
        "results": processed,
    }
