import { createServerClient } from '@/lib/supabase/client';

export async function storeInteraction(userId: string, interaction: {
  feature: string;
  input_quality: string;
  methodology_applied: string;
  score?: number;
  input_summary: string;
  output_summary: string;
  feedback_items_count: number;
}) {
  const db = createServerClient();
  const { error } = await db.from('ai_interactions').insert({
    user_id: userId,
    ...interaction,
  });
  if (error) { console.error('storeInteraction error:', error); return false; }
  return true;
}

export async function getInteractionHistory(userId: string, feature: string, limit = 3) {
  const db = createServerClient();
  const { data, error } = await db.from('ai_interactions')
    .select('input_quality, score, output_summary, created_at')
    .eq('user_id', userId)
    .eq('feature', feature)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getInteractionHistory error:', error); return []; }
  return data || [];
}
