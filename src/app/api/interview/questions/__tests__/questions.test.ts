// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * Interview questions tolerate both nestings (`aiShape`) and read each item's
 * kind as `type`. On an AI failure the route serves a static set of generic
 * practice questions — legitimate (they assert nothing about the student) and
 * documented — rather than erroring the practice flow.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/interview/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockOpenAI(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        status === 200 ? JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }) : "err",
        { status, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
}

const QUESTIONS = {
  questions: [
    { question: "Walk me through a bug you were proud of fixing.", type: "Behavioral", answerTemplate: "STAR: situation, task, action, result." },
    { question: "Design a URL shortener.", type: "Technical", answerTemplate: "Entities, endpoints, hashing, scale." },
  ],
};

describe("POST /api/interview/questions", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns the model's questions mapped to type/question/answerTemplate", async () => {
    mockOpenAI(QUESTIONS);
    const res = await POST(req({ targetRole: "Backend Intern", cvSummary: "Go, Postgres" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.questions[0].type).toBe("Behavioral");
    expect(json.questions[1].question).toContain("URL shortener");
    expect(json.source).toBe("ai");
  });

  it("asks the model for a harder round when difficulty is 'harder'", async () => {
    mockOpenAI(QUESTIONS);
    await POST(req({ more: true, difficulty: "harder" }));
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    const prompt = body.messages.map((m: { content: string }) => m.content).join(" ");
    expect(prompt).toContain("DIFFICULTY: HARDER");
    expect(prompt).toContain("harder round");
  });

  it("does not raise the difficulty for an ordinary request", async () => {
    mockOpenAI(QUESTIONS);
    await POST(req({ more: true }));
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    const prompt = body.messages.map((m: { content: string }) => m.content).join(" ");
    expect(prompt).not.toContain("DIFFICULTY: HARDER");
  });

  it("asks for one AI usage question answered with AIM", async () => {
    mockOpenAI(QUESTIONS);
    await POST(req({}));
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    const prompt = body.messages.map((m: { content: string }) => m.content).join(" ");
    expect(prompt).toContain('type "AI usage"');
    expect(prompt).toContain("Acknowledge");
    expect(prompt).toContain("Move Forward");
  });

  it("unwraps questions nested under `data` (aiShape)", async () => {
    mockOpenAI({ data: QUESTIONS });
    const res = await POST(req({ more: true }));
    const json = await res.json();
    expect(json.questions).toHaveLength(2);
  });

  it("serves the static fallback set when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ targetRole: "Backend Intern" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Five generic practice questions (one is the AI usage question), none derived from the student.
    expect(json.questions).toHaveLength(5);
    expect(json.questions.map((q: { type: string }) => q.type)).toContain("AI usage");
    expect(json.questions.map((q: { type: string }) => q.type)).toContain("Behavioral");
    // Flagged as degraded, and asserts nothing about a CV it never read.
    expect(json.source).toBe("fallback");
    expect(JSON.stringify(json.questions)).not.toMatch(/your resume you list|React/);
  });
});
