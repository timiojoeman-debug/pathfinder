/**
 * Lightweight sliding-window rate limiter.
 *
 * This is an in-memory implementation: correct and effective within a single
 * running instance (dev, a single container, a warm serverless isolate). For
 * multi-instance / fully-serverless production you MUST back this with a shared
 * store — swap `hit()` for `@upstash/ratelimit` + Upstash Redis (the interface
 * below is intentionally a drop-in shape). Until then this still stops naive
 * brute-force and cost-bomb floods, which is the Phase-0 requirement.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Opportunistic cleanup so the Map can't grow unbounded across long uptimes.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of buckets) {
    if (w.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

/**
 * Record a hit for `key` and report whether it's within `limit` per `windowMs`.
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const ok = existing.count <= limit;
  return { ok, limit, remaining, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
}

/** Per-route-class limits (requests per minute). Auth is deliberately strict. */
export const LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  ai: { limit: 30, windowMs: 60_000 },
  api: { limit: 120, windowMs: 60_000 },
} as const;

/** Classify a pathname into a limit bucket. */
export function classifyRoute(pathname: string): keyof typeof LIMITS {
  if (pathname.startsWith("/api/auth/")) return "auth";
  if (
    pathname.startsWith("/api/cv/") ||
    pathname.startsWith("/api/direction/") ||
    pathname.startsWith("/api/jobs/") ||
    pathname.startsWith("/api/networking/") ||
    pathname.startsWith("/api/network/") ||
    pathname.startsWith("/api/interview/") ||
    pathname.startsWith("/api/cover-letter/") ||
    pathname.startsWith("/api/intel/") ||
    pathname.startsWith("/api/linkedin/") ||
    pathname.startsWith("/api/project-builder/")
  ) {
    return "ai";
  }
  return "api";
}
