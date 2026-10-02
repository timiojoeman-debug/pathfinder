// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

const insert = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  getServerDb: vi.fn(() => ({ from: vi.fn(() => ({ insert })) })),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
// Outside a request scope the real headers() throws; simulate an authed request.
const headerGet = vi.fn();
vi.mock('next/headers', () => ({ headers: vi.fn(async () => ({ get: headerGet })) }));

import { callAIValidated } from '@/lib/ai';
import { recordAiUsage } from '@/lib/db';
import { logger } from '@/lib/logger';

const PROMPT = 'SECRET-PROMPT-TEXT';
const REPLY = 'SECRET-REPLY-TEXT';

function mockOpenAI() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ ok: REPLY }) } }],
          usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  headerGet.mockReset().mockReturnValue('user-123');
  vi.mocked(logger.warn).mockReset();
  process.env.OPENAI_API_KEY = 'test-key';
});
afterEach(() => vi.unstubAllGlobals());

describe('AI usage log', () => {
  it('records model, tokens, route and user from the response usage', async () => {
    mockOpenAI();
    await callAIValidated(
      { systemPrompt: PROMPT, userMessage: PROMPT },
      z.object({ ok: z.string() }),
      'cv/ats-audit',
    );
    await flush();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      route: 'cv/ats-audit',
      model: 'gpt-4.1-mini',
      input_tokens: 120,
      output_tokens: 45,
    });
  });

  it('never stores prompt or response text', async () => {
    mockOpenAI();
    await callAIValidated(
      { systemPrompt: PROMPT, userMessage: PROMPT },
      z.object({ ok: z.string() }),
      'cv/ats-audit',
    );
    await flush();
    const row = JSON.stringify(insert.mock.calls[0][0]);
    expect(row).not.toContain(PROMPT);
    expect(row).not.toContain(REPLY);
  });

  it('a failing insert does not break the AI call', async () => {
    mockOpenAI();
    insert.mockRejectedValue(new Error('db down'));
    const out = await callAIValidated(
      { systemPrompt: PROMPT, userMessage: PROMPT },
      z.object({ ok: z.string() }),
      'x',
    );
    await flush();
    expect(out).toEqual({ ok: REPLY });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('records embeddings (no completion tokens) with a null user and "unknown" route', async () => {
    await recordAiUsage({ model: 'text-embedding-3-small', usage: { prompt_tokens: 9 } });
    expect(insert).toHaveBeenCalledWith({
      user_id: null,
      route: 'unknown',
      model: 'text-embedding-3-small',
      input_tokens: 9,
      output_tokens: 0,
    });
  });

  it('skips the insert when the response carries no usage', async () => {
    await recordAiUsage({ model: 'gpt-4.1-mini', usage: undefined });
    expect(insert).not.toHaveBeenCalled();
  });
});
