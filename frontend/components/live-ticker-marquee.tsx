"use client";

const TICKERS = [
  { sym: "AAPL", price: 189.42, chg: +1.12 },
  { sym: "MSFT", price: 412.08, chg: -0.54 },
  { sym: "NVDA", price: 118.76, chg: +2.31 },
  { sym: "TSLA", price: 241.33, chg: -1.08 },
  { sym: "AMZN", price: 178.55, chg: +0.67 },
  { sym: "GOOGL", price: 168.91, chg: +0.22 },
  { sym: "META", price: 512.44, chg: +1.45 },
  { sym: "BTC", price: 64210.0, chg: +0.88 },
  { sym: "ETH", price: 3124.5, chg: -0.41 },
  { sym: "SPY", price: 512.18, chg: +0.19 },
];

function Row() {
  return (
    <>
      {TICKERS.map((t) => {
        const up = t.chg >= 0;
        return (
          <span
            key={t.sym}
            className="mx-6 inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span className="font-semibold text-[var(--text-primary)]">
              {t.sym}
            </span>
            <span className="text-[var(--text-secondary)]">
              {t.price.toLocaleString(undefined, {
                minimumFractionDigits: t.sym === "BTC" || t.sym === "ETH" ? 2 : 2,
              })}
            </span>
            <span className={up ? "text-green-400" : "text-red-400"}>
              {up ? "▲" : "▼"} {Math.abs(t.chg).toFixed(2)}%
            </span>
          </span>
        );
      })}
    </>
  );
}

export function LiveTickerMarquee() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--surface) 85%, transparent)",
      }}
    >
      <div className="overflow-hidden py-1.5 text-[11px]">
        <div className="flex w-max animate-marquee">
          <Row />
          <Row />
        </div>
      </div>
    </div>
  );
}
