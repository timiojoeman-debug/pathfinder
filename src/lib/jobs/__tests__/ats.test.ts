// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import greenhouse from './fixtures/greenhouse.json';
import lever from './fixtures/lever.json';
import ashby from './fixtures/ashby.json';
import { fetchAshby, fetchEmployerListings, fetchGreenhouse, fetchLever, isEarlyCareerTitle } from '../ats';

const E = (ats: 'greenhouse' | 'lever' | 'ashby') => ({ name: 'Acme', ats, slug: 'acme' });
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) }) as unknown as Response;

afterEach(() => vi.unstubAllGlobals());

describe('isEarlyCareerTitle', () => {
  it.each([
    'Software Engineer Intern',
    'Summer INTERNSHIP 2027',
    'Graduate Software Engineer',
    'Graduates Programme',
    'Industrial Placement, Data',
    'Placement Year Student',
    'Early Careers Programme',
    'Early-Career Engineer',
    'Summer Analyst, Operations',
    'New Grad Engineer',
    'Software Engineer (Intern)',
  ])('keeps %s', (t) => expect(isEarlyCareerTitle(t)).toBe(true));

  it.each([
    'Internal Tools Engineer',
    'International Payments Lead',
    'Internet Engineer',
    'Graduate-level Senior Engineer',
    'Senior Graduate Recruiter',
    'Staff Engineer',
    'Backend Engineer',
    'Ad Placementless Analyst',
  ])('drops %s', (t) => expect(isEarlyCareerTitle(t)).toBe(false));
});

describe('ATS adapters', () => {
  it('Greenhouse maps early-career roles and drops the rest and unsafe URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok(greenhouse)));
    const out = await fetchGreenhouse(E('greenhouse'));
    expect(out.map((j) => j.title)).toEqual(['Software Engineer Intern', 'Graduate Data Analyst']);
    expect(out[0]).toMatchObject({
      company: 'Acme',
      location: 'London, UK',
      url: 'https://job-boards.greenhouse.io/acme/jobs/101',
      source: 'Acme careers',
      matchScore: null,
      postedAt: new Date('2026-08-24T09:04:42-04:00').toISOString(),
    });
    // first_published missing: falls back to updated_at
    expect(out[1].postedAt).toBe('2026-09-01T10:00:00.000Z');
  });

  it('Lever maps location, work mode and the createdAt timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok(lever)));
    const out = await fetchLever(E('lever'));
    expect(out.map((j) => j.title)).toEqual(['Software Engineering Internship', 'Early Careers Programme, Forward Deployed']);
    expect(out[0].location).toBe('London · Edinburgh');
    expect(out[0].workMode).toBe('hybrid');
    expect(out[0].postedAt).toBe(new Date(1788000000000).toISOString());
  });

  it('Ashby skips unlisted postings and joins secondary locations', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok(ashby)));
    const out = await fetchAshby(E('ashby'));
    expect(out.map((j) => j.title)).toEqual(['Summer Analyst, Operations', 'Industrial Placement, Data']);
    expect(out[0].location).toBe('London · Paris');
    expect(out[0].workMode).toBe('Hybrid');
  });

  it('fetchEmployerListings dispatches on the employer ATS', async () => {
    const fn = vi.fn(async () => ok(lever));
    vi.stubGlobal('fetch', fn);
    await fetchEmployerListings(E('lever'));
    expect(String((fn.mock.calls[0] as unknown[])[0])).toContain('api.lever.co/v0/postings/acme');
  });

  it('a board with no early-career roles is an empty success, not an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ jobs: [{ id: 1, title: 'Backend Engineer', absolute_url: 'https://x.test/1' }] })));
    await expect(fetchGreenhouse(E('greenhouse'))).resolves.toEqual([]);
  });

  it('throws on an unexpected payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ nope: true })));
    await expect(fetchGreenhouse(E('greenhouse'))).rejects.toThrow();
    await expect(fetchLever(E('lever'))).rejects.toThrow();
  });

  it('retries once on a 5xx, then succeeds', async () => {
    const fn = vi.fn().mockResolvedValueOnce(fail(503)).mockResolvedValueOnce(ok(greenhouse));
    vi.stubGlobal('fetch', fn);
    const out = await fetchGreenhouse(E('greenhouse'));
    expect(fn).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(2);
  });

  it('gives up after one retry and throws', async () => {
    const fn = vi.fn(async () => fail(500));
    vi.stubGlobal('fetch', fn);
    await expect(fetchLever(E('lever'))).rejects.toThrow('HTTP 500');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 404', async () => {
    const fn = vi.fn(async () => fail(404));
    vi.stubGlobal('fetch', fn);
    await expect(fetchAshby(E('ashby'))).rejects.toThrow('HTTP 404');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
