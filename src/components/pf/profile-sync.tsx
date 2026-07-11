"use client";

/**
 * ProfileSync — the client↔server persistence bridge.
 *
 * On sign-in it HYDRATES: if the server holds a saved working-state and the
 * local store is still empty (fresh device / cleared cache), it loads the
 * server state so the user's journey follows them across devices.
 *
 * Thereafter it SYNCS: whenever the profile meaningfully changes it debounces a
 * snapshot POST (derived profile + events + the full working-state blob).
 * Fire-and-forget and silent on failure — the local store stays the source of
 * truth, so persistence never blocks the UI.
 */

import { useEffect, useRef } from "react";
import { usePfStore, useProfile, useProgress } from "@/lib/pf/store";
import { useAuthStore } from "@/lib/stores";
import type { PfPhase } from "@/lib/pf/events";

const PHASE_TO_DB: Record<PfPhase, string> = {
  direction: "direction_set",
  cv: "cv_analyzed",
  jobs: "applying",
  networking: "networking",
  interview: "interviewing",
  tracker: "applying",
};

const STORE_KEY = "pathfinder-redesign-v1";

/** The raw persisted store slice (same shape Zustand writes to localStorage). */
function readLocalState(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).state ?? null;
  } catch {
    return null;
  }
}

export function ProfileSync() {
  const profile = useProfile();
  const progress = useProgress();
  const user = useAuthStore((s) => s.user);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSig = useRef<string>("");
  const hydratedFor = useRef<string | null>(null);

  // ── Hydrate from server on sign-in (server wins only when local is empty) ──
  useEffect(() => {
    if (!user || hydratedFor.current === user.userId) return;
    hydratedFor.current = user.userId;

    const localEmpty = !profile.directionSet && !profile.cvAnalyzed && profile.events.length === 0;
    if (!localEmpty) return; // never clobber active local work

    let cancelled = false;
    void fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (cancelled || !json || typeof json !== "object") return;
        const state = (json as { clientState?: Record<string, unknown> | null }).clientState;
        if (state && Object.keys(state).length) {
          // Merge the server working-state into the store, then re-persist.
          usePfStore.setState(state as never);
        }
      })
      .catch(() => { /* stay local-first */ });
    return () => { cancelled = true; };
  }, [user, profile.directionSet, profile.cvAnalyzed, profile.events.length]);

  // ── Sync to server on meaningful change ──
  useEffect(() => {
    if (!user) return;
    const sig = JSON.stringify({
      d: profile.directionStatement,
      a: profile.atsScore,
      apps: profile.applicationsSubmitted,
      net: profile.outreachSent,
      leet: profile.leetSolved,
      ev: profile.events.length,
      o: progress.overall,
    });
    if (sig === lastSig.current) return;
    lastSig.current = sig;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const body = {
        directionStatement: profile.directionStatement,
        directionScore: progress.overall,
        userPhase: PHASE_TO_DB[profile.currentPhase],
        progressSnapshot: {
          overall: progress.overall,
          phases: progress.phases.map((p) => ({ phase: p.phase, pct: p.pct })),
        },
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
        cvHistory: profile.atsHistory,
        events: profile.events.slice(-50).map((e) => ({ type: e.type, phase: e.phase, label: e.label, meta: e.meta, ts: e.ts })),
        clientState: readLocalState(),
      };
      void fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => { /* local store remains source of truth */ });
    }, 1500);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [user, profile, progress]);

  return null;
}
