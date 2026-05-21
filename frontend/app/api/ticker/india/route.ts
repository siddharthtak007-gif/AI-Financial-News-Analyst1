import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/ticker/india`, { cache: "no-store" });
    if (res.ok) return NextResponse.json(await res.json());
  } catch {
    /* fallback */
  }

  const items = [
    { symbol: "NIFTY 50", price: 22405, change_pct: 0.8 },
    { symbol: "SENSEX", price: 73800, change_pct: 0.9 },
    { symbol: "RELIANCE", price: 2950, change_pct: 1.2 },
    { symbol: "TCS", price: 3710, change_pct: 0.6 },
    { symbol: "HDFCBANK", price: 1680, change_pct: 0.5 },
    { symbol: "INFY", price: 1520, change_pct: 0.4 },
  ].map((i) => ({
    ...i,
    change_pct: +(i.change_pct + (Math.random() - 0.5) * 0.3).toFixed(1),
  }));

  return NextResponse.json({ items });
}
