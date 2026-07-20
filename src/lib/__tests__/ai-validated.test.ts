// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { callAIValidated, AIError } from '@/lib/ai';

/**
 * Guards the silent-degradation failure mode: `callAI<T>()` is only a
 * compile-time cast, so a model response with the wrong shape used to flow
 * straight through and routes shipped empty payloads with HTTP 200. These
 * tests assert a shape mismatch now throws, so the route's fallback fires.
 */

const Schema = z.object({
  data: z.object({
    projects: z.array(z.object({ title: z.string() })).min(1),
  }),
});

/** Fake an OpenAI chat-completion whose message content is `payload`. */
function mockOpenAI(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  );
}

const params = { systemPrompt: 'sys', userMessage: 'usr' };

describe('callAIValidated', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = 'test-key'; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it('returns the parsed data when the model matches the schema', async () => {
    mockOpenAI({ data: { projects: [{ title: 'Rate limiter' }] } });
    const out = await callAIValidated(params, Schema, 'test');
    expect(out.data.projects[0].title).toBe('Rate limiter');
  });

  it('throws instead of silently passing a wrong-shaped response', async () => {
    // The exact bug: projects at the root instead of under `data`.
    mockOpenAI({ projects: [{ title: 'Rate limiter' }] });
    await expect(callAIValidated(params, Schema, 'cv/projects')).rejects.toThrow(AIError);
  });

  it('names the offending path and the keys it did receive', async () => {
    mockOpenAI({ projects: [], somethingElse: 1 });
    await expect(callAIValidated(params, Schema, 'cv/projects')).rejects.toThrow(
      /cv\/projects[\s\S]*data[\s\S]*Received keys: projects, somethingElse/,
    );
  });

  it('rejects an empty result set rather than shipping nothing', async () => {
    mockOpenAI({ data: { projects: [] } });
    await expect(callAIValidated(params, Schema, 'test')).rejects.toThrow(AIError);
  });
});
