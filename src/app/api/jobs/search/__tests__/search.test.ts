// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { _resetGithubCache } from '@/lib/jobs/github';

/**
 * The route now merges two real sources — GitHub internship lists (always on)
 * and Adzuna (when configured). It once returned three invented companies with
 * example.com links; these tests keep every path honest: real listings only,
 * fewer on failure, never fabricated data.
 */

function post(body: unknown): Request {
  return new Request('http://test/api/jobs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const INVENTED = ['NovaTech', 'ScaleUp Systems', 'CloudFleet', 'example.com'];
function expectNothingInvented(payload: unknown) {
  const serialized = JSON.stringify(payload);
  for (const marker of INVENTED) expect(serialized).not.toContain(marker);
}

/** Route fetch by host: GitHub raw JSON vs the Adzuna API. */
function stubFetch(opts: {
  github?: unknown[];
  adzuna?: unknown[];
  adzunaStatus?: number;
  adzunaThrow?: boolean;
}) {
  const { github = [], adzuna = [], adzunaStatus = 200, adzunaThrow = false } = opts;
  const fn = vi.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes('githubusercontent')) {
      return { ok: true, json: async () => github } as unknown as Response;
    }
    if (adzunaThrow) throw new Error('ECONNRESET');
    if (adzunaStatus !== 200) return { ok: false, status: adzunaStatus, json: async () => ({}) } as unknown as Response;
    return { ok: true, json: async () => ({ results: adzuna }) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const GH = (over: Record<string, unknown> = {}) => ({
  company_name: 'Skyscanner', title: 'Software Engineer Intern', url: 'https://careers.skyscanner.net/1',
  locations: ['Edinburgh, UK'], active: true, is_visible: true, source: 'vanshb03', id: 'gh-1', ...over,
});

describe('POST /api/jobs/search', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;
    _resetGithubCache();
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns real GitHub listings even when Adzuna is not configured', async () => {
    stubFetch({ github: [GH()] });
    const res = await POST(post({ roleType: 'software engineer intern' }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.configured).toBe(true);
    expect(body.jobs.length).toBeGreaterThanOrEqual(1);
    expect(body.jobs[0]).toMatchObject({ company: 'Skyscanner', url: 'https://careers.skyscanner.net/1' });
    expect(body.jobs[0].source).toMatch(/via/i);
    // No description in these lists → no fabricated fit number.
    expect(body.jobs[0].matchScore).toBeNull();
    expectNothingInvented(body);
  });

  it('never calls Adzuna without credentials (GitHub only)', async () => {
    const fn = stubFetch({ github: [GH()] });
    await POST(post({ roleType: 'intern' }));
    const calledAdzuna = fn.mock.calls.some((c) => String(c[0]).includes('api.adzuna.com'));
    expect(calledAdzuna).toBe(false);
  });

  it('drops inactive / hidden / linkless GitHub entries rather than showing dead links', async () => {
    stubFetch({ github: [
      GH({ id: 'a', active: false }),
      GH({ id: 'b', is_visible: false, url: 'https://x/b' }),
      GH({ id: 'c', url: undefined, company_name: 'NoLink' }),
      GH({ id: 'd', company_name: 'Live Co', url: 'https://x/d' }),
    ] });
    const body = await (await POST(post({ roleType: 'software engineer intern' }))).json();
    const companies = body.jobs.map((j: { company: string }) => j.company);
    expect(companies).toContain('Live Co');
    expect(companies).not.toContain('NoLink');
    expect(body.jobs.every((j: { url: string }) => !!j.url)).toBe(true);
  });

  it('maps real Adzuna listings, keeping the provider apply link and scoring the JD', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    stubFetch({ github: [], adzuna: [
      {
        id: 42,
        title: 'Backend Engineering Intern',
        description: 'Work with typescript, node and postgresql on our API.',
        redirect_url: 'https://www.adzuna.co.uk/jobs/details/42',
        company: { display_name: 'Monzo' },
        location: { display_name: 'London' },
      },
    ] });

    const body = await (await POST(post({ roleType: 'backend intern', cvSummary: 'typescript node' }))).json();
    expect(body.configured).toBe(true);
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0]).toMatchObject({ company: 'Monzo', source: 'Adzuna', url: 'https://www.adzuna.co.uk/jobs/details/42' });
    // JD names 5 recognised keywords; CV evidences 2 → 40.
    expect(body.jobs[0].matchScore).toBe(40);
    expect(body.jobs[0].atsKeywords).toEqual(expect.arrayContaining(['typescript', 'node', 'postgresql']));
    expectNothingInvented(body);
  });

  it('returns fewer jobs (not invented ones) when Adzuna errors', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    stubFetch({ github: [], adzunaStatus: 503 });
    const body = await (await POST(post({ roleType: 'intern' }))).json();
    expect(body.jobs).toEqual([]);
    expectNothingInvented(body);
  });

  it('surfaces an unavailable message when Adzuna is unreachable', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    stubFetch({ github: [], adzunaThrow: true });
    const res = await POST(post({ roleType: 'intern' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobs).toEqual([]);
    expect(body.message).toMatch(/unavailable/i);
    expectNothingInvented(body);
  });

  it('sends Adzuna the expanded role, not the abbreviation', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    const fn = stubFetch({ github: [], adzuna: [] });
    await POST(post({ roleType: 'SWE intern', industry: 'fintech', workMode: 'remote' }));
    const adzunaUrl = fn.mock.calls.map((c) => String(c[0])).find((u) => u.includes('adzuna'))!;
    expect(new URL(adzunaUrl).searchParams.get('what')).toBe('software engineer intern fintech remote');
  });

  it('drops listings whose link is not http(s), from both sources', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    stubFetch({
      github: [
        GH({ id: 'ok', url: 'https://careers.example.org/ok' }),
        GH({ id: 'js', url: 'javascript:alert(document.cookie)' }),
        GH({ id: 'data', url: 'data:text/html,<script>1</script>' }),
      ],
      adzuna: [
        { title: 'Software Engineer Intern', redirect_url: 'JavaScript:alert(1)', company: { display_name: 'Bad Co' } },
        { title: 'Software Engineer Intern', redirect_url: 'https://www.adzuna.co.uk/jobs/details/7', company: { display_name: 'Good Co' } },
      ],
    });
    const body = await (await POST(post({ roleType: 'software' }))).json();
    const urls = body.jobs.map((j: { url: string }) => j.url).sort();
    expect(urls).toEqual(['https://careers.example.org/ok', 'https://www.adzuna.co.uk/jobs/details/7']);
  });

  it('applies industry and work mode to GitHub listings too', async () => {
    stubFetch({
      github: [
        GH({ id: 'a', url: 'https://x/a', locations: ['Remote, UK'] }),
        GH({ id: 'b', url: 'https://x/b', company_name: 'Acme Fintech', locations: ['London, UK'] }),
      ],
    });
    const remote = await (await POST(post({ roleType: 'software', workMode: 'remote' }))).json();
    expect(remote.jobs.map((j: { url: string }) => j.url)).toEqual(['https://x/a']);
    const fintech = await (await POST(post({ roleType: 'software', industry: 'fintech' }))).json();
    expect(fintech.jobs.map((j: { url: string }) => j.url)).toEqual(['https://x/b']);
  });

  it('sorts scored (Adzuna) listings above unscored (GitHub) ones', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    stubFetch({
      github: [GH({ company_name: 'GH Co', title: 'Software Engineer Intern', url: 'https://x/gh' })],
      adzuna: [{ title: 'Software Engineer Intern', description: 'react and typescript required', redirect_url: 'https://x/az', company: { display_name: 'AZ Co' } }],
    });
    const body = await (await POST(post({ roleType: 'software engineer intern', cvSummary: 'react typescript' }))).json();
    expect(body.jobs[0].company).toBe('AZ Co');
    expect(body.jobs[0].matchScore).toBe(100);
    expect(body.jobs[body.jobs.length - 1].matchScore).toBeNull();
  });
});
