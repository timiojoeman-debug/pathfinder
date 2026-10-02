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

describe("POST /api/network/follow-up — kind: application", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  const promptSent = () => {
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    return body.messages.map((m: { content: string }) => m.content).join(" ");
  };

  it("needs a company and role, but no contact name or cadence step", async () => {
    expect((await POST(req({ kind: "application", company: "Acme" }))).status).toBe(400);
    mockOpenAI({ data: { message: "Hello, I applied for the Backend Intern role at Acme last month." } });
    const res = await POST(req({ kind: "application", company: "Acme", role: "Backend Intern" }));
    expect(res.status).toBe(200);
    expect((await res.json()).naturalness).toBeTruthy();
  });

  it("guards against implying a conversation and against unfilled brackets", async () => {
    mockOpenAI({ data: { message: "Hello, following up on my application." } });
    await POST(req({ kind: "application", company: "Acme", role: "Backend Intern", appliedOn: "1 September" }));
    const prompt = promptSent();
    expect(prompt).toContain("There has been NO prior conversation");
    expect(prompt).toMatch(/no square brackets/i);
    expect(prompt).not.toMatch(/reconnect when timing works|full relationship context/i);
  });

  it("greets generically with no recruiter name, and by name when given", async () => {
    mockOpenAI({ data: { message: "Hello, following up." } });
    await POST(req({ kind: "application", company: "Acme", role: "Backend Intern" }));
    expect(promptSent()).toContain('Open with exactly: "Hello,"');
    expect(promptSent()).not.toContain("Hi the Acme");
    vi.unstubAllGlobals();

    mockOpenAI({ data: { message: "Hi Sam, following up." } });
    await POST(req({ kind: "application", company: "Acme", role: "Backend Intern", contactName: "Sam" }));
    expect(promptSent()).toContain('Open with exactly: "Hi Sam,"');
  });
});
