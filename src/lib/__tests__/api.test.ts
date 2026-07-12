// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { readBody, readLoose, zText, zShort } from '@/lib/api';

/**
 * The request-validation layer every API route funnels through. If this
 * regresses, malformed or oversized payloads reach the LLM/DB layer.
 */

function post(body: string): Request {
  return new Request('http://test/api', { method: 'POST', body });
}

describe('readBody', () => {
  const schema = z.object({ role: zShort(), count: z.number().optional() });

  it('accepts a valid body and returns typed data', async () => {
    const r = await readBody(post(JSON.stringify({ role: 'SWE' })), schema);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.role).toBe('SWE');
  });

  it('rejects invalid JSON with 400', async () => {
    const r = await readBody(post('{not valid json'), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      expect((await r.response.json()).error).toMatch(/json/i);
    }
  });

  it('rejects a schema mismatch with 400 and a message', async () => {
    const r = await readBody(post(JSON.stringify({ role: 123 })), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      expect((await r.response.json()).error).toBeTruthy();
    }
  });

  it('rejects an oversized body with 413 before parsing', async () => {
    const r = await readBody(post(JSON.stringify({ role: 'x'.repeat(200_000) })), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(413);
  });

  it('enforces the zText max length', async () => {
    const s = z.object({ jd: zText(10) });
    const r = await readBody(post(JSON.stringify({ jd: 'this is far too long' })), s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it('treats an empty body as an empty object', async () => {
    const r = await readBody(post(''), z.object({ x: z.string().optional() }));
    expect(r.ok).toBe(true);
  });
});

describe('readLoose', () => {
  it('accepts any JSON object', async () => {
    const r = await readLoose(post(JSON.stringify({ a: 1, b: 'two' })));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.b).toBe('two');
  });

  it('rejects invalid JSON', async () => {
    const r = await readLoose(post('not json at all'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });
});
