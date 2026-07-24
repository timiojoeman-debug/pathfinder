import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAiTask } from '../use-ai';

/**
 * The AI panels all share this hook, so a regression here breaks every
 * generate button at once — and breaks them quietly, which is the failure
 * mode this codebase keeps having to fix. The cases that matter:
 *
 *  - 401 must be a signposted state, not a red error. Every phase page works
 *    logged-out but every AI route is behind the auth cookie, so "not signed
 *    in" is the single most likely first response a real student sees.
 *  - a superseded request must not overwrite a newer one, or a slow first
 *    click lands on top of a fast second click's answer.
 *  - a failure must never leave `loading` stuck true, which would disable the
 *    button forever with no explanation.
 */

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useAiTask', () => {
  it('returns the payload and exposes it as data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { questions: [{ question: 'Why us?' }] })));

    const { result } = renderHook(() => useAiTask<{ questions: unknown[] }>('/api/interview/questions'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.run({ targetRole: 'Backend Intern' });
    });

    expect(returned).toEqual({ questions: [{ question: 'Why us?' }] });
    expect(result.current.data).toEqual({ questions: [{ question: 'Why us?' }] });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('posts the body as JSON to the given endpoint', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(200, {}));
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useAiTask('/api/interview/star-builder'));
    await act(async () => {
      await result.current.run({ category: 'challenge' });
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/interview/star-builder');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ category: 'challenge' });
  });

  it('flags a 401 as needing sign-in rather than as a failure to retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: 'Authentication required' })));

    const { result } = renderHook(() => useAiTask('/api/interview/questions'));
    await act(async () => {
      await result.current.run({});
    });

    expect(result.current.needsAuth).toBe(true);
    // The route's own wording is a dead end for a student; the hook replaces it.
    expect(result.current.error).not.toBe('Authentication required');
    expect(result.current.error).toMatch(/sign in/i);
    expect(result.current.data).toBeNull();
  });

  it('explains a 429 instead of surfacing the raw limiter response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(429, { error: 'Too many requests' })));

    const { result } = renderHook(() => useAiTask('/api/interview/questions'));
    await act(async () => {
      await result.current.run({});
    });

    expect(result.current.error).toMatch(/limit/i);
    expect(result.current.needsAuth).toBe(false);
  });

  it('surfaces a route error message when it has one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { error: 'Company briefing failed' })));

    const { result } = renderHook(() => useAiTask('/api/interview/company-briefing'));
    await act(async () => {
      await result.current.run({ companyName: 'Monzo' });
    });

    expect(result.current.error).toBe('Company briefing failed');
  });

  it('reports a network failure instead of leaving the button spinning', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    const { result } = renderHook(() => useAiTask('/api/interview/questions'));
    await act(async () => {
      await result.current.run({});
    });

    expect(result.current.error).toMatch(/connection/i);
    expect(result.current.loading).toBe(false);
  });

  it('treats an unreadable body as a failure, not as empty content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    })));

    const { result } = renderHook(() => useAiTask('/api/interview/questions'));
    await act(async () => {
      await result.current.run({});
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('lets the newest request win when an older one is still in flight', async () => {
    // The first call never settles until we release it, so without the abort
    // it would resolve last and clobber the second call's answer.
    let releaseFirst: (v: unknown) => void = () => {};
    const firstSettled = new Promise((r) => { releaseFirst = r; });

    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { n: number };
      if (body.n === 1) {
        await firstSettled;
        return jsonResponse(200, { which: 'first' });
      }
      return jsonResponse(200, { which: 'second' });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useAiTask<{ which: string }>('/api/interview/questions'));

    let firstCall: Promise<unknown> = Promise.resolve(null);
    await act(async () => {
      firstCall = result.current.run({ n: 1 });
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.run({ n: 2 });
    });
    expect(result.current.data).toEqual({ which: 'second' });

    await act(async () => {
      releaseFirst(null);
      await firstCall;
    });

    await waitFor(() => expect(result.current.data).toEqual({ which: 'second' }));
    expect(result.current.loading).toBe(false);
  });

  it('clears everything on reset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: 'Authentication required' })));

    const { result } = renderHook(() => useAiTask('/api/interview/questions'));
    await act(async () => {
      await result.current.run({});
    });
    expect(result.current.error).toBeTruthy();

    act(() => result.current.reset());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.needsAuth).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});
