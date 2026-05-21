import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normalizeTicker(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { ticker?: string };
    const ticker = normalizeTicker(body.ticker ?? "");
    if (!ticker || ticker.length > 16) {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("tracked_assets")
      .upsert({ ticker }, { onConflict: "ticker" })
      .select("id,ticker,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
