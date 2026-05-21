"use client";

import { useCallback, useEffect, useState } from "react";

export type AlertRow = {
  id: string;
  ticker: string;
  sentiment: string;
  impact_score: number;
  summary: string;
  timestamp: string;
};

function sentimentClass(s: string) {
  if (s === "Bullish") return "text-green-400";
  if (s === "Bearish") return "text-red-400";
  return "text-[var(--text-secondary)]";
}

export function AlertsTable() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load alerts");
      setRows(data.alerts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Alert history
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            High-impact AI alerts (impact score ≥ 7)
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:opacity-90"
          style={{ borderColor: "var(--border)" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl"
              style={{ background: "var(--surface-2)" }}
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-8 text-center text-sm text-[var(--text-secondary)]"
          style={{ borderColor: "var(--border)" }}
        >
          No alerts yet. Add tickers and run the hourly scan to populate this table.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="min-w-full text-left text-sm">
            <thead
              className="text-xs uppercase tracking-wide text-[var(--text-secondary)]"
              style={{ background: "var(--surface-2)" }}
            >
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Sentiment</th>
                <th className="px-4 py-3 font-medium">Impact</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                    {r.ticker}
                  </td>
                  <td className={`px-4 py-3 font-medium ${sentimentClass(r.sentiment)}`}>
                    {r.sentiment}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300">
                      {r.impact_score}/10
                    </span>
                  </td>
                  <td className="max-w-xl px-4 py-3 text-[var(--text-secondary)]">
                    {r.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
