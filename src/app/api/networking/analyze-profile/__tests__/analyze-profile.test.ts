// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * This route reads a real person's pasted profile and must never hand the
 * student invented common ground. The previous fallback returned "Analysis
 * complete" with generic angles; the honest replacement validates a non-empty
 * `summary` and 500s otherwise. These tests hold that line: real angles pass
 * through, no-content is rejected, and an empty/canned summary 500s.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/networking/analyze-profile", {
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

const ANALYSIS = {
  summary: "Senior backend engineer at Monzo, ex-Edinburgh, writes about Go and payments.",
  connectionPoints: ["Both studied at the University of Edinburgh"],
  outreachAngles: ["Ask about their move from monolith to services"],
  conversationStarters: ["I read your post on idempotency keys — how did you handle retries?"],
};

describe("POST /api/networking/analyze-profile", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request with no profile content", async () => {
    const res = await POST(req({ recipientName: "Priya", company: "Monzo" }));
    expect(res.status).toBe(400);
  });

  it("returns grounded angles when the model reads the pasted profile", async () => {
    mockOpenAI(ANALYSIS);
    const res = await POST(req({ about: "Backend engineer at Monzo. Edinburgh grad.", experience: "5 years in payments." }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toContain("Monzo");
    expect(json.connectionPoints).toContain("Both studied at the University of Edinburgh");
  });

  it("500s rather than inventing common ground when the summary comes back empty", async () => {
    mockOpenAI({ summary: "", connectionPoints: ["University alumni"], outreachAngles: [] });
    const res = await POST(req({ about: "Some real pasted profile text." }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(json.summary).toBeUndefined();
  });

  it("500s when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ experience: "Real experience text." }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
