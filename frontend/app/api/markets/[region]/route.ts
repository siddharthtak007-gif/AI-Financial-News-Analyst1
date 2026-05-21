import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

type Params = { params: Promise<{ region: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { region } = await params;
  if (region !== "india" && region !== "global") {
    return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/markets/${region}`, { cache: "no-store" });
    if (res.ok) return NextResponse.json(await res.json());
  } catch {
    /* fallback below */
  }

  return NextResponse.json(simulatedMarkets(region));
}

function simulatedMarkets(region: string) {
  const rand = () => +(Math.random() * 2 - 0.5).toFixed(2);
  const row = (symbol: string, price: number) => ({
    symbol,
    price: +(price * (1 + rand() / 100)).toFixed(2),
    change_pct: rand(),
    volume: Math.floor(Math.random() * 40_000_000) + 1_000_000,
  });

  if (region === "india") {
    return {
      region: "india",
      title: "NSE/BSE (India Overview)",
      indices: [
        row("NIFTY 50", 22405),
        row("SENSEX", 73800),
        row("BANK NIFTY", 47850),
        row("NIFTY IT", 35200),
      ],
      stocks: [
        row("RELIANCE", 2950),
        row("TCS", 3850),
        row("HDFCBANK", 1680),
        row("INFY", 1520),
        row("ICICIBANK", 1120),
        row("SBIN", 780),
      ],
    };
  }

  return {
    region: "global",
    title: "Major Global Indices",
    indices: [
      row("S&P 500", 5280),
      row("NASDAQ", 16850),
      row("DOW", 39200),
      row("FTSE 100", 8120),
    ],
    stocks: [
      row("AAPL", 189.5),
      row("MSFT", 412),
      row("NVDA", 118.7),
      row("GOOGL", 168.9),
    ],
  };
}
