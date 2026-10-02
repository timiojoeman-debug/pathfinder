import { getServerDb } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { UK_CITY_NAMES, UK_COUNTRY_WORDS, type JobListing } from '@/lib/jobs/types';

/**
 * PostgREST `or` filter for UK-ish locations. In `or=(...)` the characters `,` and `()` are syntax,
 * so these terms must stay constants: never build this from user input.
 */
const UK_SQL_FILTER = [...UK_COUNTRY_WORDS, ...UK_CITY_NAMES, 'remote']
  .map((t) => `location.ilike.*${t}*`)
  .join(',');

/**
 * Rows read per search. PostgREST caps a response at 1000 rows by default, so that is the real
 * ceiling whatever number is asked for here. Rows come newest first, so the cap drops the oldest
 * roles. Active and location are filtered in SQL so the cap bites less; role, industry and work
 * mode are matched afterwards by filterListings.
 */
const READ_LIMIT = 1000;

type Row = {
  id: string;
  source: string;
  employer: string;
  title: string;
  location: string;
  work_mode: string;
  url: string;
  posted_at: string | null;
};

/** Active cached roles, newest first, optionally narrowed to a location substring. Returns [] when Supabase is unconfigured or the read fails. */
export async function getActiveListings(opts: { location?: string; ukOnly?: boolean } = {}): Promise<JobListing[]> {
  const db = getServerDb();
  if (!db) return [];
  let q = db
    .from('job_listings')
    .select('id, source, employer, title, location, work_mode, url, posted_at')
    .eq('active', true);
  const loc = (opts.location ?? '').trim();
  // Escape LIKE wildcards so a typed % or _ is literal, matching filterListings' substring test.
  if (loc) q = q.ilike('location', `%${loc.replace(/[\\%_]/g, '\\$&')}%`);
  // UK-only with no explicit location: narrow in SQL too, so older UK roles are not cut by the
  // row cap behind newer non-UK ones. A superset on purpose ("uk" also matches "duke"); the exact
  // test is isUkLocation, applied afterwards.
  else if (opts.ukOnly) q = q.or(UK_SQL_FILTER);
  const { data, error } = await q
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(READ_LIMIT);
  if (error) {
    logger.error('getActiveListings failed', { error: error.message });
    return [];
  }
  return (data as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    company: r.employer,
    location: r.location || 'Location not stated',
    workMode: r.work_mode || 'Not stated',
    source: `${r.employer} careers`,
    description: '',
    url: r.url,
    matchScore: null,
    atsKeywords: [],
    postedAt: r.posted_at,
  }));
}

/**
 * Make one employer's cached rows match what its board returned: upsert the
 * returned roles as active and close the employer's active rows that were not
 * returned. Call it ONLY after a successful fetch of that board; an employer
 * whose fetch failed must keep its roles open. Returns null on a database
 * failure (the caller counts the employer as failed), else the counts.
 */
export async function syncEmployerListings(
  source: string,
  employer: string,
  listings: JobListing[],
): Promise<{ upserted: number; closed: number } | null> {
  const db = getServerDb();
  if (!db) {
    logger.error('syncEmployerListings: no database configured', { employer });
    return null;
  }
  const now = new Date().toISOString();
  // One row per URL: a duplicate inside one upsert batch is a Postgres error.
  const byUrl = new Map(listings.map((l) => [l.url, l]));
  const rows = [...byUrl.values()].map((l) => ({
    source,
    employer,
    title: l.title,
    location: l.location,
    work_mode: l.workMode,
    url: l.url,
    posted_at: l.postedAt ?? null,
    fetched_at: now,
    active: true,
  }));

  if (rows.length) {
    const { error } = await db.from('job_listings').upsert(rows, { onConflict: 'url' });
    if (error) {
      logger.error('syncEmployerListings: upsert failed', { employer, error: error.message });
      return null;
    }
  }

  const { data: open, error: readErr } = await db
    .from('job_listings')
    .select('url')
    .eq('source', source)
    .eq('employer', employer)
    .eq('active', true);
  if (readErr) {
    logger.error('syncEmployerListings: read failed', { employer, error: readErr.message });
    return null;
  }
  const gone = (open as { url: string }[]).map((r) => r.url).filter((u) => !byUrl.has(u));
  // Chunked: the URLs ride in the PostgREST query string, which has a length limit.
  for (let i = 0; i < gone.length; i += 50) {
    const { error } = await db
      .from('job_listings')
      .update({ active: false, fetched_at: now })
      .in('url', gone.slice(i, i + 50));
    if (error) {
      logger.error('syncEmployerListings: close failed', { employer, error: error.message });
      return null;
    }
  }
  return { upserted: rows.length, closed: gone.length };
}
