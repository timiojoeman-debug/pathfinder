import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export async function getInterviewLogs(userId: string) {
  const db = getServerDb();
  if (!db) return [];
  const { data, error } = await db.from('interview_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { logger.error('getInterviewLogs failed', { userId, error: error.message }); return []; }
  return data || [];
}

export async function createInterviewLog(userId: string, log: {
  interview_type: string;
  questions_asked?: string[];
  self_ratings?: Record<string, number>;
  went_well?: string;
  would_change?: string;
  ai_feedback?: string;
}) {
  const db = getServerDb();
  if (!db) return null;
  const { data, error } = await db.from('interview_logs').insert({
    user_id: userId,
    ...log,
  }).select().single();
  if (error) { logger.error('createInterviewLog failed', { userId, error: error.message }); return null; }
  return data;
}
