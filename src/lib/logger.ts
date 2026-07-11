/**
 * Structured logging + error-capture seam.
 *
 * Server code logs through this instead of raw `console.*` so that (a) output is
 * levelled and greppable, and (b) there is a single place to forward errors to a
 * tracker. Wiring Sentry is now a one-file change: `npm i @sentry/nextjs`, then
 * set `captureException` below to `Sentry.captureException`. Until a DSN is set,
 * errors are logged locally — never silently swallowed.
 */

type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN: Level = (process.env.LOG_LEVEL as Level) || (process.env.NODE_ENV === "production" ? "info" : "debug");

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
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};

/**
 * Report an unexpected error. Replace the body with `Sentry.captureException`
 * once the SDK is installed; the call sites don't change.
 */
export function captureException(err: unknown, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error(message, { ...context, stack });
}
