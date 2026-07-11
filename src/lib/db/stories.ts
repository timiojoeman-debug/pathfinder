import { createServerClient } from '@/lib/supabase/client';

export async function getStories(userId: string) {
  const db = createServerClient();
  const { data, error } = await db.from('interview_stories').select('*').eq('user_id', userId);
  if (error) { console.error('getStories error:', error); return []; }
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
  const db = createServerClient();
  const { data, error } = await db.from('interview_stories').insert({
    user_id: userId,
    ...story,
  }).select().single();
  if (error) { console.error('createStory error:', error); return null; }
  return data;
}

export async function updateStory(userId: string, storyId: string, updates: Record<string, unknown>) {
  const db = createServerClient();
  const { error } = await db.from('interview_stories').update(updates).eq('id', storyId).eq('user_id', userId);
  if (error) { console.error('updateStory error:', error); return false; }
  return true;
}
