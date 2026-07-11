import { createServerClient } from '@/lib/supabase/client';

export async function getInterviewLogs(userId: string) {
  const db = createServerClient();
  const { data, error } = await db.from('interview_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('getInterviewLogs error:', error); return []; }
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
  const db = createServerClient();
  const { data, error } = await db.from('interview_logs').insert({
    user_id: userId,
    ...log,
  }).select().single();
  if (error) { console.error('createInterviewLog error:', error); return null; }
  return data;
}
