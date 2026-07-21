import { NextResponse } from 'next/server';

/** A health probe must reflect live state, never a cached response. */
export const dynamic = 'force-dynamic';

/** Don't let a hanging dependency hang the uptime probe. */
const PROBE_TIMEOUT_MS = 5000;

async function probeOk(url: string, headers: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkOpenAI(): Promise<boolean> {
  const key = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!key) return false;
  return probeOk('https://api.openai.com/v1/models', { Authorization: `Bearer ${key}` });
}

/**
 * The previous probe hit `/rest/v1/` with the anon key and could never succeed:
 * PostgREST rejects that endpoint for anything but the service role
 * ("Only the `service_role` API key can be used for this endpoint"), so health
 * reported `supabase: false` while signups were demonstrably writing real rows.
 *
 * Probe the way the app actually reaches Supabase — server-side with the
 * service-role key, which exercises PostgREST and the database together. When
 * no service key is configured, fall back to the GoTrue health endpoint, which
 * the anon key *is* allowed to read.
 */
async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return probeOk(`${url}/rest/v1/`, {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    });
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    return probeOk(`${url}/auth/v1/health`, { apikey: anonKey });
  }

  return false;
}

export async function GET() {
  const [openai, supabase] = await Promise.all([checkOpenAI(), checkSupabase()]);
  return NextResponse.json({ openai, supabase, version: '0.1.0' });
}
