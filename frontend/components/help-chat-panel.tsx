"use client";

import { FormEvent, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

function answerFor(input: string) {
  const q = input.toLowerCase();
  if (q.includes("reliance") || q.includes("ticker") || q.includes("analyze"))
    return "Enter a ticker like RELIANCE in the main form and click Analyze. Our FastAPI backend fetches Google News RSS and runs Gemini sentiment analysis.";
  if (q.includes("buy") || q.includes("sell"))
    return "BUY/SELL signals are AI-generated from news sentiment. Always read the disclaimer — this is not financial advice.";
  if (q.includes("telegram"))
    return "Add your Telegram Chat ID to receive alerts when impact score ≥ 7. Create a bot via @BotFather and message /start to get your chat ID.";
  if (q.includes("nifty") || q.includes("sensex") || q.includes("india"))
    return "Open Markets → NSE/BSE (India Overview) for simulated NIFTY, SENSEX, and top Indian stock metrics.";
  return "I can help you analyze tickers, understand BUY/SELL signals, set up Telegram alerts, or navigate Indian and global markets. What ticker would you like to explore?";
}

export function HelpChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! Ask me any stock market questions. How can I help you analyze a ticker today?",
    },
  ]);

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
    <aside
      id="help"
      className="surface-card flex h-full min-h-[480px] flex-col overflow-hidden lg:sticky lg:top-24"
    >
      <div
        className="flex items-center gap-3 border-b px-4 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg"
          style={{ borderColor: "var(--accent)" }}
        >
          💬
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Help Chat Bot</p>
          <p className="text-xs text-[var(--text-secondary)]">STOCK EDGE Assistant</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-6 rounded-2xl rounded-br-sm px-3 py-2.5 text-sm"
                : "mr-4 rounded-2xl rounded-bl-sm px-3 py-2.5 text-sm"
            }
            style={
              m.role === "user"
                ? {
                    background: "color-mix(in oklab, var(--accent) 20%, transparent)",
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
        className="flex gap-2 border-t p-4"
        style={{ borderColor: "var(--border)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="input-field flex-1 py-2"
        />
        <button type="submit" className="btn-primary shrink-0 px-4 py-2">
          Send
        </button>
      </form>
    </aside>
  );
}
