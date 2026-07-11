import { createServerClient } from '@/lib/supabase/client';
import type { ApplicationStatus } from '@/types/database';

export async function getApplications(userId: string) {
  const db = createServerClient();
  const { data, error } = await db.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('getApplications error:', error); return []; }
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
  const db = createServerClient();
  const { data, error } = await db.from('applications').insert({
    user_id: userId,
    ...app,
    match_score: app.matchScore ?? 0,
    ats_keywords: app.atsKeywords ?? [],
    applied_date: app.appliedDate || null,
  }).select().single();
  if (error) { console.error('createApplication error:', error); return null; }
  return data;
}

export async function updateApplicationStatus(userId: string, appId: string, status: ApplicationStatus) {
  const db = createServerClient();
  const { error } = await db.from('applications').update({ status }).eq('id', appId).eq('user_id', userId);
  if (error) { console.error('updateApplicationStatus error:', error); return false; }
  return true;
}

export async function deleteApplication(userId: string, appId: string) {
  const db = createServerClient();
  const { error } = await db.from('applications').delete().eq('id', appId).eq('user_id', userId);
  if (error) { console.error('deleteApplication error:', error); return false; }
  return true;
}
