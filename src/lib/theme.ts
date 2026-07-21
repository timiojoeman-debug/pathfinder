"use client";

import { useSyncExternalStore } from "react";

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

/** Theme changes arrive from this tab (`pf:theme`) or another one (`storage`). */
function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener("pf:theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("pf:theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Read the stored theme as external state.
 *
 * localStorage plus the `pf:theme` event *is* an external store, so this is
 * `useSyncExternalStore` rather than the useEffect + setState pattern it
 * replaces. That pattern rendered once with the default and then corrected
 * itself — a wasted render on every page, and an eslint
 * `react-hooks/set-state-in-effect` error.
 *
 * The server snapshot is the "light" default so SSR and the first client
 * render agree; the subscription corrects it immediately after hydration if
 * storage says otherwise. Returning a string (not an object) keeps the
 * snapshot referentially stable, which `useSyncExternalStore` requires.
 */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(
    subscribeTheme,
    () => getStoredTheme() ?? "light",
    () => "light",
  );
}

/** Persist a theme, apply it to <html>, and notify every subscriber. */
export function setTheme(mode: ThemeMode): void {
  setStoredTheme(mode);
  applyTheme(mode);
}
