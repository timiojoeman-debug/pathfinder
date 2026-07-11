import { createServerClient } from '@/lib/supabase/client';

export async function getProfile(userId: string) {
  const db = createServerClient();
  const { data, error } = await db.from('profiles').select('*').eq('user_id', userId).single();
  if (error) { console.error('getProfile error:', error); return null; }
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const db = createServerClient();
  const { error } = await db.from('profiles').update(updates).eq('user_id', userId);
  if (error) { console.error('updateProfile error:', error); return false; }
  return true;
}

export async function updateDirection(userId: string, statement: string, score: number, preferences: Record<string, unknown>) {
  const db = createServerClient();
  const { error } = await db.from('profiles').update({
    direction_statement: statement,
    direction_score: score,
    career_preferences: preferences,
  }).eq('user_id', userId);
  if (error) { console.error('updateDirection error:', error); return false; }
  return true;
}
