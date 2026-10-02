// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub only the network call. `aiShape` stays real: the mentor engine returns
// its payload nested under `data`, and unwrapping that is exactly the behaviour
// under test — a passthrough stub would hide it.
vi.mock('@/lib/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai')>()),
  callAIValidated: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
// The route prefers the mentor engine (real user context + methodology
// retrieved from pgvector) and drops to a direct call when it can't be used.
vi.mock('@/lib/ai/mentor-engine', () => ({ runMentorEngine: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: vi.fn(() => true) }));

import { POST } from '../route';
import { callAIValidated } from '@/lib/ai';
import { runMentorEngine } from '@/lib/ai/mentor-engine';
import { getAuthUser } from '@/lib/auth';

const SIGNED_IN = { userId: 'user-1', email: 'a@b.c', role: 'student' };

/** What the mentor engine returns: the methodology envelope, payload in `data`. */
const MENTOR_ENVELOPE = {
  inputQuality: 'strong',
  methodologyReference: 'TechTalk Networking Strategy',
  feedback: [],
  strengths: [],
  nextSteps: [],
  shouldRepeatAnalysis: false,
  data: {
    message: 'Hi Priya, I saw your team shipped edge rendering last month...',
    questions: ['What makes a strong intern here?'],
    topics: ['Recent launches'],
    followUp: 'Following up gently.',
  },
};

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

  it('fails visibly when the AI call fails, with no placeholder tokens or empty message', async () => {
    // Synchronous throw: callAI() throws before returning a promise, so the
    // route's try/catch catches it directly (no rejected promise for vitest to
    // flag as unhandled).
    vi.mocked(callAIValidated).mockImplementation(() => { throw new Error('AI unavailable'); });
    const res = await POST(post({ type: 'recruiter', recipientName: 'Priya Shah', company: 'Monzo' }));
    expect(res.status).toBe(503);
    const raw = await res.text();
    // The old fallback shipped `message: ""` and "Hi again NAME … at COMPANY".
    expect(raw).not.toMatch(/\bNAME\b|\bCOMPANY\b/);
    const body = JSON.parse(raw);
    expect(body).not.toHaveProperty('message');
    expect(body.error).toMatch(/unavailable/);
  });

  it('never pads a real answer with canned questions, topics or a placeholder follow-up', async () => {
    vi.mocked(callAIValidated).mockResolvedValue({ message: 'Hi Priya, a real message about Monzo.' });
    const body = await (await POST(post({ type: 'peer', recipientName: 'Priya', company: 'Monzo' }))).json();
    expect(body.questions).toEqual([]);
    expect(body.topics).toEqual([]);
    expect(body.followUp).toBeNull();
  });

  it('asks for no signature rather than signing as "Student" when no sender name is given', async () => {
    vi.mocked(callAIValidated).mockResolvedValue({ message: 'Hi.' });
    await POST(post({ type: 'peer' }));
    const prompt = vi.mocked(callAIValidated).mock.calls.at(-1)![0].systemPrompt;
    expect(prompt).toMatch(/without a signature/);
    expect(prompt).not.toMatch(/Sender: Student/);

    await POST(post({ type: 'peer', senderName: 'Timi Ojo' }));
    expect(vi.mocked(callAIValidated).mock.calls.at(-1)![0].systemPrompt).toMatch(/Sender: Timi Ojo/);
  });
  describe('mentor engine tiering', () => {
    beforeEach(() => {
      vi.mocked(getAuthUser).mockResolvedValue(SIGNED_IN);
      vi.mocked(runMentorEngine).mockReset();
      vi.mocked(callAIValidated).mockReset();
    });

    it('routes a signed-in student through the mentor engine, reading the payload out of `data`', async () => {
      vi.mocked(runMentorEngine).mockResolvedValue(MENTOR_ENVELOPE as never);

      const body = await (await POST(post({ type: 'recruiter', recipientName: 'Priya' }))).json();

      expect(body.message).toContain('Hi Priya');
      // The engine was used, so no direct one-shot call was needed.
      expect(callAIValidated).not.toHaveBeenCalled();
      expect(vi.mocked(runMentorEngine).mock.calls[0][0]).toMatchObject({
        userId: 'user-1',
        feature: 'outreach-recruiter',
      });
    });

    it('picks the persona-specific RAG feature', async () => {
      vi.mocked(runMentorEngine).mockResolvedValue(MENTOR_ENVELOPE as never);
      await POST(post({ type: 'hiringManager' }));
      expect(vi.mocked(runMentorEngine).mock.calls[0][0].feature).toBe('outreach-hiring-manager');
    });

    it('falls back to a direct call when the engine throws, rather than serving the template', async () => {
      vi.mocked(runMentorEngine).mockRejectedValue(new Error('supabase down'));
      vi.mocked(callAIValidated).mockResolvedValue({
        message: 'Direct-call message that still works.',
        questions: [], topics: [], followUp: '',
      });

      const body = await (await POST(post({ type: 'recruiter' }))).json();

      expect(callAIValidated).toHaveBeenCalled();
      expect(body.message).toBe('Direct-call message that still works.');
    });

    it('skips the engine entirely for a guest', async () => {
      vi.mocked(getAuthUser).mockResolvedValue(null);
      vi.mocked(callAIValidated).mockResolvedValue({
        message: 'Guest message.', questions: [], topics: [], followUp: '',
      });

      await POST(post({ type: 'peer' }));

      expect(runMentorEngine).not.toHaveBeenCalled();
      expect(callAIValidated).toHaveBeenCalled();
    });
  });
});
