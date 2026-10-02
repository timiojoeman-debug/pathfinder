"use client";

import { useEffect, useState } from "react";
import type { Freshness } from "@/lib/jobs/freshness";

/**
 * Closed-posting status for saved roles, by URL. Kept in localStorage rather than
 * the store: it is a cache of a check, not student data, and the store should not
 * carry something a re-check can rebuild.
 *
 * Every visit asks the server about feed-backed roles (cheap, answered from the job
 * cache). The server probes other links only when we ask, and we ask at most once a
 * week, so "may have closed" is a weekly judgement kept between checks.
 */

const KEY = "pf-role-freshness";
const WEEK_MS = 7 * 24 * 3600 * 1000;
const MAX_URLS = 20;
/** A probe-derived "may have closed" is a weak signal, so it is forgotten after this long unless a probe repeats it. */
const PROBE_RESULT_TTL_MS = 28 * 24 * 3600 * 1000;

interface Cache {
  probedAt: number;
  statuses: Record<string, Freshness>;
  /** When each "may-have-closed" was last confirmed by a probe. */
  closedAt: Record<string, number>;
}

function readCache(): Cache {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Cache | null;
    if (raw && typeof raw.probedAt === "number" && raw.statuses && typeof raw.statuses === "object") {
      return { ...raw, closedAt: raw.closedAt && typeof raw.closedAt === "object" ? raw.closedAt : {} };
    }
  } catch {
    /* private mode or corrupt: start empty */
  }
  return { probedAt: 0, statuses: {}, closedAt: {} };
}

function writeCache(c: Cache): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable: the check simply re-runs next time */
  }
}

/** A fresh answer replaces the cached one, except "unknown", which means "not checked" and keeps what we had. */
export function mergeFreshness(
  cached: Record<string, Freshness>,
  fresh: Record<string, Freshness>,
): Record<string, Freshness> {
  const out = { ...cached };
  for (const [url, s] of Object.entries(fresh)) {
    if (s !== "unknown") out[url] = s;
  }
  return out;
}

/** Drops "may-have-closed" entries not re-confirmed within the TTL (a missing timestamp counts as expired). */
export function expireProbeResults(cache: Cache, now: number): Cache {
  const statuses = { ...cache.statuses };
  const closedAt = { ...cache.closedAt };
  for (const [url, s] of Object.entries(statuses)) {
    if (s === "may-have-closed" && !(now - (closedAt[url] ?? 0) < PROBE_RESULT_TTL_MS)) {
      delete statuses[url];
      delete closedAt[url];
    }
  }
  return { ...cache, statuses, closedAt };
}

export function useRoleFreshness(allUrls: string[]): Record<string, Freshness> {
  const [statuses, setStatuses] = useState<Record<string, Freshness>>({});
  const key = allUrls.slice(0, MAX_URLS).join("\n");

  useEffect(() => {
    if (!key) return;
    const urls = key.split("\n");
    const cache = expireProbeResults(readCache(), Date.now());
    const probe = Date.now() - cache.probedAt > WEEK_MS;
    let cancelled = false;
    const show = (s: Record<string, Freshness>) => {
      if (!cancelled) setStatuses(Object.fromEntries(urls.filter((u) => s[u]).map((u) => [u, s[u]])));
    };
    show(cache.statuses);

    fetch("/api/saved-roles/freshness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, probe }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { statuses?: Record<string, Freshness>; probed?: boolean } | null) => {
        if (!json?.statuses) return; // signed out, offline or throttled: keep what we have
        const merged = mergeFreshness(cache.statuses, json.statuses);
        const closedAt = { ...cache.closedAt };
        for (const [url, st] of Object.entries(json.statuses)) {
          if (st === "may-have-closed") closedAt[url] = Date.now();
          else if (st !== "unknown") delete closedAt[url];
        }
        writeCache({ probedAt: json.probed ? Date.now() : cache.probedAt, statuses: merged, closedAt });
        show(merged);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  return statuses;
}
