"use client";

import { useEffect, useState } from "react";

type Mover = { symbol: string; change_pct: number };
type AlertItem = {
  id?: string;
  ticker: string;
  summary: string;
  impact_score: number;
  timestamp: string;
};

type ContextData = {
  gainers: Mover[];
  losers: Mover[];
  sentiment: { label: string; score: number };
  alerts: AlertItem[];
};

const FALLBACK: ContextData = {
  gainers: [
    { symbol: "TATA MOTORS", change_pct: 2.1 },
    { symbol: "ITC", change_pct: 1.8 },
    { symbol: "BHARTIARTL", change_pct: 1.5 },
    { symbol: "LT", change_pct: 1.2 },
  ],
  losers: [
    { symbol: "BAJAJ FINANCE", change_pct: -1.5 },
    { symbol: "HDFC BANK", change_pct: -0.9 },
    { symbol: "KOTAKBANK", change_pct: -0.7 },
    { symbol: "ASIANPAINT", change_pct: -0.5 },
  ],
  sentiment: { label: "Bullish", score: 72 },
  alerts: [
    {
      ticker: "INFY",
      summary: "Major deal announced",
      impact_score: 8,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      ticker: "RELIANCE",
      summary: "Quarterly earnings beat expectations",
      impact_score: 8,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      ticker: "TCS",
      summary: "Large client contract win",
      impact_score: 7,
      timestamp: new Date(Date.now() - 10800000).toISOString(),
    },
  ],
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card overflow-hidden">
      <div
        className="border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SentimentMeter({ label, score }: { label: string; score: number }) {
  const bullish = label.toLowerCase() === "bullish";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-bold ${bullish ? "text-green-400" : "text-red-400"}`}
        >
          {label}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">{score}% strength</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            bullish
              ? "bg-gradient-to-r from-green-600 to-cyan-400"
              : "bg-gradient-to-r from-red-600 to-orange-400"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>
    </div>
  );
}

export function MarketContextSidebar() {
  const [data, setData] = useState<ContextData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ctxRes, alertsRes] = await Promise.all([
          fetch("/api/market-context", { cache: "no-store" }),
          fetch("/api/alerts", { cache: "no-store" }),
        ]);

        let next = { ...FALLBACK };

        if (ctxRes.ok) {
          const ctx = await ctxRes.json();
          next = { ...next, ...ctx };
        }

        if (alertsRes.ok) {
          const { alerts } = await alertsRes.json();
          if (Array.isArray(alerts) && alerts.length > 0) {
            next.alerts = alerts;
          }
        }

        setData(next);
      } catch {
        /* fallback */
      } finally {
        setLoading(false);
      }
    }
    void load();
    // const id = setInterval(load, 30000);
    // const onAnalysis = () => void load();
    // window.addEventListener("stockedge-analysis-complete", onAnalysis);
    // return () => {
    //   clearInterval(id);
    //   window.removeEventListener("stockedge-analysis-complete", onAnalysis);
    // };
  }, []);

  if (loading) {
    return (
      <aside className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ))}
      </aside>
    );
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <Panel title="Top Gainers (NSE)">
        <ul className="space-y-2">
          {data.gainers.map((g) => (
            <li key={g.symbol} className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-primary)]">{g.symbol}</span>
              <span className="font-mono text-green-400">+{g.change_pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Top Losers (NSE)">
        <ul className="space-y-2">
          {data.losers.map((l) => (
            <li key={l.symbol} className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-primary)]">{l.symbol}</span>
              <span className="font-mono text-red-400">{l.change_pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Market Sentiment Index">
        <SentimentMeter label={data.sentiment.label} score={data.sentiment.score} />
      </Panel>

      <Panel title="Recent Alerts Feed">
        <ul className="space-y-3">
          {data.alerts.length === 0 ? (
            <li className="text-xs text-[var(--text-secondary)]">No alerts yet. Run an analysis.</li>
          ) : (
            data.alerts.map((a, i) => (
              <li
                key={a.id ?? i}
                className="border-b pb-3 text-xs last:border-0 last:pb-0"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="font-semibold text-[var(--text-primary)]">
                  ALERT: {a.ticker}{" "}
                  <span className="accent-text">(Impact: {a.impact_score})</span>
                </p>
                <p className="mt-0.5 text-[var(--text-secondary)]">— {a.summary}</p>
                <p className="mt-1 text-[10px] opacity-80 text-[var(--text-secondary)]">
                  {new Date(a.timestamp).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
      </Panel>
    </aside>
  );
}
