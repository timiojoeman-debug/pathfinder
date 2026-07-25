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
    // Four generic practice questions, none derived from the student.
    expect(json.questions).toHaveLength(4);
    expect(json.questions.map((q: { type: string }) => q.type)).toContain("Behavioral");
  });
});
