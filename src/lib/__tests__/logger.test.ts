// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, captureException } from '../logger';

/**
 * Production errors used to exist only as lines in Vercel's log stream —
 * invisible unless someone was tailing them, which is how a silently failing
 * mentor engine went unnoticed. `logger.error` now also persists to
 * `error_events`. These tests cover the guarantees that matter: it records,
 * it redacts, and it can never take down the request that produced the error.
 */

const SUPABASE_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

/** The persist call is fire-and-forget; let its microtask settle. */
const flush = () => new Promise((r) => setTimeout(r, 0));

function bodyOf(fn: ReturnType<typeof vi.fn>, call = 0) {
  const init = (fn.mock.calls[call] as unknown as [string, RequestInit])[1];
  return JSON.parse(init.body as string);
}

describe('logger error tracking', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('persists an error with its message and context', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => null }));
    vi.stubGlobal('fetch', fetchMock);

    logger.error('Login failed', { userId: 'u1' });
    await flush();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('/rest/v1/rpc/record_error');
    expect(bodyOf(fetchMock)).toEqual({
      p_message: 'Login failed',
      p_context: { userId: 'u1' },
    });
  });

  it('redacts anything that looks like a credential', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => null }));
    vi.stubGlobal('fetch', fetchMock);

    logger.error('Reset failed', {
      userId: 'u1',
      resetToken: 'super-secret',
      authorization: 'Bearer abc',
      apiKey: 'sk-123',
      note: 'kept',
    });
    await flush();

    const ctx = bodyOf(fetchMock).p_context;
    expect(ctx.resetToken).toBe('[redacted]');
    expect(ctx.authorization).toBe('[redacted]');
    expect(ctx.apiKey).toBe('[redacted]');
    // Non-sensitive fields survive, or the record would be useless.
    expect(ctx.userId).toBe('u1');
    expect(ctx.note).toBe('kept');
  });

  it('does not persist non-error levels', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    logger.info('routine');
    logger.warn('degraded');
    logger.debug('noisy');
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when the tracker is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    // Failing to record an error must not become a second error.
    expect(() => logger.error('Something broke')).not.toThrow();
    await flush();
  });

  it('still logs to the console when Supabase is unconfigured', async () => {
    for (const k of SUPABASE_KEYS) delete process.env[k];
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    logger.error('Local failure');
    await flush();

    // No credentials means no pointless network call, but the line is still logged.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('captureException unwraps the error and records the stack', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => null }));
    vi.stubGlobal('fetch', fetchMock);

    captureException(new Error('boom'), { route: '/api/thing' });
    await flush();

    const body = bodyOf(fetchMock);
    expect(body.p_message).toBe('boom');
    expect(body.p_context.route).toBe('/api/thing');
    expect(typeof body.p_context.stack).toBe('string');
  });
});
