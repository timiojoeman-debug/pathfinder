import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { ApplicationStatus } from '@/types/database';

export async function getApplications(userId: string) {
  const db = getServerDb();
  if (!db) return [];
  const { data, error } = await db.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { logger.error('getApplications failed', { userId, error: error.message }); return []; }
  return data || [];
}

export async function createApplication(userId: string, app: {
  company: string;
  role: string;
  jobUrl?: string;
  jobDescription?: string;
  status: ApplicationStatus;
  matchScore?: number;
  atsKeywords?: string[];
  appliedDate?: string;
  notes?: string;
}) {
  const db = getServerDb();
  if (!db) return null;
  const { data, error } = await db.from('applications').insert({
    user_id: userId,
    ...app,
    match_score: app.matchScore ?? 0,
    ats_keywords: app.atsKeywords ?? [],
    applied_date: app.appliedDate || null,
  }).select().single();
  if (error) { logger.error('createApplication failed', { userId, error: error.message }); return null; }
  return data;
}

export async function updateApplicationStatus(userId: string, appId: string, status: ApplicationStatus) {
  const db = getServerDb();
  if (!db) return false;
  const { error } = await db.from('applications').update({ status }).eq('id', appId).eq('user_id', userId);
  if (error) { logger.error('updateApplicationStatus failed', { userId, error: error.message }); return false; }
  return true;
}

export async function deleteApplication(userId: string, appId: string) {
  const db = getServerDb();
  if (!db) return false;
  const { error } = await db.from('applications').delete().eq('id', appId).eq('user_id', userId);
  if (error) { logger.error('deleteApplication failed', { userId, error: error.message }); return false; }
  return true;
}
