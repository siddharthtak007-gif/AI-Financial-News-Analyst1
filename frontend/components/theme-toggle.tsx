"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition hover:opacity-90"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-2)",
        color: "var(--text-primary)",
      }}
    >
      <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
