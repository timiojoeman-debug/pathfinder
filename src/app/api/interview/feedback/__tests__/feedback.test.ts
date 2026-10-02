// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * Post-interview feedback returns the methodology envelope. These tests hold
 * that the interview type is required, a real analysis passes through, and an
 * empty payload 500s instead of rendering a blank feedback panel.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/interview/feedback", {
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

const FEEDBACK_ENVELOPE = {
  methodologyReference: "TechTalk Interview Debrief",
  feedback: [],
  data: {
    analysis: "You answered the system-design question well but rushed the tradeoffs.",
    nextSteps: ["Rehearse tradeoff framing"],
  },
};

describe("POST /api/interview/feedback", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the interview type", async () => {
    const res = await POST(req({ wentWell: "Communication" }));
    expect(res.status).toBe(400);
  });

  it("returns the analysis envelope on success", async () => {
    mockOpenAI(FEEDBACK_ENVELOPE);
    const res = await POST(req({ interviewType: "technical", wentWell: "Explained my approach clearly", wouldChange: "Slow down" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.analysis).toContain("system-design");
  });

  it("tells the model this interview's company and rating, not earlier ones", async () => {
    mockOpenAI(FEEDBACK_ENVELOPE);
    await POST(req({ interviewType: "technical", company: "Monzo", selfRatings: { overall: 4 }, wentWell: "Clear" }));
    const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    const prompt = sent.messages.map((m: { content: string }) => m.content).join(" ");
    expect(prompt).toContain("Company: Monzo");
    expect(prompt).toContain('self-ratings for this interview (1-5): {"overall":4}');
  });

  it("asks for a placeholder rather than a guessed company when none is given", async () => {
    mockOpenAI(FEEDBACK_ENVELOPE);
    await POST(req({ interviewType: "technical" }));
    const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(sent.messages.map((m: { content: string }) => m.content).join(" ")).toContain("[Company]");
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ feedback: [], data: {} });
    const res = await POST(req({ interviewType: "technical" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
