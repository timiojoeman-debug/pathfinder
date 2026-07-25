// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * `/linkedin/check` returns the methodology envelope plus `keywordAnalysis`
 * *beside* it (the trap noted in CLAUDE.md). These tests hold that a real
 * review passes through with both, that a missing profile is rejected before
 * spending a call, and that an entirely empty payload 500s.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/linkedin/check", {
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

const REVIEW_ENVELOPE = {
  methodologyReference: "TechTalk Positioning - LinkedIn",
  score: 6,
  feedback: [],
  data: {
    headlineScore: 5,
    aboutScore: 7,
    suggestedHeadline: "Software Developer | React & Node.js",
    suggestedAboutOpener: "I build web apps that ship.",
  },
  keywordAnalysis: {
    totalKeywords: 12,
    foundInProfile: 4,
    keywords: [{ keyword: "React", priority: "critical", foundInProfile: true, suggestedPlacement: "headline" }],
  },
};

describe("POST /api/linkedin/check", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request with neither headline nor about section", async () => {
    const res = await POST(req({ targetRole: "Frontend Engineer" }));
    expect(res.status).toBe(400);
  });

  it("returns the envelope and keyword analysis on success", async () => {
    mockOpenAI(REVIEW_ENVELOPE);
    const res = await POST(req({ headline: "Aspiring dev", aboutSection: "I like code." }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.suggestedHeadline).toContain("Software Developer");
    expect(json.keywordAnalysis.keywords[0].keyword).toBe("React");
  });

  it("500s when the model returns an entirely empty payload", async () => {
    mockOpenAI({ score: 0, data: {} });
    const res = await POST(req({ headline: "dev" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
