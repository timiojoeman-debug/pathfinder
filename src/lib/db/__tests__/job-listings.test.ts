// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({ getServerDb: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getServerDb } from '@/lib/supabase/client';
import { getActiveListings, syncEmployerListings } from '../job-listings';

type Row = { source: string; employer: string; url: string; active: boolean; title?: string; [k: string]: unknown };
type ServerDb = ReturnType<typeof getServerDb>;

/** A tiny in-memory job_listings table behind the query-builder calls the layer makes. */
function fakeTable(initial: Row[], fail?: 'upsert') {
  const rows = [...initial];
  const from = () => {
    const filters: ((r: Row) => boolean)[] = [];
    let patch: Partial<Row> | null = null;
    const b: Record<string, unknown> = {};
    const run = () => {
      const hit = rows.filter((r) => filters.every((f) => f(r)));
      if (patch) hit.forEach((r) => Object.assign(r, patch));
      return { data: hit, error: null };
    };
    b.select = () => b;
    b.order = () => b;
    b.limit = () => b;
    b.eq = (col: string, v: unknown) => (filters.push((r) => r[col] === v), b);
    b.ilike = (col: string, pat: string) => {
      const needle = pat.replace(/^%|%$/g, '').replace(/\\([\\%_])/g, '$1').toLowerCase();
      filters.push((r) => String(r[col] ?? '').toLowerCase().includes(needle));
      return b;
    };
    b.in = (col: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[col])), b);
    b.update = (p: Partial<Row>) => ((patch = p), b);
    b.upsert = async (incoming: Row[]) => {
      if (fail === 'upsert') return { error: { message: 'boom' } };
      for (const n of incoming) {
        const i = rows.findIndex((r) => r.url === n.url);
        if (i >= 0) rows[i] = { ...rows[i], ...n };
        else rows.push(n);
      }
      return { error: null };
    };
    b.then = (resolve: (v: unknown) => unknown) => resolve(run());
    return b;
  };
  vi.mocked(getServerDb).mockReturnValue({ from } as unknown as ServerDb);
  return rows;
}

const L = (url: string) => ({
  id: url, title: 'Intern', company: 'Acme', location: 'London', workMode: 'Not stated',
  source: 'Acme careers', description: '', url, matchScore: null, atsKeywords: [], postedAt: null,
});

beforeEach(() => vi.mocked(getServerDb).mockReset());

describe('syncEmployerListings', () => {
  it('upserts returned roles and closes this employer\'s roles that vanished', async () => {
    const rows = fakeTable([
      { source: 'lever', employer: 'Acme', url: 'https://a/1', active: true },
      { source: 'lever', employer: 'Acme', url: 'https://a/2', active: true },
      { source: 'lever', employer: 'Other', url: 'https://o/1', active: true },
    ]);
    const res = await syncEmployerListings('lever', 'Acme', [L('https://a/1'), L('https://a/3')]);

    expect(res).toEqual({ upserted: 2, closed: 1 });
    const by = Object.fromEntries(rows.map((r) => [r.url, r.active]));
    expect(by).toEqual({ 'https://a/1': true, 'https://a/2': false, 'https://a/3': true, 'https://o/1': true });
  });

  it('reopens a role that came back', async () => {
    const rows = fakeTable([{ source: 'ashby', employer: 'Acme', url: 'https://a/1', active: false }]);
    await syncEmployerListings('ashby', 'Acme', [L('https://a/1')]);
    expect(rows[0].active).toBe(true);
  });

  it('an empty successful fetch closes everything the employer had', async () => {
    const rows = fakeTable([{ source: 'ashby', employer: 'Acme', url: 'https://a/1', active: true }]);
    expect(await syncEmployerListings('ashby', 'Acme', [])).toEqual({ upserted: 0, closed: 1 });
    expect(rows[0].active).toBe(false);
  });

  it('closes nothing if the upsert failed', async () => {
    const rows = fakeTable([{ source: 'ashby', employer: 'Acme', url: 'https://a/1', active: true }], 'upsert');
    expect(await syncEmployerListings('ashby', 'Acme', [L('https://a/2')])).toBeNull();
    expect(rows[0].active).toBe(true);
  });

  it('returns null with no database configured', async () => {
    vi.mocked(getServerDb).mockReturnValue(null);
    expect(await syncEmployerListings('ashby', 'Acme', [])).toBeNull();
  });
});

describe('getActiveListings', () => {
  it('maps rows to listings', async () => {
    fakeTable([
      { id: 'x', source: 'lever', employer: 'Acme', title: 'Intern', location: '', work_mode: '', url: 'https://a/1', posted_at: '2026-09-01T00:00:00Z', active: true },
      { id: 'y', source: 'lever', employer: 'Acme', title: 'Closed', url: 'https://a/2', active: false },
    ]);
    const out = await getActiveListings();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ company: 'Acme', location: 'Location not stated', source: 'Acme careers', postedAt: '2026-09-01T00:00:00Z', matchScore: null });
  });

  it('narrows by location in the query', async () => {
    fakeTable([
      { id: 'x', source: 'lever', employer: 'A', title: 'Intern', location: 'London, UK', url: 'https://a/1', active: true },
      { id: 'y', source: 'lever', employer: 'B', title: 'Intern', location: 'New York', url: 'https://b/1', active: true },
    ]);
    const out = await getActiveListings({ location: 'london' });
    expect(out.map((j) => j.company)).toEqual(['A']);
  });

  it('is empty without a database', async () => {
    vi.mocked(getServerDb).mockReturnValue(null);
    expect(await getActiveListings()).toEqual([]);
  });
});
