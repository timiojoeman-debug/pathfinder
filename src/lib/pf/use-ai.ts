"use client";

/**
 * One place for "call an AI route from the client".
 *
 * Every AI route in this app answers in one of three ways: the real payload,
 * a served fallback (HTTP 200, because the route caught its own AIError), or
 * an error envelope. A page that hand-rolls fetch/loading/error around that
 * tends to drop the last case on the floor and leave a spinner running, so the
 * handling lives here once.
 *
 * Two things this deliberately does that an inline fetch usually forgets:
 *  - aborts the in-flight request when a newer one starts or the component
 *    unmounts, so a slow first response cannot overwrite a fast second one;
 *  - turns 429 into language a student can act on, since the AI bucket is
 *    30/min and the daily quota is real.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface AiTask<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True when the call failed only because nobody is signed in. The phase
   *  pages work logged-out (state is local), but every AI route is behind the
   *  auth cookie — so this is a routine state to render a way out of, not an
   *  error to shout about. */
  needsAuth: boolean;
  /** Resolves with the payload, or null when the call failed. */
  run: (body: unknown) => Promise<T | null>;
  reset: () => void;
}

const RATE_LIMITED =
  "That's the AI limit for the moment — give it a minute and try again.";
const UNREACHABLE =
  "Couldn't reach the generator. Check your connection and try again.";
const NEEDS_AUTH =
  "Generating uses your account — sign in and your draft is still here when you get back.";

/** Pull the most useful message out of whatever the route sent back. */
function messageFrom(status: number, payload: unknown): string {
  if (status === 401) return NEEDS_AUTH;
  if (status === 429) return RATE_LIMITED;
  const err = (payload as { error?: unknown } | null)?.error;
  if (typeof err === "string" && err.trim()) return err;
  return `The generator returned an error (${status}). Try again.`;
}

export function useAiTask<T>(endpoint: string): AiTask<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      inFlight.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (body: unknown): Promise<T | null> => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setLoading(true);
      setError(null);
      setNeedsAuth(false);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        // A route may answer 200 with a fallback or non-JSON on an edge path;
        // treat an unreadable body as a failure rather than as empty content.
        const payload: unknown = await res.json().catch(() => null);

        if (!res.ok || payload === null) {
          if (!controller.signal.aborted && mounted.current) {
            setError(messageFrom(res.status, payload));
            setNeedsAuth(res.status === 401);
          }
          return null;
        }

        if (!controller.signal.aborted && mounted.current) setData(payload as T);
        return payload as T;
      } catch {
        // An abort is a newer request winning, not a failure to report.
        if (controller.signal.aborted) return null;
        if (mounted.current) setError(UNREACHABLE);
        return null;
      } finally {
        if (!controller.signal.aborted && mounted.current) setLoading(false);
      }
    },
    [endpoint],
  );

  const reset = useCallback(() => {
    inFlight.current?.abort();
    setData(null);
    setError(null);
    setNeedsAuth(false);
    setLoading(false);
  }, []);

  return { data, loading, error, needsAuth, run, reset };
}

/**
 * The methodology routes answer with an envelope — the payload sits under
 * `data`, alongside feedback and next steps. `aiEnvelope()` guarantees `data`
 * is present and non-empty server-side, but the client still has to reach in.
 */
export interface AiEnvelope<T> {
  data: T;
  feedback?: { issue?: string; severity?: string; suggestedFix?: string; explanation?: string }[];
  strengths?: string[];
  nextSteps?: string[];
  nextQuestion?: string;
}
