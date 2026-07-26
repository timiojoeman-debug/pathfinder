// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hit, hitLocal, hitDaily, classifyRoute, isGuestAllowed, ANON_AI_DAILY_QUOTA, LIMITS } from '../rate-limit';

/**
 * The limiter was an in-memory Map, so on Vercel each serverless instance kept
 * its own counter and the real limit became (instances x limit) — 11 rapid
 * signups against production produced a single 429. These tests cover the
 * shared-store path, the fallback when it is unavailable, and the route
 * classification that decides which endpoints get the strict limit.
 */

const SUPABASE_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

/** Stand in for the Postgres counter, returning the nth hit. */
function mockStore(hits: number, resetInMs = 60_000) {
  const fn = vi.fn(async () => ({
    ok: true,
    json: async () => [{ hits, reset_at: new Date(Date.now() + resetInMs).toISOString() }],
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('rate limiting', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    for (const k of SUPABASE_KEYS) delete process.env[k];
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // Safety net: a test that installs fake timers and then fails an assertion
    // would otherwise leak the frozen clock into every test after it. No-op
    // when real timers are already active.
    vi.useRealTimers();
  });

  describe('route classification', () => {
    it('puts credential endpoints in the strict auth bucket', () => {
      expect(classifyRoute('/api/auth/login')).toBe('auth');
      expect(classifyRoute('/api/auth/signup')).toBe('auth');
      expect(classifyRoute('/api/auth/password-reset/request')).toBe('auth');
      expect(LIMITS.auth.limit).toBe(10);
    });

    it('does NOT throttle session reads at the credential limit', () => {
      // The auth store calls /api/auth/me on navigation. At 10/min a browsing
      // user would be locked out of their own session — survivable only while
      // the per-instance limiter rarely fired.
      expect(classifyRoute('/api/auth/me')).toBe('api');
      expect(classifyRoute('/api/auth/logout')).toBe('api');
      expect(LIMITS.api.limit).toBeGreaterThan(LIMITS.auth.limit);
    });

    it('routes AI endpoints to the ai bucket', () => {
      expect(classifyRoute('/api/cv/analyze')).toBe('ai');
      expect(classifyRoute('/api/networking/outreach')).toBe('ai');
      expect(classifyRoute('/api/interview/questions')).toBe('ai');
      expect(classifyRoute('/api/mentor/chat')).toBe('ai');
      expect(classifyRoute('/api/mentor/narrate')).toBe('ai');
    });

    it('keeps /api/profile out of the ai bucket despite the mentor routes', () => {
      // The mentor lives under /api/mentor/ precisely so profile read/write —
      // which is not an AI call and should not spend the AI quota — keeps the
      // general limit.
      expect(classifyRoute('/api/profile')).toBe('api');
    });

    it('falls back to the general bucket for everything else', () => {
      expect(classifyRoute('/api/profile')).toBe('api');
      expect(classifyRoute('/api/health')).toBe('api');
    });
  });

  describe('guest access', () => {
    it('opens job search to logged-out visitors', () => {
      // Phase pages work logged out; job search touches no user data, so a
      // guest shouldn't hit a 401 just for searching.
      expect(isGuestAllowed('/api/jobs/search')).toBe(true);
    });

    it('keeps AI generators and account routes behind login', () => {
      expect(isGuestAllowed('/api/jobs/analyze')).toBe(false);
      expect(isGuestAllowed('/api/cv/analyze')).toBe(false);
      expect(isGuestAllowed('/api/networking/outreach')).toBe(false);
      expect(isGuestAllowed('/api/mentor/chat')).toBe(false);
      expect(isGuestAllowed('/api/profile')).toBe(false);
      expect(isGuestAllowed('/api/account/export')).toBe(false);
    });

    it('meters guests below the signed-in daily quota to protect provider cost', () => {
      expect(ANON_AI_DAILY_QUOTA).toBeGreaterThan(0);
      expect(ANON_AI_DAILY_QUOTA).toBeLessThan(Number(process.env.AI_DAILY_QUOTA) || 60);
    });
  });

  describe('shared store', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    });

    it('allows a request under the limit and reports it as shared', async () => {
      mockStore(3);
      const r = await hit('ip:auth', 10, 60_000);
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(7);
      expect(r.shared).toBe(true);
    });

    it('blocks once the shared count exceeds the limit', async () => {
      mockStore(11);
      const r = await hit('ip:auth', 10, 60_000);
      expect(r.ok).toBe(false);
      expect(r.remaining).toBe(0);
      expect(r.retryAfter).toBeGreaterThan(0);
    });

    it('counts the limit-th request as allowed, not blocked', async () => {
      mockStore(10);
      expect((await hit('ip:auth', 10, 60_000)).ok).toBe(true);
    });

    it('sends the service-role key, never the anon key', async () => {
      const fn = mockStore(1);
      await hit('ip:auth', 10, 60_000);
      const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain('/rest/v1/rpc/rate_limit_hit');
      expect((init.headers as Record<string, string>).apikey).toBe('service-key');
    });
  });

  describe('degradation', () => {
    it('falls back to per-instance counting when Supabase is not configured', async () => {
      const fn = vi.fn();
      vi.stubGlobal('fetch', fn);
      const r = await hit(`unconfigured-${Date.now()}`, 10, 60_000);
      expect(r.shared).toBe(false);
      expect(r.ok).toBe(true);
      // No credentials means no pointless network call.
      expect(fn).not.toHaveBeenCalled();
    });

    it('falls back rather than failing the request when the store errors', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

      const r = await hit(`store-down-${Date.now()}`, 10, 60_000);
      // A limiter whose storage is down must not take the site down with it.
      expect(r.ok).toBe(true);
      expect(r.shared).toBe(false);
    });

    it('falls back when the store returns a malformed row', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [{}] })));

      const r = await hit(`malformed-${Date.now()}`, 10, 60_000);
      expect(r.shared).toBe(false);
      expect(r.ok).toBe(true);
    });
  });

  describe('per-instance counter', () => {
    it('counts up and blocks past the limit', () => {
      const key = `local-${Date.now()}`;
      for (let i = 0; i < 3; i++) expect(hitLocal(key, 3, 60_000).ok).toBe(true);
      expect(hitLocal(key, 3, 60_000).ok).toBe(false);
    });

    it('resets once the window passes', () => {
      // Freeze the clock for the whole test. The window is 1ms, so on the real
      // clock the first two calls can straddle it under load — the window
      // resets between them and the second wrongly succeeds. That was the flake.
      // With time frozen, both calls land in the same window deterministically.
      vi.useFakeTimers();
      try {
        const start = Date.now();
        const key = `window-${start}`;
        expect(hitLocal(key, 1, 1).ok).toBe(true);
        expect(hitLocal(key, 1, 1).ok).toBe(false);
        // Advance well past the 1ms window; the counter resets.
        vi.setSystemTime(start + 5_000);
        expect(hitLocal(key, 1, 1).ok).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('daily AI quota', () => {
    it('namespaces the key by UTC day so yesterday cannot be inherited', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
      const fn = mockStore(1);

      await hitDaily('aiq:user-1', 60);

      const body = JSON.parse((fn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
      const today = Math.floor(Date.now() / 86_400_000);
      expect(body.p_key).toBe(`aiq:user-1:${today}`);
      // The window must expire at the next UTC midnight, never longer than a day.
      expect(body.p_window_ms).toBeGreaterThan(0);
      expect(body.p_window_ms).toBeLessThanOrEqual(86_400_000);
    });
  });
});
