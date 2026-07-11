"use client";

/**
 * Intelligence Terminal — mode controller.
 * ONE identity, two modes: "light" (default) and "dark" (mission control).
 * Set via `data-theme` on <html>.
 */
export type ThemeMode = "light" | "dark";

const KEY = "pf-theme";

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function setStoredTheme(mode: ThemeMode): void {
  try { localStorage.setItem(KEY, mode); } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pf:theme", { detail: mode }));
  }
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", mode);
  }
}
