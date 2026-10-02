import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { logger } from '@/lib/logger';
import { EMPLOYERS } from '@/lib/jobs/employers';
import { fetchEmployerListings } from '@/lib/jobs/ats';
import { syncEmployerListings } from '@/lib/db/job-listings';

// ~175 boards, a few at a time; each fetch has its own timeout and one retry.
export const maxDuration = 300;
const CONCURRENCY = 5;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unset means closed, never open
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * Daily refresh of the job cache (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
 * Public in middleware, so the secret is the only gate.
 *
 * Failures are isolated per employer, and an employer whose fetch failed is left
 * untouched: a flaky board must not close its roles. Only a board we read
 * successfully gets its vanished roles marked inactive.
 */
export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let upserted = 0;
  let closed = 0;
  const failed: string[] = [];
  let next = 0;

  async function worker() {
    while (next < EMPLOYERS.length) {
      const e = EMPLOYERS[next++];
      try {
        const listings = await fetchEmployerListings(e);
        const result = await syncEmployerListings(e.ats, e.name, listings);
        if (!result) {
          failed.push(e.name);
          continue;
        }
        upserted += result.upserted;
        closed += result.closed;
      } catch (err) {
        failed.push(e.name);
        logger.error('cron/refresh-jobs — employer fetch failed', {
          employer: e.name,
          ats: e.ats,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return NextResponse.json({ employers: EMPLOYERS.length, upserted, closed, failed });
}
