"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MarketRow = {
  symbol: string;
  price: number;
  change_pct: number;
  volume: number;
};

type MarketData = {
  region: string;
  title: string;
  indices: MarketRow[];
  stocks: MarketRow[];
};

function HeatCell({ change }: { change: number }) {
  const intensity = Math.min(Math.abs(change) / 2, 1);
  const bg =
    change >= 0
      ? `rgba(0, 230, 118, ${0.15 + intensity * 0.45})`
      : `rgba(255, 82, 82, ${0.15 + intensity * 0.45})`;
  return (
    <div
      className="rounded-lg border p-3 text-center transition"
      style={{ borderColor: "var(--border)", background: bg }}
    >
      <p className={`text-lg font-bold ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
        {change >= 0 ? "+" : ""}
        {change.toFixed(2)}%
      </p>
    </div>
  );
}

function TrendBar({ rows }: { rows: MarketRow[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.change_pct)), 0.1);
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const w = (Math.abs(r.change_pct) / max) * 100;
        const up = r.change_pct >= 0;
        return (
          <div key={r.symbol} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 font-medium text-[var(--text-primary)]">{r.symbol}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${up ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${w}%` }}
              />
            </div>
            <span className={`w-14 text-right font-mono text-xs ${up ? "text-green-400" : "text-red-400"}`}>
              {up ? "+" : ""}
              {r.change_pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: MarketRow[] }) {
  return (
    <div className="surface-card overflow-hidden">
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-2 text-left">Symbol</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Change</th>
              <th className="hidden px-4 py-2 text-right sm:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">{r.symbol}</td>
                <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                  {r.price.toLocaleString()}
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-medium ${r.change_pct >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {r.change_pct >= 0 ? "+" : ""}
                  {r.change_pct.toFixed(2)}%
                </td>
                <td className="hidden px-4 py-2.5 text-right text-[var(--text-secondary)] sm:table-cell">
                  {(r.volume / 1_000_000).toFixed(1)}M
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MarketsDashboard({ region }: { region: "india" | "global" }) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/markets/${region}`, { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [region]);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--surface-2)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 pb-28 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-xs accent-text hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            {data.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Simulated real-time performance · Heatmaps · Demand trend charts
          </p>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-xs text-green-400"
          style={{ borderColor: "var(--border)" }}
        >
          ● Live feed (simulated)
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.indices.map((idx) => (
          <div key={idx.symbol} className="surface-card p-4">
            <p className="text-xs text-[var(--text-secondary)]">{idx.symbol}</p>
            <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
              {idx.price.toLocaleString()}
            </p>
            <p
              className={`mt-1 text-sm font-medium ${idx.change_pct >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {idx.change_pct >= 0 ? "▲" : "▼"} {Math.abs(idx.change_pct).toFixed(2)}%
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Performance heatmap</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[...data.indices, ...data.stocks].map((r) => (
              <div key={r.symbol}>
                <p className="mb-1 truncate text-xs text-[var(--text-secondary)]">{r.symbol}</p>
                <HeatCell change={r.change_pct} />
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Demand trend chart</h3>
          <TrendBar rows={data.stocks} />
        </div>
      </div>

      <Table title="Indices" rows={data.indices} />
      <Table title="Top movers" rows={data.stocks} />
    </div>
  );
}
