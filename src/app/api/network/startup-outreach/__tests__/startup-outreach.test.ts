// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * Startup outreach attaches a naturalness read (scored against `data.message`)
 * and refuses a generic email: the one specific company detail is
 * non-negotiable, so a missing/short detail is a 400 the prompt builder throws.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/network/startup-outreach", {
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

const DETAIL = "I read your engineering blog post on cutting cold-start latency with a warm pool.";
const OUTREACH_ENVELOPE = {
  methodologyReference: "TechTalk Startup Outreach",
  data: { message: "Hi — your post on cold-start latency really landed with me..." },
};

describe("POST /api/network/startup-outreach", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the company name", async () => {
    const res = await POST(req({ companyDetail: DETAIL }));
    expect(res.status).toBe(400);
  });

  it("refuses a generic email with no specific company detail (400, not retryable)", async () => {
    const res = await POST(req({ companyName: "Acme", companyDetail: "cool startup" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.retryable).toBe(false);
    expect(json.error).toMatch(/non-negotiable/i);
  });

  it("returns the message plus a naturalness read on success", async () => {
    mockOpenAI(OUTREACH_ENVELOPE);
    const res = await POST(req({ companyName: "Acme", companyDetail: DETAIL }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toContain("cold-start");
    expect(json).toHaveProperty("naturalness");
    expect(json.naturalness).toBeTruthy();
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ companyName: "Acme", companyDetail: DETAIL }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
