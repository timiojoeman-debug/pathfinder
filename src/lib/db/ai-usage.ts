import { after } from 'next/server';
import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export type AiUsageEntry = {
  userId?: string | null;
  route?: string | null;
  model: string;
  /** The `usage` object of an OpenAI response (chat or embeddings). */
  usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined;
};

/**
 * Run `task` after the response is sent, keeping the serverless invocation
 * alive until it finishes (a bare floating promise can be frozen mid-insert on
 * Vercel). `after` throws outside a request scope (tests, scripts), where a
 * plain fire-and-forget is fine.
 */
export function keepAlive(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

/**
 * Record the cost of one OpenAI call: model + token counts, nothing else.
 * No prompt or response text is ever stored — the row carries only what the
 * response's `usage` field reports.
 *
 * Fire-and-forget by contract: never throws and never rejects, so a failed
 * insert (or an unconfigured database) cannot fail the AI call it describes.
 * Callers should not await it on the request path.
 */
export async function recordAiUsage(entry: AiUsageEntry): Promise<void> {
  try {
    const { usage } = entry;
    if (!usage || typeof usage.prompt_tokens !== 'number') return;
    const db = getServerDb();
    if (!db) return;
    const { error } = await db.from('ai_usage').insert({
      user_id: entry.userId ?? null,
      route: entry.route || 'unknown',
      model: entry.model,
      input_tokens: usage.prompt_tokens,
      // Embeddings responses report no completion tokens.
      output_tokens: usage.completion_tokens ?? 0,
    });
    // warn, not error: logger.error persists to error_events, and a failing
    // cost log must not flood the error table.
    if (error) logger.warn('recordAiUsage failed', { error: error.message });
  } catch (e) {
    logger.warn('recordAiUsage failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
