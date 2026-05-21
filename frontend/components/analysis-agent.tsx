"use client";

import { FormEvent, useState } from "react";
import { parseApiError } from "@/lib/api-error";

type NewsItem = { title: string; impact: number };

type AnalysisResult = {
  ticker: string;
  signal: "BUY" | "SELL";
  sentiment: string;
  price_movement_pct: number;
  impact_score: number;
  summary: string;
  news_items: NewsItem[];
  demo?: boolean;
  telegram_status?: string;
  alert_status?: string;
  tracked_status?: string;
  errors?: { track?: string; alert?: string };
};

const DISCLAIMER =
  "DISCLAIMER: This is an AI-generated prediction based on public news sentiment analysis. It is NOT financial advice. ALL trades involve risk. Financial decisions are solely your responsibility.";

function StatusBadge({ label, status }: { label: string; status?: string }) {
  if (!status) return null;
  const ok = status === "saved" || status === "sent";
  const warn = status.includes("skipped");
  const color = ok
    ? "text-green-400 border-green-500/40 bg-green-500/10"
    : warn
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : "text-red-400 border-red-500/40 bg-red-500/10";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase ${color}`}>
      {label}: {status.replaceAll("_", " ")}
    </span>
  );
}

export function AnalysisAgent() {
  const [ticker, setTicker] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [subscribeAlerts, setSubscribeAlerts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.trim(),
          telegram_chat_id: telegramId.trim() || undefined,
          subscribe_alerts: subscribeAlerts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(parseApiError(data, "Analysis failed"));
      setResult(data);
      window.dispatchEvent(new CustomEvent("stockedge-analysis-complete"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isBuy = result?.signal === "BUY";
  const movement = result?.price_movement_pct ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
          AI Financial Sentiment Agent: Automated Research &amp; Alerts
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Powered by Google Gemini · FastAPI · Google News RSS · n8n Telegram alerts
        </p>
      </div>

      <form onSubmit={onSubmit} className="surface-card space-y-4 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ticker"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]"
            >
              Enter Stock Ticker (e.g., RELIANCE)
            </label>
            <input
              id="ticker"
              className="input-field"
              placeholder="RELIANCE"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="telegram"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]"
            >
              Enter Telegram Chat ID
            </label>
            <input
              id="telegram"
              className="input-field"
              placeholder="123456789"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={subscribeAlerts}
            onChange={(e) => setSubscribeAlerts(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-gray-600 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium text-[var(--text-primary)]">Enable Telegram alerts</span>
            {" "}(via n8n when impact score ≥ 7)
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !ticker.trim()}
          className="btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze Stock & Subscribe for Alerts"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>

      {result ? (
        <div className="surface-card space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Analysis Results</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Alert" status={result.alert_status} />
              <StatusBadge label="Tracked" status={result.tracked_status} />
              <StatusBadge label="Notify" status={result.telegram_status} />
            </div>
          </div>

          {result.errors && (result.errors.track || result.errors.alert) ? (
            <div
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300"
            >
              {result.errors.track ? <p>Track error: {result.errors.track}</p> : null}
              {result.errors.alert ? <p>Alert error: {result.errors.alert}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
              className={`inline-flex min-w-[120px] items-center justify-center rounded-lg px-8 py-4 text-2xl font-black tracking-wider ${
                isBuy ? "signal-buy" : "signal-sell"
              }`}
            >
              {result.signal}
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Estimated Price Movement</p>
              <p
                className={`text-2xl font-bold ${movement >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {movement >= 0 ? "+" : ""}
                {movement}%
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {result.ticker} · {result.sentiment} · Impact {result.impact_score}/10
                {result.demo ? " · Demo mode" : ""}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              AI Summary of Recent News Sentiment (from Gemini):
            </h3>
            <ul className="space-y-2">
              {result.news_items?.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-[var(--text-secondary)] before:content-['•']"
                >
                  <span>
                    {item.title}{" "}
                    <span className="accent-text font-medium">(Impact: {item.impact})</span>
                  </span>
                </li>
              ))}
            </ul>
            {result.summary ? (
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                {result.summary}
              </p>
            ) : null}
          </div>

          {result.impact_score >= 7 && result.alert_status === "saved" ? (
            <p className="text-xs text-green-400">
              High-impact alert saved to database and listed in Recent Alerts Feed →
            </p>
          ) : result.impact_score < 7 ? (
            <p className="text-xs text-amber-400">
              Impact below 7 — alert not stored; enable alerts will trigger only for high-impact signals.
            </p>
          ) : null}

          <p
            className="border-t pt-4 text-[11px] leading-relaxed text-[var(--text-secondary)]"
            style={{ borderColor: "var(--border)" }}
          >
            {DISCLAIMER}
          </p>
        </div>
      ) : null}
    </div>
  );
}
