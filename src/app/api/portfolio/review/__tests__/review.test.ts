// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

/**
 * Portfolio review is paste-in and evidence-grounded: it needs real pasted
 * content, it passes the model's read through on success, and it errors rather
 * than inventing feedback when the model is unreachable.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/portfolio/review", {
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

const validPayload = {
  methodologyReference: "TechTalk CV Blueprint - Portfolio Review",
  data: {
    overallImpression: "Two solid projects; neither is deployed with a live URL.",
    strengths: ["Clear READMEs"],
    gaps: ["Deployed URL", "Tests"],
    projectFeedback: [{ name: "Task Tracker", verdict: "Reads well but not deployed", missing: ["Deployed URL"] }],
    topFixes: ["Deploy the task tracker"],
  },
};

describe("POST /api/portfolio/review", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects near-empty portfolio text before spending a call", async () => {
    const res = await POST(req({ portfolioText: "too short" }));
    expect(res.status).toBe(400);
  });

  it("returns the model's review when it answers with a valid envelope", async () => {
    mockOpenAI(validPayload);
    const res = await POST(req({
      portfolioText: "Task Tracker — a React app my classmates use. Node/Postgres backend. Has a README.",
      targetRole: "Full-Stack Engineer",
      techStack: ["React", "Node"],
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.overallImpression).toContain("deployed");
    expect(json.data.projectFeedback[0].name).toBe("Task Tracker");
  });

  it("errors rather than inventing a review when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({
      portfolioText: "Task Tracker — a React app my classmates use. Node/Postgres backend. Has a README.",
    }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(json.data).toBeUndefined();
  });
});
