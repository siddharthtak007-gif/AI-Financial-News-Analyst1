"use client";

import { useEffect, useState } from "react";

type TickerItem = {
  symbol: string;
  price: number;
  change_pct: number;
};

function Row({ items }: { items: TickerItem[] }) {
  return (
    <>
      {items.map((t) => {
        const up = t.change_pct >= 0;
        return (
          <span key={t.symbol} className="mx-5 inline-flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-[var(--text-primary)]">{t.symbol}:</span>
            <span className="text-[var(--text-secondary)]">
              {t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className={up ? "text-green-400" : "text-red-400"}>
              {up ? "▲" : "▼"} {Math.abs(t.change_pct).toFixed(1)}%
            </span>
          </span>
        );
      })}
    </>
  );
}

const FALLBACK: TickerItem[] = [
  { symbol: "NIFTY 50", price: 22405, change_pct: 0.8 },
  { symbol: "SENSEX", price: 73800, change_pct: 0.9 },
  { symbol: "RELIANCE", price: 2950, change_pct: 1.2 },
  { symbol: "TCS", price: 3710, change_pct: 0.6 },
  { symbol: "HDFCBANK", price: 1680, change_pct: 0.5 },
  { symbol: "INFY", price: 1520, change_pct: 0.4 },
];

export function IndiaLiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ticker/india", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.items?.length) setItems(data.items);
        }
      } catch {
        /* use fallback */
      }
    }
    void load();
    // Changed polling interval from 15 seconds (15000) to 5 minutes (300000) to prevent API rate limits
    const id = setInterval(load, 300000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t py-2"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--surface) 95%, transparent)",
      }}
    >
      <div className="overflow-hidden text-[11px]">
        <div className="flex w-max animate-marquee">
          <Row items={items} />
          <Row items={items} />
        </div>
      </div>
    </div>
  );
}