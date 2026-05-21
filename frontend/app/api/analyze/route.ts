import { NextResponse } from "next/server";
import { parseApiError } from "@/lib/api-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: parseApiError(data, "Analysis failed") },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable. Start FastAPI: uvicorn main:app --reload --port 8000" },
      { status: 503 },
    );
  }
}
