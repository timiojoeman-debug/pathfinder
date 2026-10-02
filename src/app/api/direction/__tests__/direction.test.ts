// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * The direction route reads its statement out of `data` (the CLAUDE.md trap —
 * reading off the root collapsed the response to `{suggestions:[]}`) and, on an
 * AI failure, serves a locally-derived statement rather than erroring. It also
 * accepts a tech stack as either a string or a string[] without crashing.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/direction", {
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

const DIRECTION_ENVELOPE = {
  data: {
    directionStatement: "I'm targeting backend engineering roles in fintech.",
    specificityScore: 82,
    specificityTier: "Clear",
    sharpeningSuggestions: ["Name one or two target companies."],
  },
};

const INPUT = { industry: "fintech", roleType: "Backend Engineering", techStack: ["Go", "Postgres"], location: "London", companySize: "scaleup", workMode: "hybrid" };

describe("POST /api/direction", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns the AI statement read out of `data` on success", async () => {
    mockOpenAI(DIRECTION_ENVELOPE);
    const res = await POST(req(INPUT));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.statement).toContain("fintech");
    expect(json.specificity).toBe("Clear");
    expect(json.source).toBe("ai");
    expect(json.suggestions).toContain("Name one or two target companies.");
  });

  it("accepts the statement answered at the root as well as under `data`", async () => {
    mockOpenAI(DIRECTION_ENVELOPE.data);
    const json = await (await POST(req(INPUT))).json();
    expect(json.source).toBe("ai");
    expect(json.statement).toContain("fintech");
  });

  it("serves a locally-derived statement when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req(INPUT));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Built deterministically from the inputs, so it still names the target.
    expect(json.statement).toMatch(/^I'm targeting/);
    expect(json.statement).toContain("Backend Engineering");
    expect(typeof json.specificity).toBe("string");
    // Labelled, so the client never presents the fallback as an AI answer.
    expect(json.source).toBe("local");
  });

  it("accepts a tech stack passed as a string[] without crashing", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ ...INPUT, techStack: ["Go", "Kubernetes"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.statement).toContain("Go, Kubernetes");
  });
});
