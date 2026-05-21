"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FloatingChatBot } from "@/components/floating-chat-bot";
import { useTheme } from "@/components/theme-provider";

function NavDropdown({
  label,
  children,
  active,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-sm font-medium transition hover:text-[var(--accent)] ${
          active ? "accent-text" : "text-[var(--text-primary)]"
        }`}
      >
        {label}
        <span className="text-xs opacity-70">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 min-w-[220px] -translate-x-1/2 rounded-xl border py-2 shadow-xl"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function StockEdgeHeader() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--surface) 92%, transparent)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo + theme toggle */}
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0">
            <span className="text-lg font-black tracking-tight accent-text sm:text-xl">
              STOCK EDGE
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition hover:opacity-90"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="text-base" aria-hidden>
              {theme === "dark" ? "☀️" : "🌙"}
            </span>
          </button>
        </div>

        {/* Center nav — Dashboard & Markets dropdowns */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <NavDropdown label="Dashboard" active={isHome}>
            <Link
              href="/"
              className="block px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            >
              Home — AI Sentiment Agent
            </Link>
          </NavDropdown>

          <NavDropdown label="Markets" active={pathname.startsWith("/markets")}>
            <Link
              href="/markets/india"
              className="block px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            >
              NSE/BSE (India Overview)
            </Link>
            <Link
              href="/markets/global"
              className="block px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            >
              Major Global Indices
            </Link>
          </NavDropdown>
        </nav>

        {/* Far right — chatbot icon only */}
        <div className="ml-auto">
          <FloatingChatBot />
        </div>
      </div>
    </header>
  );
}
