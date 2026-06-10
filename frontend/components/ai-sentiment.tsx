"use client";

import { useEffect, useMemo, useState } from "react";

type SentimentRow = {
  symbol: string;
  sentiment: "Bullish" | "Bearish";
  confidence: number;
};

const DEMO: SentimentRow[] = [
  { symbol: "BTC", sentiment: "Bullish", confidence: 72 },
  { symbol: "ETH", sentiment: "Bearish", confidence: 64 },
  { symbol: "EURUSD", sentiment: "Bullish", confidence: 58 },
  { symbol: "GOLD", sentiment: "Bearish", confidence: 81 },
];

function clampConfidence(n: number) {
  return Math.max(55, Math.min(95, Math.round(n)));
}

function jitterConfidence(base: number) {
  const delta = (Math.random() - 0.5) * 6;
  return clampConfidence(base + delta);
}

function SkeletonBar() {
  return (
    <div className="h-2 w-full animate-pulse rounded-full bg-gray-800" />
  );
}

function SentimentRowView({ row }: { row: SentimentRow }) {
  const bullish = row.sentiment === "Bullish";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-[var(--text-primary)]">{row.symbol}</span>
        <span className={bullish ? "text-green-400" : "text-red-400"}>
          {row.sentiment}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-800">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#00c853] to-[#00e5ff] transition-all duration-1000 ease-in-out"
          style={{ width: `${row.confidence}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        Confidence {row.confidence}%
      </p>
    </div>
  );
}

export default function AISentiment() {
  const [rows, setRows] = useState<SentimentRow[]>(DEMO);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  const fetchSentiment = async () => {
    try {
      const res = await fetch("/api/sentiment", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch sentiment");
      const data = (await res.json()) as SentimentRow[];
      setRows(data);
      setUsingDemo(false);
    } catch {
      setRows(DEMO);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  };

  // FIX 1: Removed setInterval so it only fetches data once on component mount
  useEffect(() => {
    void fetchSentiment();
  }, []);

  // Simulates live jitter on the existing data without making new API calls
  useEffect(() => {
    const id = window.setInterval(() => {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          confidence: jitterConfidence(r.confidence),
        })),
      );
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-5">
          {DEMO.map((d) => (
            <div key={d.symbol} className="space-y-2">
              <div className="flex justify-between">
                <span className="font-bold text-[var(--text-primary)]">
                  {d.symbol}
                </span>
                <span className="text-[var(--text-secondary)]">…</span>
              </div>
              <SkeletonBar />
              <p className="text-xs text-[var(--text-secondary)]">Loading…</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {rows.map((row) => (
          <SentimentRowView key={row.symbol} row={row} />
        ))}
      </div>
    );
  }, [loading, rows]);

  return (
    <div className="bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            🧠
          </span>
          <h3 className="text-lg font-semibold">AI sentiment</h3>
        </div>
        {usingDemo ? (
          <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
            Demo fallback
          </span>
        ) : (
          <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-400">
            Live
          </span>
        )}
      </div>
      {content}
    </div>
  );
}