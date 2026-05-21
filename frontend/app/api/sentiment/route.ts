import { NextResponse } from "next/server";

type SentimentRow = { symbol: string; sentiment: "Bullish" | "Bearish"; confidence: number };

const ASSETS = ["BTC", "ETH", "EURUSD", "GOLD"] as const;

function randomSentiment(): "Bullish" | "Bearish" {
  return Math.random() < 0.5 ? "Bullish" : "Bearish";
}

function randomConfidence() {
  return Math.floor(Math.random() * 41) + 55; // 55–95
}

export async function GET() {
  const rows: SentimentRow[] = ASSETS.map((symbol) => ({
    symbol,
    sentiment: randomSentiment(),
    confidence: randomConfidence(),
  }));

  return NextResponse.json(rows satisfies SentimentRow[]);
}
