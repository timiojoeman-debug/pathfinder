// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * The mentor chat is advisory only — it answers and points to a page, and the
 * client writes nothing from the reply back into the store. These tests hold
 * the route contract: at least one message is required, a real reply passes
 * through, and an empty reply 500s rather than rendering a blank bubble.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/mentor/chat", {
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

const ONE_TURN = { messages: [{ role: "user", content: "What should I do next?" }] };

describe("POST /api/mentor/chat", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request with no messages", async () => {
    const res = await POST(req({ messages: [] }));
    expect(res.status).toBe(400);
  });

  it("returns the mentor's reply on success", async () => {
    mockOpenAI({ reply: "Head to the Networking page — that's where referrals come from." });
    const res = await POST(req({ ...ONE_TURN, context: { targetRole: "Backend Intern", progressLines: ["45% · CV"] } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toContain("Networking page");
  });

  it("500s when the model returns an empty reply", async () => {
    mockOpenAI({ reply: "" });
    const res = await POST(req(ONE_TURN));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });

  it("500s when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req(ONE_TURN));
    expect(res.status).toBe(500);
  });
});
