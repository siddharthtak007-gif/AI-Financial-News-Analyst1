import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function jitterPct(base: number) {
  return +(base + (Math.random() - 0.5) * 0.4).toFixed(1);
}

export async function GET() {
  let alerts: Array<{
    id: string;
    ticker: string;
    summary: string;
    impact_score: number;
    timestamp: string;
  }> = [];

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("alerts_history")
      .select("id,ticker,summary,impact_score,timestamp")
      .order("timestamp", { ascending: false })
      .limit(5);
    if (!error && data?.length) alerts = data;
  } catch {
    /* use demo alerts below only when Supabase unavailable */
  }

  const useDemoAlerts = alerts.length === 0;
  if (useDemoAlerts) {
    alerts = [
      {
        id: "demo-1",
        ticker: "INFY",
        summary: "Major deal announced",
        impact_score: 8,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "demo-2",
        ticker: "RELIANCE",
        summary: "Quarterly earnings beat expectations",
        impact_score: 8,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  }

  try {
    const res = await fetch(`${API_URL}/api/markets/india`, { cache: "no-store" });
    if (res.ok) {
      const market = await res.json();
      const stocks = (market.stocks ?? []) as Array<{
        symbol: string;
        change_pct: number;
      }>;
      const sorted = [...stocks].sort((a, b) => b.change_pct - a.change_pct);
      const gainers = sorted.filter((s) => s.change_pct > 0).slice(0, 4);
      const losers = sorted
        .filter((s) => s.change_pct < 0)
        .sort((a, b) => a.change_pct - b.change_pct)
        .slice(0, 4);

      const avg =
        stocks.length > 0
          ? stocks.reduce((a, s) => a + s.change_pct, 0) / stocks.length
          : 0.5;
      const bullish = avg >= 0;
      const score = Math.min(95, Math.max(55, Math.round(65 + avg * 15)));

      return NextResponse.json({
        gainers: gainers.length
          ? gainers
          : [
              { symbol: "TATA MOTORS", change_pct: jitterPct(2.1) },
              { symbol: "ITC", change_pct: jitterPct(1.8) },
            ],
        losers: losers.length
          ? losers
          : [
              { symbol: "BAJAJ FINANCE", change_pct: jitterPct(-1.5) },
              { symbol: "HDFC BANK", change_pct: jitterPct(-0.9) },
            ],
        sentiment: { label: bullish ? "Bullish" : "Bearish", score },
        alerts,
      });
    }
  } catch {
    /* fallback */
  }

  return NextResponse.json({
    gainers: [
      { symbol: "TATA MOTORS", change_pct: jitterPct(2.1) },
      { symbol: "ITC", change_pct: jitterPct(1.8) },
      { symbol: "BHARTIARTL", change_pct: jitterPct(1.5) },
    ],
    losers: [
      { symbol: "BAJAJ FINANCE", change_pct: jitterPct(-1.5) },
      { symbol: "HDFC BANK", change_pct: jitterPct(-0.9) },
    ],
    sentiment: { label: "Bullish", score: 72 },
    alerts,
  });
}
