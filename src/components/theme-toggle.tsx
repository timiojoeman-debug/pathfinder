"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredTheme, setStoredTheme, type ThemeMode } from "@/lib/theme";

/** Intelligence Terminal Light/Dark toggle — terminal-styled, app-wide. */
export function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  useEffect(() => setMode(getStoredTheme() ?? "light"), []);

  const toggle = useCallback(() => {
    const next: ThemeMode = mode === "light" ? "dark" : "light";
    setMode(next);
    setStoredTheme(next); // side effect in the event handler, never inside a render-phase updater
  }, [mode]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
      style={{
        fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--ink-2)", background: "transparent",
        border: "1px solid var(--line)", borderRadius: "var(--radius-tight)", padding: "4px 10px",
        cursor: "pointer", ...style,
      }}
    >
      {mode === "dark" ? "◑ DARK" : "◐ LIGHT"}
    </button>
  );
}
