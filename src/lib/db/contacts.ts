import { createServerClient } from '@/lib/supabase/client';

export async function getContacts(userId: string) {
  const db = createServerClient();
  const { data, error } = await db.from('networking_contacts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('getContacts error:', error); return []; }
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
  const db = createServerClient();
  const { data, error } = await db.from('networking_contacts').insert({
    user_id: userId,
    ...contact,
  }).select().single();
  if (error) { console.error('createContact error:', error); return null; }
  return data;
}

export async function updateContact(userId: string, contactId: string, updates: Record<string, unknown>) {
  const db = createServerClient();
  const { error } = await db.from('networking_contacts').update(updates).eq('id', contactId).eq('user_id', userId);
  if (error) { console.error('updateContact error:', error); return false; }
  return true;
}
