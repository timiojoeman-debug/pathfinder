import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export type PilotInterest = {
  institution: string;
  contact_name: string;
  email: string;
  role?: string | null;
  cohort_size?: string | null;
  note?: string | null;
  source?: string;
};

/**
 * Record one pilot enquiry from the universities page.
 *
 * Returns false rather than throwing when Supabase is unconfigured or the
 * insert fails, so the route can answer honestly ("we couldn't record that")
 * instead of pretending it worked. A silent success here would be the same
 * failure the page was built to remove: a control that looks like it does
 * something and does not.
 */
export async function recordPilotInterest(entry: PilotInterest): Promise<boolean> {
  const db = getServerDb();
  if (!db) {
    logger.error('recordPilotInterest: no database configured', { institution: entry.institution });
    return false;
  }
  const { error } = await db.from('pilot_interest').insert({
    institution: entry.institution,
    contact_name: entry.contact_name,
    email: entry.email,
    role: entry.role ?? null,
    cohort_size: entry.cohort_size ?? null,
    note: entry.note ?? null,
    source: entry.source ?? 'universities',
  });
  if (error) {
    // No email address in the log line: this is a named individual at an
    // identifiable institution, and logger.error persists to error_events.
    logger.error('recordPilotInterest failed', { institution: entry.institution, error: error.message });
    return false;
  }
  return true;
}
