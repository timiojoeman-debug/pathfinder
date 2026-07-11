import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export async function getContacts(userId: string) {
  const db = getServerDb();
  if (!db) return [];
  const { data, error } = await db.from('networking_contacts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { logger.error('getContacts failed', { userId, error: error.message }); return []; }
  return data || [];
}

export async function createContact(userId: string, contact: {
  name: string;
  company: string;
  role: string;
  contact_type: string;
  linkedin_url?: string;
  email?: string;
}) {
  const db = getServerDb();
  if (!db) return null;
  const { data, error } = await db.from('networking_contacts').insert({
    user_id: userId,
    ...contact,
  }).select().single();
  if (error) { logger.error('createContact failed', { userId, error: error.message }); return null; }
  return data;
}

export async function updateContact(userId: string, contactId: string, updates: Record<string, unknown>) {
  const db = getServerDb();
  if (!db) return false;
  const { error } = await db.from('networking_contacts').update(updates).eq('id', contactId).eq('user_id', userId);
  if (error) { logger.error('updateContact failed', { userId, error: error.message }); return false; }
  return true;
}
