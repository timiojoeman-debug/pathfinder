// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

function req(body: unknown): Request {
  return new Request("http://test/api/network/coffee-chat-prep", {
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

const PREP_ENVELOPE = {
  methodologyReference: "TechTalk Coffee Chat Mastery",
  data: {
    openingScript: "Thanks so much for taking the time, Dana...",
    conversationQuestions: ["What does a strong intern look like on your team?"],
  },
};

describe("POST /api/network/coffee-chat-prep", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the contact name or company", async () => {
    const res = await POST(req({ contactName: "Dana" }));
    expect(res.status).toBe(400);
  });

  it("returns the prep envelope on success", async () => {
    mockOpenAI(PREP_ENVELOPE);
    const res = await POST(req({ contactName: "Dana", contactCompany: "Stripe", contactRole: "Engineer" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.openingScript).toContain("Dana");
    expect(json.data.conversationQuestions).toHaveLength(1);
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ contactName: "Dana", contactCompany: "Stripe" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
