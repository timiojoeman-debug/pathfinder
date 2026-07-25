// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

function req(body: unknown): Request {
  return new Request("http://test/api/cv/ats-audit", {
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

const ATS_ENVELOPE = {
  methodologyReference: "TechTalk CV Blueprint - ATS",
  data: { overallATSScore: 64, criticalKeywords: ["Kubernetes", "CI/CD"] },
};

describe("POST /api/cv/ats-audit", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the job description", async () => {
    const res = await POST(req({ cvData: "DevOps engineer" }));
    expect(res.status).toBe(400);
  });

  it("returns the ATS envelope on success", async () => {
    mockOpenAI(ATS_ENVELOPE);
    const res = await POST(req({ jobDescription: "SRE role, Kubernetes", cvData: "Docker, some k8s" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.overallATSScore).toBe(64);
    expect(json.data.criticalKeywords).toContain("Kubernetes");
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ jobDescription: "SRE role" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
