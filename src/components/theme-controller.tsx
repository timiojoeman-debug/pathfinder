"use client";

import { useEffect } from "react";
import { getStoredTheme, applyTheme } from "@/lib/theme";

/**
 * Keeps <html data-theme> in sync with the stored Intelligence Terminal mode.
 * The no-flash inline script in layout sets the initial value before paint;
 * this handles live toggles thereafter.
 */
export function ThemeController() {
  useEffect(() => {
    const sync = () => applyTheme(getStoredTheme() ?? "light");
    sync();
    window.addEventListener("pf:theme", sync);
    return () => window.removeEventListener("pf:theme", sync);
  }, []);

  return null;
}
