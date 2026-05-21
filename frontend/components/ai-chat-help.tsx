"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const FAQ: Record<string, string> = {
  ticker:
    "Enter a stock symbol (e.g., NVDA) and click Track asset. It is saved to Supabase tracked_assets and included in hourly scans.",
  scan:
    "The FastAPI endpoint GET /api/run-hourly-scan pulls Google News RSS headlines, analyzes them with Gemini, and saves high-impact alerts (≥7) plus Telegram notifications.",
  sentiment:
    "The AI Sentiment widget polls /api/sentiment every 60s and simulates live confidence jitter every 3s. Replace the route with real Gemini calls later.",
  telegram:
    "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in backend env vars. Create a bot via @BotFather and send /start to obtain your chat id.",
};

function answerFor(input: string) {
  const q = input.toLowerCase();
  if (q.includes("ticker") || q.includes("track")) return FAQ.ticker;
  if (q.includes("scan") || q.includes("hourly") || q.includes("cron"))
    return FAQ.scan;
  if (q.includes("sentiment") || q.includes("widget")) return FAQ.sentiment;
  if (q.includes("telegram") || q.includes("alert")) return FAQ.telegram;
  return "I can help with tracking tickers, hourly scans, AI sentiment, and Telegram alerts. Try asking: “How do I add a ticker?” or “How does the hourly scan work?”";
}

export function AIChatHelp() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your dashboard copilot. Ask about tickers, scans, sentiment, or Telegram setup.",
    },
  ]);

  const quickPrompts = useMemo(
    () => [
      "How do I add a ticker?",
      "Explain the hourly scan",
      "What is the sentiment widget?",
    ],
    [],
  );

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: trimmed },
      { role: "assistant", content: answerFor(trimmed) },
    ]);
    setInput("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <aside className="fixed right-4 top-8 z-40 w-[min(420px,calc(100vw-2rem))] sm:right-6">
      <div className="surface-card overflow-hidden shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              AI Chat Help
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Quick guidance for this dashboard
            </p>
          </div>
          <span className="text-lg" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </button>

        {open ? (
          <div className="flex max-h-[420px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-2xl rounded-br-md bg-cyan-500/15 px-3 py-2 text-sm text-[var(--text-primary)]"
                      : "mr-6 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-[var(--text-secondary)]"
                  }
                  style={
                    m.role === "assistant"
                      ? { background: "var(--surface-2)" }
                      : undefined
                  }
                >
                  {m.content}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t p-3" style={{ borderColor: "var(--border)" }}>
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              onSubmit={onSubmit}
              className="flex gap-2 border-t p-3"
              style={{ borderColor: "var(--border)" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm outline-none ring-cyan-400/30 focus:ring-2"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Send
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
