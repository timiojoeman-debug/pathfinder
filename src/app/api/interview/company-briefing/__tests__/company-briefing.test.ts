// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

function req(body: unknown): Request {
  return new Request("http://test/api/interview/company-briefing", {
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

const BRIEFING_ENVELOPE = {
  methodologyReference: "TechTalk Interview Prep - Company Research",
  data: { companyOverview: "Monzo is a UK challenger bank building on Go microservices.", talkingPoints: ["Ask about their move off the monolith"] },
};

describe("POST /api/interview/company-briefing", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the company name", async () => {
    const res = await POST(req({ roleName: "Backend Intern" }));
    expect(res.status).toBe(400);
  });

  it("returns the briefing envelope on success", async () => {
    mockOpenAI(BRIEFING_ENVELOPE);
    const res = await POST(req({ companyName: "Monzo", roleName: "Backend Intern" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.companyOverview).toContain("Monzo");
  });

  it("asks for beginner / intermediate / advanced tiers and keeps the honesty rules", async () => {
    mockOpenAI(BRIEFING_ENVELOPE);
    await POST(req({ companyName: "Monzo", roleName: "Backend Intern" }));
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    const prompt = body.messages.map((m: { content: string }) => m.content).join(" ");
    for (const k of ["beginner", "intermediate", "advanced", "competitiveLandscape", "strategicSignals", "whatItMeansForTheRole", "angles", "insight", "uncertainties"]) {
      expect(prompt).toContain(k);
    }
    expect(prompt).toMatch(/Never invent/);
  });

  it("passes a tiered payload through, and still accepts the old flat one", async () => {
    mockOpenAI({ data: { companyOverview: "Monzo.", tiers: { advanced: { insight: "Lending is the lever." } } } });
    const res = await POST(req({ companyName: "Monzo" }));
    expect((await res.json()).data.tiers.advanced.insight).toBe("Lending is the lever.");
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ companyName: "Monzo" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
