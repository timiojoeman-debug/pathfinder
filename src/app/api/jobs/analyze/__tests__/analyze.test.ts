// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * `/jobs/analyze` fires the ATS audit and match score in parallel, then merges
 * them; on any AI failure it degrades to a deterministic keyword-overlap score
 * (never an error). These tests hold both: a real analysis passes through, and
 * a model outage returns the heuristic fallback rather than 500-ing.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/jobs/analyze", {
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

// One payload that satisfies both the ATS and match schemas — the two parallel
// calls hit the same stubbed fetch.
const COMBINED = {
  criticalKeywords: [
    { keyword: "React", foundInCV: true, suggestedPlacement: "skills" },
    { keyword: "Node", foundInCV: false, suggestedPlacement: "skills" },
    { keyword: "TypeScript", foundInCV: true, suggestedPlacement: "headline" },
  ],
  atsChecklist: [{ item: "One page, ATS-friendly", passed: true, fix: "" }],
  overallATSScore: 72,
  matchScore: 68,
  matchedSkills: ["React", "TypeScript"],
  missingSkills: ["Go"],
};

describe("POST /api/jobs/analyze", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request with an empty job description", async () => {
    const res = await POST(req({ jobDescription: "" }));
    expect(res.status).toBe(400);
  });

  it("merges the ATS audit and match score on success", async () => {
    mockOpenAI(COMBINED);
    const res = await POST(req({ jobDescription: "React + Node + TypeScript role", cvSummary: "React, TypeScript" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchScore).toBe(68);
    expect(json.atsKeywords).toContain("React");
    expect(json.auditChecklist[0]).toContain("One page");
  });

  it("degrades to the deterministic keyword score when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ jobDescription: "React and Node and TypeScript backend role", cvSummary: "" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.matchScore).toBe("number");
    // The fallback keywords come from the job description overlap.
    expect(json.atsKeywords).toContain("react");
    expect(json.auditChecklist).toHaveLength(4);
  });
});
