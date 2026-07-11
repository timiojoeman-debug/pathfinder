import { createServerClient } from '@/lib/supabase/client';

export async function getCV(userId: string) {
  const db = createServerClient();
  const { data, error } = await db.from('cvs').select('*').eq('user_id', userId).eq('is_master', true).single();
  if (error) { console.error('getCV error:', error); return null; }
  return data;
}

export async function saveParsedCV(userId: string, parsedData: Record<string, unknown>, analysisResults: Record<string, unknown>) {
  const db = createServerClient();
  // Upsert: update if master CV exists, else insert
  const existing = await getCV(userId);
  if (existing) {
    const { error } = await db.from('cvs').update({
      parsed_data: parsedData,
      analysis_results: analysisResults,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
    if (error) { console.error('saveParsedCV update error:', error); return false; }
  } else {
    const { error } = await db.from('cvs').insert({
      user_id: userId,
      parsed_data: parsedData,
      analysis_results: analysisResults,
      is_master: true,
    });
    if (error) { console.error('saveParsedCV insert error:', error); return false; }
  }
  return true;
}

export async function getCVAnalysis(userId: string) {
  const cv = await getCV(userId);
  if (!cv) return null;
  return cv.analysis_results as Record<string, unknown> | null;
}
