// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/jobs/employers', () => ({
  EMPLOYERS: [
    { name: 'Good Co', ats: 'greenhouse', slug: 'good' },
    { name: 'Down Co', ats: 'lever', slug: 'down' },
  ],
}));
const fetchEmployerListings = vi.fn();
vi.mock('@/lib/jobs/ats', () => ({ fetchEmployerListings: (e: unknown) => fetchEmployerListings(e) }));
const syncEmployerListings = vi.fn();
vi.mock('@/lib/db/job-listings', () => ({
  syncEmployerListings: (...a: unknown[]) => syncEmployerListings(...a),
}));

import { GET } from '../route';

const call = (auth?: string) =>
  GET(new Request('http://test/api/cron/refresh-jobs', { headers: auth ? { authorization: auth } : {} }));

describe('GET /api/cron/refresh-jobs', () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => {
    fetchEmployerListings.mockReset();
    syncEmployerListings.mockReset();
    process.env.CRON_SECRET = 's3cret';
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  it('401s without the header', async () => {
    expect((await call()).status).toBe(401);
    expect(fetchEmployerListings).not.toHaveBeenCalled();
  });

  it('401s with a wrong secret', async () => {
    expect((await call('Bearer nope')).status).toBe(401);
    expect((await call('s3cret')).status).toBe(401);
    expect(fetchEmployerListings).not.toHaveBeenCalled();
  });

  it('401s when CRON_SECRET is unset, even for "Bearer undefined"', async () => {
    delete process.env.CRON_SECRET;
    expect((await call('Bearer undefined')).status).toBe(401);
    expect((await call('Bearer ')).status).toBe(401);
    expect(fetchEmployerListings).not.toHaveBeenCalled();
  });

  it('syncs employers that fetched, and leaves a failed one untouched (its roles stay open)', async () => {
    const listing = { url: 'https://x.test/1', title: 'Intern' };
    fetchEmployerListings.mockImplementation(async (e: { name: string }) => {
      if (e.name === 'Down Co') throw new Error('HTTP 500');
      return [listing];
    });
    syncEmployerListings.mockResolvedValue({ upserted: 1, closed: 2 });

    const res = await call('Bearer s3cret');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(syncEmployerListings).toHaveBeenCalledTimes(1);
    expect(syncEmployerListings).toHaveBeenCalledWith('greenhouse', 'Good Co', [listing]);
    expect(body).toMatchObject({ employers: 2, upserted: 1, closed: 2, failed: ['Down Co'] });
  });

  it('a successful but empty board is synced, so its vanished roles close', async () => {
    fetchEmployerListings.mockResolvedValue([]);
    syncEmployerListings.mockResolvedValue({ upserted: 0, closed: 3 });
    const body = await (await call('Bearer s3cret')).json();
    expect(syncEmployerListings).toHaveBeenCalledWith('greenhouse', 'Good Co', []);
    expect(body.closed).toBe(6);
  });

  it('counts an employer as failed when the database write fails', async () => {
    fetchEmployerListings.mockResolvedValue([]);
    syncEmployerListings.mockResolvedValue(null);
    const body = await (await call('Bearer s3cret')).json();
    expect(body.failed.sort()).toEqual(['Down Co', 'Good Co']);
  });
});
