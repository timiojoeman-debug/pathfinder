// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '../route';

/**
 * The health endpoint must never throw and must report false (not error) when
 * integrations aren't configured — it's the deploy/uptime probe.
 *
 * It also has to probe Supabase somewhere that can actually answer. The first
 * version hit `/rest/v1/` with the anon key, which PostgREST rejects for
 * anything but the service role, so health reported `supabase: false` on a
 * perfectly healthy project while signups were writing real rows.
 */

const SUPABASE_URL = 'https://example-project.supabase.co';

/** Record every probe so tests can assert *where* health looked. */
function mockFetch(handler: (url: string, init?: RequestInit) => { ok: boolean }) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const { ok } = handler(url, init);
    return { ok, status: ok ? 200 : 401 } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

describe('GET /api/health', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 200 with version and false checks when nothing is configured', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ openai: false, supabase: false, version: '0.1.0' });
  });

  it('reports supabase healthy by probing with the service-role key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    const calls = mockFetch(() => ({ ok: true }));

    const body = await (await GET()).json();
    expect(body.supabase).toBe(true);

    const probe = calls.find((c) => c.url.startsWith(SUPABASE_URL));
    expect(probe!.url).toBe(`${SUPABASE_URL}/rest/v1/`);
    expect(probe!.headers.apikey).toBe('service-key');
  });

  it('never probes /rest/v1/ with the anon key — that endpoint always 401s', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    // PostgREST's root rejects the anon key; only GoTrue's health answers it.
    const calls = mockFetch((url) => ({ ok: !url.endsWith('/rest/v1/') }));

    const body = await (await GET()).json();

    const restProbe = calls.find((c) => c.url.endsWith('/rest/v1/'));
    expect(restProbe).toBeUndefined();
    expect(body.supabase).toBe(true);
  });

  it('falls back to the GoTrue health endpoint when no service key is set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const calls = mockFetch(() => ({ ok: true }));

    await GET();
    const probe = calls.find((c) => c.url.startsWith(SUPABASE_URL));
    expect(probe!.url).toBe(`${SUPABASE_URL}/auth/v1/health`);
    expect(probe!.headers.apikey).toBe('anon-key');
  });

  it('reports false instead of throwing when a probe fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ openai: false, supabase: false, version: '0.1.0' });
  });
});
