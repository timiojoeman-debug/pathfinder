// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * Title variants answer at the root (aiShape tolerates nesting under `data`).
 * The route surfaces an AIError's own status — a schema mismatch becomes a 502,
 * which the client can retry — rather than flattening everything to 500.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/direction/title-variants", {
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

const VARIANTS = {
  variants: [
    { title: "Backend Engineer", note: "Broadest reach" },
    { title: "Platform Engineer", note: "Infra-leaning" },
  ],
};

describe("POST /api/direction/title-variants", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("passes the student's shortlisted target roles into the prompt", async () => {
    mockOpenAI(VARIANTS);
    const res = await POST(req({ role: "Backend", targetRoles: ["Platform / Infrastructure Intern"] }));
    expect(res.status).toBe(200);
    const sent = (globalThis.fetch as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body;
    expect(sent).toContain("Platform / Infrastructure Intern");
  });

  it("rejects more than three target roles", async () => {
    const res = await POST(req({ role: "Backend", targetRoles: ["a", "b", "c", "d"] }));
    expect(res.status).toBe(400);
  });

  it("rejects a request with no role", async () => {
    const res = await POST(req({ role: "" }));
    expect(res.status).toBe(400);
  });

  it("returns variants answered at the root", async () => {
    mockOpenAI(VARIANTS);
    const res = await POST(req({ role: "Software Engineer", techStack: ["Go"], industry: "fintech" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.variants[0].title).toBe("Backend Engineer");
  });

  it("unwraps variants nested under `data` (aiShape)", async () => {
    mockOpenAI({ data: VARIANTS });
    const res = await POST(req({ role: "Software Engineer" }));
    const json = await res.json();
    expect(json.variants).toHaveLength(2);
  });

  it("surfaces a 502 when the model's shape fails validation", async () => {
    mockOpenAI({ variants: [] }); // min(1) violated
    const res = await POST(req({ role: "Software Engineer" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.retryable).toBe(true);
  });

  it("surfaces the AIError status when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ role: "Software Engineer" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
