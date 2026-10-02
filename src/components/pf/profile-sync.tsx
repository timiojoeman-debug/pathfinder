"use client";

/**
 * ProfileSync — the client↔server persistence bridge.
 *
 * On sign-in it HYDRATES: if the server holds a saved working-state and the
 * local store is still empty (fresh device / cleared cache), it loads the
 * server state so the user's journey follows them across devices.
 *
 * Thereafter it SYNCS: whenever the persisted working-state changes it debounces a
 * snapshot POST (derived profile + events + the full working-state blob). It used to
 * fire only when a handful of summary numbers moved, so edits like a reminder date or
 * a removed card waited, unsynced, for some unrelated change.
 * Fire-and-forget and silent on failure — the local store stays the source of
 * truth, so persistence never blocks the UI.
 */

import { useEffect, useRef } from "react";
import { getProfile, getProgress, usePfStore } from "@/lib/pf/store";
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

/** Load a server working-state through the store's own `merge`, so it gets the same
 *  migrations a localStorage load does. A bare setState skipped them. */
function hydrateFrom(state: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const version = raw ? (JSON.parse(raw).version ?? 0) : 0;
    localStorage.setItem(STORE_KEY, JSON.stringify({ state, version }));
  } catch {
    return; // storage unavailable: stay with what's in memory
  }
  void usePfStore.persist.rehydrate();
}

function postSnapshot(clientState: Record<string, unknown> | null) {
  const profile = getProfile();
  const progress = getProgress();
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
    clientState,
  };
  void fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => { /* local store remains source of truth */ });
}

/** True when this device has no saved work. Read from storage itself, not the in-memory
 *  store: the store hydrates after mount, so on first render it looks empty even when it isn't. */
function localIsEmpty(): boolean {
  const s = readLocalState();
  if (!s) return true;
  const events = Array.isArray(s.events) ? s.events.length : 0;
  return events === 0 && !s.dirGenerated && !s.cvAnalyzed && !s.onbDone;
}

export function ProfileSync() {
  const user = useAuthStore((s) => s.user);
  const hydratedFor = useRef<string | null>(null);

  // ── Hydrate from server on sign-in (server wins only when local is empty) ──
  useEffect(() => {
    if (!user || hydratedFor.current === user.userId) return;
    hydratedFor.current = user.userId;
    if (!localIsEmpty()) return; // never clobber active local work

    let cancelled = false;
    void fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (cancelled || !json || typeof json !== "object") return;
        const state = (json as { clientState?: Record<string, unknown> | null }).clientState;
        // Re-check: the student may have started working while the request was in flight.
        if (state && Object.keys(state).length && localIsEmpty()) hydrateFrom(state);
      })
      .catch(() => { /* stay local-first */ });
    return () => { cancelled = true; };
  }, [user]);

  // ── Sync to server whenever the persisted slice changes ──
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSent = JSON.stringify(readLocalState());

    const unsub = usePfStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const clientState = readLocalState();
        const sig = JSON.stringify(clientState);
        // Typing into a draft field changes the store but not the persisted slice.
        if (sig === lastSent) return;
        lastSent = sig;
        postSnapshot(clientState);
      }, 1500);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  return null;
}
