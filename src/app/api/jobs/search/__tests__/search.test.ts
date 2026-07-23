// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';

/**
 * This route used to return three invented companies attributed to Adzuna,
 * JSearch and Greenhouse, with apply links pointing at example.com — a student
 * could tailor a CV to a company that does not exist. These tests exist to stop
 * fabricated listings coming back: every path that cannot produce real jobs
 * must return an empty list, never placeholder data.
 */

function post(body: unknown): Request {
  return new Request('http://test/api/jobs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const INVENTED = ['NovaTech', 'ScaleUp Systems', 'CloudFleet', 'example.com'];

/** No listing may reference a placeholder company or a placeholder domain. */
function expectNothingInvented(payload: unknown) {
  const serialized = JSON.stringify(payload);
  for (const marker of INVENTED) {
    expect(serialized).not.toContain(marker);
  }
}

describe('POST /api/jobs/search', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns no jobs and says so when Adzuna is not configured', async () => {
    const res = await POST(post({ roleType: 'backend intern' }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.jobs).toEqual([]);
    expect(body.configured).toBe(false);
    expect(body.message).toMatch(/isn't connected/i);
    expectNothingInvented(body);
  });

  it('never calls out to a provider when there are no credentials', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await POST(post({ roleType: 'backend intern' }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps real Adzuna listings, keeping the provider apply link', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 42,
            title: 'Backend Engineering Intern',
            description: 'Work with typescript, node and postgresql on our API.',
            redirect_url: 'https://www.adzuna.co.uk/jobs/details/42',
            company: { display_name: 'Monzo' },
            location: { display_name: 'London' },
          },
        ],
      }),
    })));

    const res = await POST(post({ roleType: 'backend intern', cvSummary: 'typescript node' }));
    const body = await res.json();

    expect(body.configured).toBe(true);
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0]).toMatchObject({
      company: 'Monzo',
      source: 'Adzuna',
      url: 'https://www.adzuna.co.uk/jobs/details/42',
    });
    // The JD mentions five recognised keywords — typescript, node, api,
    // postgresql, and sql (matched as a substring of "postgresql"). The CV
    // evidences two of them, so 2/5 = 40.
    expect(body.jobs[0].matchScore).toBe(40);
    expect(body.jobs[0].atsKeywords).toEqual(
      expect.arrayContaining(['typescript', 'node', 'postgresql']),
    );
    expectNothingInvented(body);
  });

  it('drops listings with no apply link rather than inventing one', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          { title: 'Ghost Role', description: 'No link provided.' },
          { title: 'Real Role', description: 'react', redirect_url: 'https://example-board.test/1' },
        ],
      }),
    })));

    const body = await (await POST(post({ roleType: 'intern' }))).json();
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].title).toBe('Real Role');
  });

  it('returns an empty list when the provider errors', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));

    const body = await (await POST(post({ roleType: 'intern' }))).json();
    expect(body.jobs).toEqual([]);
    expectNothingInvented(body);
  });

  it('returns an empty list when the provider is unreachable', async () => {
    process.env.ADZUNA_APP_ID = 'id';
    process.env.ADZUNA_APP_KEY = 'key';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    const res = await POST(post({ roleType: 'intern' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobs).toEqual([]);
    expect(body.message).toMatch(/unavailable/i);
    expectNothingInvented(body);
  });
  describe('listings with nothing to score against', () => {
    beforeEach(() => {
      process.env.ADZUNA_APP_ID = 'id';
      process.env.ADZUNA_APP_KEY = 'key';
    });

    it('returns a null score rather than a confident-looking number', async () => {
      // Adzuna sends a ~500-char snippet, usually company blurb naming no
      // technologies. Scoring that 50 made every real job render "Long shot".
      vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [{
            title: 'Software Engineering Intern',
            description: "We're a profitable video game start-up in London with 15 million monthly players.",
            redirect_url: 'https://www.adzuna.co.uk/jobs/details/1',
            company: { display_name: 'Bloxd' },
          }],
        }),
      })));

      const body = await (await POST(post({ roleType: 'intern', cvSummary: 'Go Postgres React' }))).json();
      expect(body.jobs).toHaveLength(1);
      expect(body.jobs[0].matchScore).toBeNull();
      expect(body.jobs[0].atsKeywords).toEqual([]);
      // The listing itself is still real and still shown.
      expect(body.jobs[0].company).toBe('Bloxd');
    });

    it('sorts scored listings above unscored ones', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            { title: 'A', description: 'company blurb only', redirect_url: 'https://x.test/a' },
            { title: 'B', description: 'react and typescript required', redirect_url: 'https://x.test/b' },
          ],
        }),
      })));

      const body = await (await POST(post({ roleType: 'intern', cvSummary: 'react typescript' }))).json();
      expect(body.jobs[0].title).toBe('B');
      expect(body.jobs[0].matchScore).toBe(100);
      expect(body.jobs[1].matchScore).toBeNull();
    });
  });
});
