import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export async function getProfile(userId: string) {
  const db = getServerDb();
  if (!db) return null;
  const { data, error } = await db.from('profiles').select('*').eq('user_id', userId).single();
  if (error) { logger.error('getProfile failed', { userId, error: error.message }); return null; }
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const db = getServerDb();
  if (!db) return false;
  const { error } = await db.from('profiles').update(updates).eq('user_id', userId);
  if (error) { logger.error('updateProfile failed', { userId, error: error.message }); return false; }
  return true;
}

export async function updateDirection(userId: string, statement: string, score: number, preferences: Record<string, unknown>) {
  const db = getServerDb();
  if (!db) return false;
  const { error } = await db.from('profiles').update({
    direction_statement: statement,
    direction_score: score,
    career_preferences: preferences,
  }).eq('user_id', userId);
  if (error) { logger.error('updateDirection failed', { userId, error: error.message }); return false; }
  return true;
}
