// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * Narration is a presentation layer: the model restates already-derived facts
 * and must add no number, score, or claim. These tests hold that a real
 * narration passes through (root or nested under `data`), and an empty
 * narration 500s rather than rendering a blank mirror.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/mentor/narrate", {
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

const NARRATION = {
  narration: "You've set a backend direction and analysed your CV. The main gap is Go, which you haven't evidenced yet.",
  focus: "Close the Go gap with a small shipped project.",
};

const FACTS = { directionStatement: "Backend engineering", progressLines: ["45% · CV"], weaknesses: ["Go"] };

describe("POST /api/mentor/narrate", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns the narration on success", async () => {
    mockOpenAI(NARRATION);
    const res = await POST(req(FACTS));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.narration).toContain("backend direction");
    expect(json.focus).toContain("Go");
  });

  it("unwraps a narration nested under `data` (aiShape)", async () => {
    mockOpenAI({ data: NARRATION });
    const res = await POST(req(FACTS));
    const json = await res.json();
    expect(json.narration).toContain("backend direction");
  });

  it("500s when the model returns an empty narration", async () => {
    mockOpenAI({ narration: "" });
    const res = await POST(req(FACTS));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });

  it("500s when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req(FACTS));
    expect(res.status).toBe(500);
  });
});
