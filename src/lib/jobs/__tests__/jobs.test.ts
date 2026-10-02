// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  computeMatchScore,
  dedupeListings,
  expandRoleQuery,
  filterListings,
  safeHttpUrl,
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

describe('safeHttpUrl', () => {
  it('keeps http and https links', () => {
    expect(safeHttpUrl('https://jobs.example.org/1')).toBe('https://jobs.example.org/1');
    expect(safeHttpUrl('  http://jobs.example.org/2 ')).toBe('http://jobs.example.org/2');
  });

  it('drops script, data and other schemes, however they are cased or padded', () => {
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'file:///etc/passwd', 'mailto:a@b.c']) {
      expect(safeHttpUrl(bad)).toBeNull();
    }
  });

  it('drops empty, relative and non-string values', () => {
    for (const bad of ['', '   ', '/jobs/1', 'not a url', undefined, null, 42]) {
      expect(safeHttpUrl(bad)).toBeNull();
    }
  });
});

describe('expandRoleQuery', () => {
  it('turns shorthand into the phrase adverts use and leaves other words alone', () => {
    expect(expandRoleQuery('SWE intern')).toBe('software engineer intern');
    expect(expandRoleQuery('ML  research')).toBe('machine learning research');
    expect(expandRoleQuery('Backend')).toBe('Backend');
    expect(expandRoleQuery('')).toBe('');
  });
});

describe('dedupeListings', () => {
  it('collapses the same role that appears in more than one source', () => {
    const dupes = [job(), job({ source: 'via vanshb03' })];
    expect(dedupeListings(dupes)).toHaveLength(1);
  });

  it('ignores tracking params and a trailing slash in the URL', () => {
    const out = dedupeListings([
      job({ url: 'https://boards.example/acme/jobs/1' }),
      job({ url: 'https://boards.example/acme/jobs/1/?utm_source=x&gh_src=y&source=Simplify&ref=r&lever-source=l' }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('keeps URLs that differ in a meaningful param', () => {
    const out = dedupeListings([job({ url: 'https://x/apply?id=1' }), job({ url: 'https://x/apply?id=2' })]);
    expect(out).toHaveLength(2);
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

  it('narrows by industry and work mode keywords in title, company or location', () => {
    const listings = [
      job({ company: 'Monzo Fintech', url: 'https://x/1' }),
      job({ location: 'Remote', url: 'https://x/2' }),
      job({ url: 'https://x/3' }),
    ];
    expect(filterListings(listings, { industry: 'fintech' }).map((j) => j.url)).toEqual(['https://x/1']);
    expect(filterListings(listings, { workMode: 'remote' }).map((j) => j.url)).toEqual(['https://x/2']);
    expect(filterListings(listings, { industry: '', workMode: undefined })).toHaveLength(3);
  });

  it('keeps a short filter that is the whole value, and matches whole words', () => {
    const listings = [
      job({ title: 'AI Research Intern', url: 'https://x/1' }),
      job({ title: 'Daily Ops Intern', url: 'https://x/2' }),
    ];
    expect(filterListings(listings, { industry: 'AI' }).map((j) => j.url)).toEqual(['https://x/1']);
  });

  it('needs every word of a multi-word industry', () => {
    const listings = [
      job({ company: 'Acme Health Tech', url: 'https://x/1' }),
      job({ company: 'Acme Health', url: 'https://x/2' }),
    ];
    expect(filterListings(listings, { industry: 'health tech' }).map((j) => j.url)).toEqual(['https://x/1']);
  });

  it('expands a 3-letter abbreviation to the words in the title (SWE → Software Engineer)', () => {
    const listings = [
      job({ title: 'Software Engineer Intern' }),
      job({ title: 'Marketing Intern', url: 'https://x/2' }),
    ];
    const out = filterListings(listings, { roleType: 'SWE' });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Software Engineer Intern');
  });

  it('expands 2-letter abbreviations the tokenizer would otherwise drop (ML, PM)', () => {
    const listings = [
      job({ title: 'Machine Learning Intern' }),
      job({ title: 'Product Manager Intern', url: 'https://x/2' }),
      job({ title: 'Marketing Intern', url: 'https://x/3' }),
    ];
    expect(filterListings(listings, { roleType: 'ML' }).map((j) => j.title)).toEqual(['Machine Learning Intern']);
    expect(filterListings(listings, { roleType: 'PM' }).map((j) => j.title)).toEqual(['Product Manager Intern']);
  });

  it('still matches a title that spells the abbreviation out literally', () => {
    const out = filterListings([job({ title: 'SWE Intern' })], { roleType: 'swe' });
    expect(out).toHaveLength(1);
  });

  it('does not let a 2-letter abbreviation match inside a longer word (PM ≠ develoPMent)', () => {
    const listings = [
      job({ title: 'Automation Development & Tooling Engineer Intern' }),
      job({ title: 'Product Manager Intern', url: 'https://x/2' }),
    ];
    const out = filterListings(listings, { roleType: 'PM' });
    expect(out.map((j) => j.title)).toEqual(['Product Manager Intern']);
  });
});

describe('filterListings — specific matching', () => {
  it('does not match SWE on a generic word alone (Engineer ≠ Software Engineer)', () => {
    const listings = [
      job({ title: 'Software Engineer Intern', url: 'https://x/1' }),
      job({ title: 'Chassis Validation Engineer Intern', url: 'https://x/2' }),
      job({ title: 'Machine Learning Engineer Intern', url: 'https://x/3' }),
      job({ title: 'Software Developer Intern', url: 'https://x/4' }),
    ];
    expect(filterListings(listings, { roleType: 'SWE intern' }).map((j) => j.url)).toEqual(['https://x/1', 'https://x/4']);
  });

  it('lets the specific word decide in a mixed query', () => {
    const listings = [
      job({ title: 'Frontend Engineer Intern', url: 'https://x/1' }),
      job({ title: 'Backend Engineer Intern', url: 'https://x/2' }),
    ];
    expect(filterListings(listings, { roleType: 'frontend engineer' }).map((j) => j.url)).toEqual(['https://x/1']);
  });

  it('falls back to the generic words when that is all the query has', () => {
    const listings = [
      job({ title: 'Chassis Validation Engineer Intern', url: 'https://x/1' }),
      job({ title: 'Marketing Intern', url: 'https://x/2' }),
    ];
    expect(filterListings(listings, { roleType: 'engineer intern' }).map((j) => j.url)).toEqual(['https://x/1']);
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
