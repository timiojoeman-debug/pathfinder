// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * Follow-up generation attaches a naturalness read, and — the CLAUDE.md trap —
 * must read the message out of `data`, not the envelope root. It also refuses a
 * step-1 follow-up with no chat notes (a genuine follow-up needs something to
 * follow up on), which the prompt builder throws and the route maps to a 400.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/network/follow-up", {
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

const FOLLOWUP_ENVELOPE = {
  methodologyReference: "TechTalk Coffee Chat Mastery - Follow-up",
  data: { message: "Hi Dana, thanks again for the chat about your team's testing culture..." },
};

describe("POST /api/network/follow-up", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the contact name or cadence step", async () => {
    const res = await POST(req({ contactName: "Dana" }));
    expect(res.status).toBe(400);
  });

  it("refuses a step-1 follow-up with no chat notes (400, not retryable)", async () => {
    const res = await POST(req({ contactName: "Dana", cadenceStep: 1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.retryable).toBe(false);
    expect(json.error).toMatch(/what you discussed/i);
  });

  it("returns the message plus a naturalness read on success", async () => {
    mockOpenAI(FOLLOWUP_ENVELOPE);
    const res = await POST(req({ contactName: "Dana", cadenceStep: 2, chatNotes: "Talked about testing culture." }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toContain("Dana");
    // The naturalness read must be scored against the real message, not "".
    expect(json).toHaveProperty("naturalness");
    expect(json.naturalness).toBeTruthy();
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ contactName: "Dana", cadenceStep: 2, chatNotes: "Notes." }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
