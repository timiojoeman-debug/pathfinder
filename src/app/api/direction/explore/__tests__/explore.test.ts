// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

function req(body: unknown): Request {
  return new Request("http://test/api/direction/explore", {
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

const ENVELOPE = {
  methodologyReference: "TechTalk Direction - Explore",
  data: { response: "Given your interest in data, backend and ML-infra roles are worth exploring next." },
};

describe("POST /api/direction/explore", () => {
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

  it("returns the explore reply on success", async () => {
    mockOpenAI(ENVELOPE);
    const res = await POST(req({ messages: [{ role: "user", content: "I like working with data." }] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.response).toContain("backend");
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
