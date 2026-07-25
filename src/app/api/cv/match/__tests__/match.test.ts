// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

function req(body: unknown): Request {
  return new Request("http://test/api/cv/match", {
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

const MATCH_ENVELOPE = {
  methodologyReference: "TechTalk CV Blueprint - Match",
  data: { matchScore: 72, matchedSkills: ["React", "TypeScript"], missingSkills: ["Go"] },
};

describe("POST /api/cv/match", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the job description", async () => {
    const res = await POST(req({ cvData: "React dev" }));
    expect(res.status).toBe(400);
  });

  it("returns the match envelope on success", async () => {
    mockOpenAI(MATCH_ENVELOPE);
    const res = await POST(req({ jobDescription: "React + TS role", cvData: "React, TypeScript" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.matchScore).toBe(72);
    expect(json.data.matchedSkills).toContain("React");
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ jobDescription: "React role" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
