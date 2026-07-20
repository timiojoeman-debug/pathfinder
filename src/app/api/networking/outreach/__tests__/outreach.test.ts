// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

// Mock the AI layer so the handler is exercised without hitting OpenAI.
// The route uses callAIValidated (schema-checked) rather than raw callAI.
vi.mock('@/lib/ai', () => ({
  callAIValidated: vi.fn(),
  // Passthrough: the route wraps its schema in aiShape at module load.
  aiShape: <T>(schema: T): T => schema,
  AIError: class AIError extends Error {},
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';
import { callAIValidated } from '@/lib/ai';

function post(body: unknown): Request {
  return new Request('http://test/api/networking/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/networking/outreach', () => {
  it('rejects an invalid persona type with 400', async () => {
    const res = await POST(post({ type: 'not-a-persona' }));
    expect(res.status).toBe(400);
  });

  it('returns the AI-generated message and a naturalness read on success', async () => {
    vi.mocked(callAIValidated).mockResolvedValue({
      message: 'Hi Priya, I admire your team’s move to edge rendering...',
      questions: ['What makes a strong intern?'],
      topics: ['Recent launches'],
      followUp: 'Just following up.',
    });
    const res = await POST(post({ type: 'recruiter', recipientName: 'Priya' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('Hi Priya');
    expect(body).toHaveProperty('naturalness');
  });

  it('falls back to a template when the AI call fails', async () => {
    // Synchronous throw: callAI() throws before returning a promise, so the
    // route's try/catch catches it directly (no rejected promise for vitest to
    // flag as unhandled).
    vi.mocked(callAIValidated).mockImplementation(() => { throw new Error('AI unavailable'); });
    const res = await POST(post({ type: 'recruiter' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // The fallback ships an empty message with the canned question/topic prompts.
    expect(body.message).toBe('');
    expect(body.questions).toHaveLength(5);
    expect(body.topics).toHaveLength(5);
  });
});
