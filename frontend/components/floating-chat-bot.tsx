"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

function answerFor(input: string) {
  const q = input.toLowerCase();
  if (q.includes("reliance") || q.includes("ticker") || q.includes("analyze"))
    return "Enter a ticker like RELIANCE in the main form and click Analyze. FastAPI fetches Google News RSS and Gemini returns BUY/SELL with impact scores.";
  if (q.includes("buy") || q.includes("sell"))
    return "BUY/SELL signals are AI-generated from news sentiment. Read the disclaimer — this is not financial advice.";
  if (q.includes("telegram"))
    return "Add your Telegram Chat ID to receive alerts when impact score ≥ 7. Use @BotFather to create a bot and /start to get your chat ID.";
  if (q.includes("gainer") || q.includes("loser") || q.includes("nse"))
    return "Check the right sidebar for Top Gainers, Top Losers, and Market Sentiment. Open Markets → NSE/BSE for full India dashboards.";
  return "I can help you analyze tickers, interpret BUY/SELL signals, and navigate Indian or global markets. Which ticker would you like to explore?";
}

export function FloatingChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! Ask me any market question. How can I analyze a ticker today?",
    },
  ]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!open || !panelRef.current) return;
      const target = e.target as Node;
      if (
        panelRef.current.contains(target) ||
        (e.target as HTMLElement).closest?.("[data-chat-fab]")
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

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
    <>
      <button
        type="button"
        data-chat-fab
        onClick={() => setOpen((v) => !v)}
        aria-label="Open help chat"
        aria-expanded={open}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition hover:scale-105"
        style={{
          borderColor: "var(--accent)",
          background: "linear-gradient(135deg, var(--surface-2), var(--surface))",
          color: "var(--accent)",
          boxShadow: open ? "0 0 24px var(--accent-glow)" : undefined,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm2 4v2h12V8H6zm0 4v2h8v-2H6z" />
        </svg>
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="fixed right-4 top-[4.5rem] z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:right-6"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            maxHeight: "min(520px, calc(100vh - 6rem))",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                style={{
                  background: "color-mix(in oklab, var(--accent) 25%, transparent)",
                  color: "var(--accent)",
                }}
              >
                💬
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary)]">STOCK EDGE Assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-sm px-3 py-2 text-sm"
                    : "mr-4 rounded-2xl rounded-bl-sm px-3 py-2 text-sm"
                }
                style={
                  m.role === "user"
                    ? {
                        background: "color-mix(in oklab, var(--accent) 18%, transparent)",
                        color: "var(--text-primary)",
                      }
                    : { background: "var(--surface-2)", color: "var(--text-secondary)" }
                }
              >
                {m.content}
              </div>
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
              placeholder="Ask a market question…"
              className="input-field flex-1 py-2 text-sm"
            />
            <button type="submit" className="btn-primary shrink-0 px-3 py-2 text-sm">
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
