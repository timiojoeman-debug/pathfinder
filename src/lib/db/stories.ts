import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export async function getStories(userId: string) {
  const db = getServerDb();
  if (!db) return [];
  const { data, error } = await db.from('interview_stories').select('*').eq('user_id', userId);
  if (error) { logger.error('getStories failed', { userId, error: error.message }); return []; }
  return data || [];
}

export async function createStory(userId: string, story: {
  category: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  mapped_questions?: string[];
}) {
  const db = getServerDb();
  if (!db) return null;
  const { data, error } = await db.from('interview_stories').insert({
    user_id: userId,
    ...story,
  }).select().single();
  if (error) { logger.error('createStory failed', { userId, error: error.message }); return null; }
  return data;
}

export async function updateStory(userId: string, storyId: string, updates: Record<string, unknown>) {
  const db = getServerDb();
  if (!db) return false;
  const { error } = await db.from('interview_stories').update(updates).eq('id', storyId).eq('user_id', userId);
  if (error) { logger.error('updateStory failed', { userId, error: error.message }); return false; }
  return true;
}
