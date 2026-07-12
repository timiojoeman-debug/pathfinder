// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

/**
 * The health endpoint must never throw and must report false (not error) when
 * integrations aren't configured — it's the deploy/uptime probe.
 */

describe('GET /api/health', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('returns 200 with version and false checks when nothing is configured', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ openai: false, supabase: false, version: '0.1.0' });
  });
});
