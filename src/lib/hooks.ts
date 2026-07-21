"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared client-environment hooks.
 *
 * Each of these reads something that only exists in the browser. The obvious
 * implementation — `useState` plus an effect that sets it on mount — renders
 * once with a placeholder and then immediately re-renders, and trips eslint's
 * `react-hooks/set-state-in-effect`. `useSyncExternalStore` expresses the same
 * thing correctly: a server snapshot, a client snapshot, and a subscription.
 */

/** No-op subscribe: the answer never changes after the first client render. */
const subscribeNever = () => () => {};

/**
 * False during SSR and the hydration pass, true afterwards.
 *
 * Use to gate anything that cannot exist on the server — portals, `document`
 * access, `new Date()` — so the server and client agree on the first render
 * and React never reports a hydration mismatch.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Whether the user asked for reduced motion, kept live if they change it.
 *
 * The server snapshot is `false` so SSR matches the pre-animation frame that
 * the client also renders first; the real preference arrives on hydration.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
