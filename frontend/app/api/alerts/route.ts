import { NextResponse } from "next/server";
import { parseApiError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("alerts_history")
      .select("id,ticker,sentiment,impact_score,summary,timestamp")
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message, alerts: [] }, { status: 500 });
    }

    return NextResponse.json({ alerts: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: message, alerts: [], hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local" },
      { status: 200 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${API_URL}/api/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: parseApiError(data, "Failed to save alert") },
      { status: res.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable. Cannot save alert." },
      { status: 503 },
    );
  }
}
