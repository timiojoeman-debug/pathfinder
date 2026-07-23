/**
 * Structured logging + error tracking.
 *
 * Server code logs through this instead of raw `console.*` so that output is
 * levelled and greppable, and so there is a single place to forward errors.
 *
 * Errors are also persisted to the `error_events` table. Before that, a
 * production failure existed only as a line in Vercel's log stream — invisible
 * unless somebody happened to be tailing it, which is how a silently failing
 * mentor engine went unnoticed and how a blocked rate-limit insert left no
 * trace at all. Persisting them makes "what is breaking in production?" a
 * query rather than an archaeology exercise.
 *
 * This is not a full APM: no alerting, no release tracking, no grouping beyond
 * the message. The `captureException` seam below stays, so dropping in
 * `@sentry/nextjs` later remains a one-file change.
 */

type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN: Level = (process.env.LOG_LEVEL as Level) || (process.env.NODE_ENV === "production" ? "info" : "debug");

/* ── Error persistence ─────────────────────────────────────────────────── */

/** Keys whose values must never reach storage, however they arrive. */
const SENSITIVE_KEY = /token|secret|password|passwd|api[-_]?key|authorization|cookie|credential/i;

/**
 * Errors get persisted, so context is redacted first. Call sites pass
 * hand-picked fields today, but a future one only has to include a reset token
 * or an auth header once for it to sit in a table indefinitely.
 */
function redact(meta: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!meta) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : v;
  }
  return out;
}

/**
 * Guards the obvious deadly loop: persisting an error fails, we log that
 * failure, which tries to persist... Anything raised while reporting goes to
 * the console only.
 */
let reporting = false;

const REPORT_TIMEOUT_MS = 2000;

function trackerConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Fire-and-forget write to `error_events`.
 *
 * Never awaited and never throws: failing to record an error must not become a
 * second error, and must never slow or fail the request that produced it. A
 * plain fetch to PostgREST keeps this usable from the Edge runtime as well as
 * Node.
 */
function persistError(message: string, meta?: Record<string, unknown>): void {
  if (reporting) return;
  const cfg = trackerConfig();
  if (!cfg) return; // local dev / CI: the console line is the record

  reporting = true;
  void fetch(`${cfg.url}/rest/v1/rpc/record_error`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({ p_message: message, p_context: redact(meta) }),
    cache: "no-store",
    signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
  })
    .catch(() => {
      // Deliberately swallowed — see the note on `reporting` above.
    })
    .finally(() => {
      reporting = false;
    });
}

/* ── Logging ───────────────────────────────────────────────────────────── */

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[MIN]) return;
  const line = { level, msg, ts: new Date().toISOString(), ...(meta ?? {}) };
  // Structured single-line JSON is trivially parsed by log drains.
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(JSON.stringify(line));
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => {
    emit("error", msg, meta);
    // Hooked here rather than at the ~44 call sites: every existing
    // logger.error is tracked automatically, and so is every new one.
    persistError(msg, meta);
  },
};

/**
 * Report an unexpected error object. Unwraps message and stack, then goes
 * through `logger.error`, so it is logged and tracked like everything else.
 */
export function captureException(err: unknown, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error(message, { ...context, stack });
}
