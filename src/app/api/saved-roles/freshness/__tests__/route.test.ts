// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
const getAuthUser = vi.fn();
vi.mock('@/lib/auth', () => ({ getAuthUser: () => getAuthUser() }));
const getListingActive = vi.fn();
vi.mock('@/lib/db/job-listings', () => ({ getListingActive: (u: string[]) => getListingActive(u) }));
const probeStatus = vi.fn();
vi.mock('@/lib/jobs/freshness', async (orig) => ({
  ...(await orig<typeof import('@/lib/jobs/freshness')>()),
  probeStatus: (u: string, send?: unknown, signal?: AbortSignal) => probeStatus(u, signal),
}));
const hit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({ hit: (...a: unknown[]) => hit(...a) }));

import { POST } from '../route';

const post = (body: unknown) =>
  POST(new Request('http://test/api/saved-roles/freshness', { method: 'POST', body: JSON.stringify(body) }));

const A = 'https://job-boards.greenhouse.io/acme/jobs/1';
const B = 'https://job-boards.greenhouse.io/acme/jobs/2';
const C = 'https://careers.example.org/role';

beforeEach(() => {
  for (const m of [getAuthUser, getListingActive, probeStatus, hit]) m.mockReset();
  getAuthUser.mockResolvedValue({ userId: 'u1' });
  getListingActive.mockResolvedValue(new Map());
  hit.mockResolvedValue({ ok: true });
});

describe('POST /api/saved-roles/freshness', () => {
  it('401s when signed out', async () => {
    getAuthUser.mockResolvedValue(null);
    expect((await post({ urls: [A] })).status).toBe(401);
    expect(getListingActive).not.toHaveBeenCalled();
  });

  it('rejects more than 20 urls', async () => {
    const urls = Array.from({ length: 21 }, (_, i) => `https://x.test/${i}`);
    expect((await post({ urls })).status).toBe(400);
  });

  it('a role removed from its board shows as closed; one still listed is ok', async () => {
    getListingActive.mockResolvedValue(new Map([[A, false], [B, true]]));
    const body = await (await post({ urls: [A, B] })).json();
    expect(body.statuses).toEqual({ [A]: 'closed', [B]: 'ok' });
    expect(probeStatus).not.toHaveBeenCalled();
  });

  it('does not probe other links unless asked', async () => {
    const body = await (await post({ urls: [C] })).json();
    expect(body.statuses[C]).toBe('unknown');
    expect(body.probed).toBe(false);
    expect(probeStatus).not.toHaveBeenCalled();
  });

  it('probes other links when asked: 404 may have closed, anything else unknown; feed-backed links are not probed', async () => {
    getListingActive.mockResolvedValue(new Map([[A, true]]));
    probeStatus.mockImplementation(async (u: string) => (u === C ? 404 : 403));
    const D = 'https://other.example.org/x';
    const body = await (await post({ urls: [A, C, D], probe: true })).json();
    expect(body.statuses).toEqual({ [A]: 'ok', [C]: 'may-have-closed', [D]: 'unknown' });
    expect(probeStatus.mock.calls.map((c) => c[0])).not.toContain(A);
    expect(body.probed).toBe(true);
  });

  it('over the probe budget it answers from the cache alone instead of failing', async () => {
    hit.mockResolvedValue({ ok: false });
    getListingActive.mockResolvedValue(new Map([[A, false]]));
    const res = await post({ urls: [A, C], probe: true });
    expect(res.status).toBe(200);
    expect((await res.json()).statuses).toEqual({ [A]: 'closed', [C]: 'unknown' });
    expect(probeStatus).not.toHaveBeenCalled();
  });

  it('probes at most 3 URLs per host per call', async () => {
    probeStatus.mockResolvedValue(404);
    const urls = Array.from({ length: 6 }, (_, i) => `https://same.example.org/${i}`);
    const body = await (await post({ urls: [...urls, C], probe: true })).json();
    expect(probeStatus).toHaveBeenCalledTimes(4); // 3 for the shared host + 1 for the other
    const states = urls.map((u) => body.statuses[u]);
    expect(states.filter((s) => s === 'may-have-closed')).toHaveLength(3);
    expect(states.filter((s) => s === 'unknown')).toHaveLength(3);
    expect(body.statuses[C]).toBe('may-have-closed');
  });

  it('after the total deadline the remaining URLs come back unknown', async () => {
    probeStatus.mockResolvedValue(404);
    const real = Date.now();
    let calls = 0;
    // The deadline is set from the first read; every later read is a minute on.
    vi.spyOn(Date, 'now').mockImplementation(() => (calls++ === 0 ? real : real + 60_000));
    const body = await (await post({ urls: [A, B, C], probe: true })).json();
    vi.restoreAllMocks();
    expect(probeStatus).not.toHaveBeenCalled();
    expect(Object.values(body.statuses)).toEqual(['unknown', 'unknown', 'unknown']);
  });

  it('a URL named like an inherited property cannot match the cache', async () => {
    const body = await (await post({ urls: ['constructor', '__proto__', 'toString'] })).json();
    expect(Object.values(body.statuses)).toEqual(['unknown', 'unknown', 'unknown']);
    expect(Object.keys(body.statuses)).toEqual(['constructor', '__proto__', 'toString']);
  });

  it('a slow-drip host: at the deadline the request is aborted and the URL comes back unknown', async () => {
    vi.useFakeTimers();
    let seen: AbortSignal | undefined;
    probeStatus.mockImplementation(
      (_u: string, signal?: AbortSignal) =>
        new Promise((resolve) => {
          seen = signal;
          signal?.addEventListener('abort', () => resolve(null)); // what nodeSend does: destroy the request
        }),
    );
    const pending = post({ urls: [C], probe: true });
    await vi.advanceTimersByTimeAsync(19_000);
    expect(seen?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(seen?.aborted).toBe(true);
    const body = await (await pending).json();
    expect(body.statuses[C]).toBe('unknown');
    vi.useRealTimers();
  });
});
