import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readBody } from '@/lib/api';
import { recordPilotInterest } from '@/lib/db/pilot-interest';
import { hitDaily } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * Pilot enquiries from /universities.
 *
 * Public by design — the people this page is for do not have accounts, and
 * requiring one to say "we're interested" is the conversion path failing in a
 * different way. It is on the middleware public allowlist and classified into
 * the strict `auth` bucket (10/min per IP), because an unauthenticated write is
 * abuse-prone in a way a read is not.
 *
 * It touches no OpenAI route and costs nothing per call, so the guest-tier
 * warning in CLAUDE.md about per-IP cost caps does not apply. The daily cap
 * below is anti-spam, not anti-spend: without it a single IP could fill the
 * table overnight inside the per-minute limit.
 */

/** Enquiries per IP per day. A careers team submits once, maybe twice if they
 *  mistype an address; anything past this is not a university. */
const PILOT_DAILY_CAP = 5;

const Body = z.object({
  institution: z.string().trim().min(2, 'Institution is required.').max(200),
  contactName: z.string().trim().min(2, 'Your name is required.').max(120),
  /* Zod's email check only. No existence or deliverability claim is made
     anywhere in the UI, so the copy must not imply one. */
  email: z.string().trim().email('Enter a valid email address.').max(200),
  role: z.string().trim().max(120).optional(),
  cohortSize: z.string().trim().max(60).optional(),
  note: z.string().trim().max(2000).optional(),
});

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: Request) {
  const parsed = await readBody(req, Body);
  if (!parsed.ok) return parsed.response;

  const quota = await hitDaily(`${clientIp(req)}:pilot-interest`, PILOT_DAILY_CAP);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "That's several enquiries from this connection today. Email us instead and we'll pick it up." },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } },
    );
  }

  const { institution, contactName, email, role, cohortSize, note } = parsed.data;
  const stored = await recordPilotInterest({
    institution,
    contact_name: contactName,
    email,
    role,
    cohort_size: cohortSize,
    note,
  });

  /* A 500 on failure, deliberately, and never a cheerful 200. The page this
     serves exists because five buttons once looked like they worked and went
     nowhere; answering "thanks, we'll be in touch" over a failed insert would
     rebuild exactly that. */
  if (!stored) {
    logger.error('pilot-interest: enquiry not stored', { institution });
    return NextResponse.json(
      { error: "We couldn't record that just now. Please try again shortly." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
