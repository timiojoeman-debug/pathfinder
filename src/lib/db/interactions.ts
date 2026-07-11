import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export async function storeInteraction(userId: string, interaction: {
  feature: string;
  input_quality: string;
  methodology_applied: string;
  score?: number;
  input_summary: string;
  output_summary: string;
  feedback_items_count: number;
}) {
  const db = getServerDb();
  if (!db) return false;
  const { error } = await db.from('ai_interactions').insert({
    user_id: userId,
    ...interaction,
  });
  if (error) { logger.error('storeInteraction failed', { userId, error: error.message }); return false; }
  return true;
}

export async function getInteractionHistory(userId: string, feature: string, limit = 3) {
  const db = getServerDb();
  if (!db) return [];
  const { data, error } = await db.from('ai_interactions')
    .select('input_quality, score, output_summary, created_at')
    .eq('user_id', userId)
    .eq('feature', feature)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { logger.error('getInteractionHistory failed', { userId, error: error.message }); return []; }
  return data || [];
}
