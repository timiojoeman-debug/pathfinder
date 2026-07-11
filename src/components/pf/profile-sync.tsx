"use client";

/**
 * ProfileSync — persists the derived Career Profile to the server whenever it
 * changes and the user is signed in. Debounced, fire-and-forget, and silent on
 * failure: the client store stays the source of truth, so a returning user's
 * profile survives across devices without ever blocking the UI.
 */

import { useEffect, useRef } from "react";
import { useProfile, useProgress } from "@/lib/pf/store";
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

export function ProfileSync() {
  const profile = useProfile();
  const progress = useProgress();
  const user = useAuthStore((s) => s.user);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSig = useRef<string>("");

  useEffect(() => {
    if (!user) return;
    // Only sync when the profile's meaningful signature actually moved.
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
