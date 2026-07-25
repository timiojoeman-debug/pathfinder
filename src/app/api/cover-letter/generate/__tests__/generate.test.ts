// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * The cover letter must come back non-empty — an empty `data.coverLetter` used
 * to sail through as a "successful" generation. These tests hold that: a real
 * letter passes through with a naturalness read attached, and an empty or
 * unreachable model surfaces as a 500 rather than an empty 200.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/cover-letter/generate", {
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

const VALID_BODY = {
  jobDescription: "Backend internship. Go, Postgres, REST APIs. Ship real services.",
  companyName: "Monzo",
  directionStatement: "Backend engineer building payments infrastructure.",
};

const LETTER_ENVELOPE = {
  methodologyReference: "TechTalk CV Blueprint - Cover Letter",
  data: {
    coverLetter: "Dear Monzo team, your recent move to Go for the payments core is exactly the kind of problem I want to work on...",
    assumptions: ["Assumed the role is backend-leaning"],
    wordCount: 210,
  },
};

describe("POST /api/cover-letter/generate", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the company name with 400", async () => {
    const res = await POST(req({ jobDescription: "Some JD text", companyName: "" }));
    expect(res.status).toBe(400);
  });

  it("returns the letter plus a naturalness read on success", async () => {
    mockOpenAI(LETTER_ENVELOPE);
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.coverLetter).toContain("Monzo");
    expect(json).toHaveProperty("naturalness");
  });

  it("500s rather than shipping an empty letter as a success", async () => {
    mockOpenAI({ data: { coverLetter: "", assumptions: [] } });
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("500s when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
