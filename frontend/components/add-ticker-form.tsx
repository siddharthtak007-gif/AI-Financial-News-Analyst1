"use client";

import { FormEvent, useState } from "react";

type Props = {
  onAdded?: () => void;
};

export function AddTickerForm({ onAdded }: Props) {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tracked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add ticker");
      setTicker("");
      setMessage({ type: "ok", text: `Tracking ${data.asset.ticker}` });
      onAdded?.();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="ticker"
          className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
        >
          Add ticker
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="ticker"
            name="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="NVDA"
            maxLength={16}
            className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none ring-cyan-400/30 focus:ring-2"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !ticker.trim()}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving…" : "Track asset"}
          </button>
        </div>
      </div>
      {message ? (
        <p
          className={
            message.type === "ok"
              ? "text-sm text-green-400"
              : "text-sm text-red-400"
          }
        >
          {message.text}
        </p>
      ) : (
        <p className="text-xs text-[var(--text-secondary)]">
          Tickers are stored in Supabase and scanned hourly by the FastAPI worker.
        </p>
      )}
    </form>
  );
}
