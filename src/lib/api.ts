import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Request-body validation for route handlers.
 *
 * `readBody` enforces a hard size cap, parses JSON safely (400 instead of a
 * thrown 500 on malformed input), and validates the shape against a Zod schema
 * (400 with a readable message). Every route that accepts a body should use it,
 * so no unbounded or malformed payload ever reaches the LLM/database layer.
 */

const MAX_BODY_BYTES = 100_000; // 100 KB — generous for CV/JD text, caps abuse

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<Parsed<T>> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: "Request too large." }, { status: 413 }) };
  }
  let json: unknown;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 }) };
  }
  return { ok: true, data: parsed.data };
}

/* ── Reusable bounded field schemas ─────────────────────────────────────── */

/** Long free-text (CV, job description) — bounded to prevent runaway payloads. */
export const zText = (max = 20_000) => z.string().max(max, `Text too long (max ${max} characters).`);
/** Short free-text (titles, names, single answers). */
export const zShort = (max = 500) => z.string().max(max);
/** A permissive-but-bounded object for routes without a precise schema yet —
 *  still gets the size cap + JSON guard from readBody. */
export const zLooseObject = z.record(z.string(), z.unknown());

/**
 * Guard a body that doesn't have a precise schema yet: enforces the size cap +
 * JSON-object shape, but returns loosely-typed data so existing field access
 * keeps working. Every route gets malformed-input and oversize protection even
 * before a full schema is written.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readLoose(req: Request): Promise<{ ok: true; data: any } | { ok: false; response: NextResponse }> {
  const p = await readBody(req, zLooseObject);
  if (!p.ok) return p;
  return { ok: true, data: p.data as Record<string, unknown> };
}
