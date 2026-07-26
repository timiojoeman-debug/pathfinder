// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  computeMatchScore,
  dedupeListings,
  filterListings,
  sortByFit,
  type JobListing,
} from '../types';
import { fetchGithubListings, GITHUB_SOURCES, _resetGithubCache } from '../github';

const job = (over: Partial<JobListing> = {}): JobListing => ({
  id: 'x', title: 'Software Engineer Intern', company: 'Acme', location: 'London',
  workMode: 'Not stated', source: 'Adzuna', description: '', url: 'https://x/1',
  matchScore: null, atsKeywords: [], ...over,
});

describe('computeMatchScore', () => {
  it('scores overlap only against keywords the JD actually asks for', () => {
    // JD names react+node+python (3); CV evidences react+node (2) → 67.
    const { score, keywords } = computeMatchScore('react node', 'we use react, node and python');
    expect(score).toBe(67);
    expect(keywords).toEqual(expect.arrayContaining(['react', 'node', 'python']));
  });

  it('returns null (never a guess) when the JD names no known keywords', () => {
    expect(computeMatchScore('react node', 'a lovely place to work').score).toBeNull();
  });

  it('caps the reported keyword list at five', () => {
    const desc = 'react node typescript python java sql aws';
    expect(computeMatchScore('', desc).keywords).toHaveLength(5);
  });
});

describe('dedupeListings', () => {
  it('collapses the same role that appears in more than one source', () => {
    const dupes = [job(), job({ source: 'via vanshb03' })];
    expect(dedupeListings(dupes)).toHaveLength(1);
  });

  it('keeps distinct roles at the same company', () => {
    const out = dedupeListings([job({ url: 'https://x/1' }), job({ url: 'https://x/2', title: 'Data Intern' })]);
    expect(out).toHaveLength(2);
  });
});

describe('filterListings', () => {
  it('matches role tokens against the title and ignores intern/internship noise', () => {
    const listings = [job({ title: 'Frontend Engineer Intern' }), job({ title: 'Marketing Intern', url: 'https://x/2' })];
    const out = filterListings(listings, { roleType: 'frontend engineer internship' });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Frontend Engineer Intern');
  });

  it('narrows by location substring', () => {
    const listings = [job({ location: 'London, UK' }), job({ location: 'Berlin, DE', url: 'https://x/2' })];
    expect(filterListings(listings, { location: 'london' })).toHaveLength(1);
  });

  it('passes everything through when filters are empty', () => {
    const listings = [job(), job({ url: 'https://x/2' })];
    expect(filterListings(listings, {})).toHaveLength(2);
  });
});

describe('sortByFit', () => {
  it('orders scored listings above unscored ones, highest first', () => {
    const out = sortByFit([job({ matchScore: null }), job({ matchScore: 40 }), job({ matchScore: 90 })]);
    expect(out.map((j) => j.matchScore)).toEqual([90, 40, null]);
  });
});

describe('fetchGithubListings', () => {
  const raw = (over: Record<string, unknown> = {}) => ({
    company_name: 'Stripe', title: 'Software Engineer Intern', url: 'https://stripe.com/jobs/1',
    locations: ['Remote in USA'], active: true, is_visible: true, source: 'Simplify', id: 'r1', ...over,
  });

  function stubGithub(payloadPerCall: unknown[]) {
    let i = 0;
    const fn = vi.fn(async () => {
      const payload = payloadPerCall[Math.min(i, payloadPerCall.length - 1)];
      i += 1;
      return { ok: true, json: async () => payload } as unknown as Response;
    });
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  beforeEach(() => _resetGithubCache());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps active/visible entries and stamps human-readable provenance', async () => {
    stubGithub([[raw()], []]);
    const out = await fetchGithubListings();
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0]).toMatchObject({ company: 'Stripe', url: 'https://stripe.com/jobs/1' });
    expect(out[0].source).toMatch(/^via /);
    expect(out[0].matchScore).toBeNull();
  });

  it('drops closed (active:false), hidden (is_visible:false), and linkless entries', async () => {
    stubGithub([[
      raw({ id: 'a', active: false }),
      raw({ id: 'b', is_visible: false, url: 'https://x/b' }),
      raw({ id: 'c', url: undefined }),
      raw({ id: 'd', company_name: 'Live Co', url: 'https://x/d' }),
    ], []]);
    const out = await fetchGithubListings();
    const companies = out.map((j) => j.company);
    expect(companies).toContain('Live Co');
    expect(companies).not.toContain('Stripe'); // the closed/hidden Stripe rows are gone
    expect(out.every((j) => !!j.url)).toBe(true);
  });

  it('serves cached listings within the TTL instead of re-fetching', async () => {
    const fn = stubGithub([[raw()], []]);
    await fetchGithubListings();
    const callsAfterFirst = fn.mock.calls.length;
    await fetchGithubListings();
    // Second run is fully cached → no additional network calls.
    expect(fn.mock.calls.length).toBe(callsAfterFirst);
    expect(callsAfterFirst).toBe(GITHUB_SOURCES.length);
  });

  it('returns nothing (not a throw, not invented data) when a source is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ENOTFOUND'); }));
    const out = await fetchGithubListings();
    expect(out).toEqual([]);
  });
});
