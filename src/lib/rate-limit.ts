/**
 * Rate limiting, shared across serverless instances.
 *
 * This was an in-memory Map. That is correct within one process, but on Vercel
 * each instance keeps its own copy, so the real limit became
 * (instances x limit): 11 rapid signups against production returned a single
 * 429 where the configured limit was 10/min in total. Counters now live in
 * Postgres (Supabase, already deployed — no new service to run) behind an
 * atomic upsert, so every instance increments the same row.
 *
 * The in-memory implementation is kept as a fallback: when Supabase is not
 * configured (local dev, CI) or the counter query fails, we degrade to
 * per-instance limiting rather than failing the request. Weaker than the shared
 * counter, but a rate limiter must not take the site down when its own storage
 * is unavailable.
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
  /** Whether the shared store answered. False means per-instance fallback. */
  shared: boolean;
}

/** Per-instance counter. Used directly in dev, and as the fallback in prod. */
export function hitLocal(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfter: 0, shared: false };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const ok = existing.count <= limit;
  return {
    ok,
    limit,
    remaining,
    retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    shared: false,
  };
}

/** A slow limiter must not become the site's latency floor. */
const STORE_TIMEOUT_MS = 1500;

function sharedStoreConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Increment the shared counter for `key`.
 *
 * Called from middleware, which runs on the Edge runtime — hence a plain fetch
 * to PostgREST rather than the Supabase SDK. Returns null when the store is
 * unavailable so the caller can fall back rather than failing the request.
 */
async function hitShared(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const cfg = sharedStoreConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/rate_limit_hit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({ p_key: key, p_window_ms: windowMs }),
      cache: "no-store",
      signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const rows = (await res.json()) as { hits?: number; reset_at?: string }[] | null;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || typeof row.hits !== "number" || !row.reset_at) return null;

    const resetMs = new Date(row.reset_at).getTime() - Date.now();
    return {
      ok: row.hits <= limit,
      limit,
      remaining: Math.max(0, limit - row.hits),
      retryAfter: Math.max(0, Math.ceil(resetMs / 1000)),
      shared: true,
    };
  } catch {
    // Timeout, network error, malformed response — fall back, never throw.
    return null;
  }
}

/**
 * Record a hit for `key` and report whether it's within `limit` per `windowMs`.
 * Uses the shared store when available, otherwise the per-instance counter.
 */
export async function hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const shared = await hitShared(key, limit, windowMs);
  return shared ?? hitLocal(key, limit, windowMs);
}

/**
 * Per-route-class limits (requests per minute).
 *
 * `auth` is deliberately strict because it guards credentials. It covers only
 * the endpoints that accept or issue them — session reads like /api/auth/me are
 * classified as `api`, since the client calls that on navigation and throttling
 * it at 10/min would lock a browsing user out of their own session. That was
 * survivable only because the old per-instance limiter rarely fired.
 */
export const LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  ai: { limit: 30, windowMs: 60_000 },
  api: { limit: 120, windowMs: 60_000 },
} as const;

/** Auth endpoints that read the current session rather than accept credentials. */
const SESSION_READ_ROUTES = new Set(["/api/auth/me", "/api/auth/logout"]);

/** Classify a pathname into a limit bucket. */
export function classifyRoute(pathname: string): keyof typeof LIMITS {
  if (SESSION_READ_ROUTES.has(pathname)) return "api";
  /* An unauthenticated write belongs in the strict bucket even though it is
     not a credential route: it is reachable without a session, so the general
     120/min would let one IP post a row twice a second. */
  if (pathname === "/api/pilot-interest") return "auth";
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
    pathname.startsWith("/api/mentor/") ||
    pathname.startsWith("/api/project-builder/")
  ) {
    return "ai";
  }
  return "api";
}

/* ── Guest (logged-out) access ──────────────────────────────────────────
   The product's phase pages work without an account — state is local — but
   every /api route sat behind the auth cookie, so the first thing many
   students saw was a 401. Job search touches no user-specific server data: it
   queries public GitHub internship lists and Adzuna using only the search
   terms, so it is safe to open to guests. AI generators and every
   account-scoped route stay behind login. A guest job search is still metered
   by a per-IP daily budget (below) so it cannot run up the Adzuna quota. */

const GUEST_API_ROUTES = new Set(["/api/jobs/search"]);

/** Whether a logged-out visitor may call this exact route. */
export function isGuestAllowed(pathname: string): boolean {
  return GUEST_API_ROUTES.has(pathname);
}

/** Per-IP daily budget for guest AI/search calls (override with ANON_AI_DAILY_QUOTA). */
export const ANON_AI_DAILY_QUOTA = Number(process.env.ANON_AI_DAILY_QUOTA) || 10;

/* ── Per-user daily AI quota ────────────────────────────────────────────
   Caps OpenAI spend from any single account. Shares the same counter table,
   so it holds across instances too: the window is the milliseconds remaining
   until the next UTC midnight, which pins the first call of the day to that
   expiry and lets every later call inherit it. */

function msUntilUtcMidnight(now: number): number {
  const day = Math.floor(now / 86_400_000);
  return (day + 1) * 86_400_000 - now;
}

/** Per-key daily counter. `retryAfter` counts down to the next UTC midnight. */
export async function hitDaily(key: string, limit: number): Promise<RateLimitResult> {
  const now = Date.now();
  // Namespaced by day so a stale row from yesterday can never be inherited.
  const dayKey = `${key}:${Math.floor(now / 86_400_000)}`;
  return hit(dayKey, limit, msUntilUtcMidnight(now));
}

/** Free-tier daily AI-call budget per user (override with AI_DAILY_QUOTA). */
export const AI_DAILY_QUOTA = Number(process.env.AI_DAILY_QUOTA) || 25;
