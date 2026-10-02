import { createHash } from 'node:crypto';
import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Stable key order, trimmed + lowercased strings (a repeat that differs only
 *  in case or padding should hit), and undefined fields dropped. Array order is
 *  kept: it can be meaningful (shortlist ranking). */
function canonical(v: unknown): unknown {
  if (typeof v === 'string') return v.trim().toLowerCase();
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, x]) => [k, canonical(x)]),
    );
  }
  return v;
}

export function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(body))).digest('hex');
}

/** Fresh cached response, or null on a miss, expiry, no database, or any
 *  failure. Never throws: a cache problem must not break the route. */
export async function getCachedAi<T = unknown>(userId: string, route: string, body: unknown): Promise<T | null> {
  try {
    const db = getServerDb();
    if (!db) return null;
    const { data, error } = await db
      .from('ai_response_cache')
      .select('response, created_at')
      .eq('user_id', userId)
      .eq('route', route)
      .eq('key_hash', hashBody(body))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    if (Date.now() - new Date(data.created_at).getTime() >= AI_CACHE_TTL_MS) return null;
    return data.response as T;
  } catch (e) {
    logger.warn('ai-cache read failed', { route, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

/** Store a successful, validated AI result. Never throws. Callers must not pass
 *  a fallback or degraded response. */
export async function setCachedAi(userId: string, route: string, body: unknown, response: unknown): Promise<void> {
  try {
    const db = getServerDb();
    if (!db) return;
    const { error } = await db.from('ai_response_cache').upsert({
      user_id: userId,
      route,
      key_hash: hashBody(body),
      response,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    logger.warn('ai-cache write failed', { route, error: e instanceof Error ? e.message : String(e) });
  }
}
