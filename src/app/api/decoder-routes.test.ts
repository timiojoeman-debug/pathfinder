// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST as match } from "./cv/match/route";
import { POST as portfolio } from "./portfolio/review/route";
import { POST as linkedin } from "./linkedin/check/route";
import { POST as projects } from "./project-builder/generate/route";

/** New-material tests: must-haves, portfolio beyond code, CV vs LinkedIn, case-study skeleton. */

function req(path: string, body: unknown): Request {
  return new Request(`http://test/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockOpenAI(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

const sentBody = () => (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string;

const MATCH = { data: { matchScore: 72, matchedSkills: ["React"], missingSkills: ["Go"] } };
const PORTFOLIO = { data: { overallImpression: "ok", strengths: [], gaps: [], projectFeedback: [], topFixes: [] } };
const LINKEDIN = { score: 6, feedback: [], data: { suggestedHeadline: "Student | React" }, keywordAnalysis: { keywords: [] } };

describe("new decoder / portfolio / consistency routes", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("cv/match returns cleaned mustHaves beside the envelope", async () => {
    mockOpenAI({ ...MATCH, mustHaves: [{ skill: "React", met: true }, { skill: "", met: true }, { skill: "Go", met: false }] });
    const json = await (await match(req("cv/match", { jobDescription: "React + Go role", cvData: "React" }))).json();
    expect(json.mustHaves).toEqual([{ skill: "React", met: true }, { skill: "Go", met: false }]);
    expect(json.data.matchScore).toBe(72);
  });

  it("cv/match falls back to mustHaves nested under data, then to an empty list", async () => {
    mockOpenAI({ data: { ...MATCH.data, mustHaves: [{ skill: "SQL", met: true }] } });
    expect((await (await match(req("cv/match", { jobDescription: "SQL role" }))).json()).mustHaves).toEqual([{ skill: "SQL", met: true }]);
    mockOpenAI(MATCH);
    expect((await (await match(req("cv/match", { jobDescription: "SQL role" }))).json()).mustHaves).toEqual([]);
  });

  it("portfolio/review does not default to Software Engineer and flags generic About copy", async () => {
    mockOpenAI(PORTFOLIO);
    const res = await portfolio(req("portfolio/review", {
      portfolioText: "Campaign case study. About me: I am a passionate problem solver who loves collaboration.",
    }));
    expect((await res.json()).genericPhrases).toContain("passionate problem solver");
    expect(sentBody()).not.toContain("Software Engineer");
    expect(sentBody()).toContain("ANSWER-FIRST");
  });

  it("portfolio/review uses the student's own role", async () => {
    mockOpenAI(PORTFOLIO);
    await portfolio(req("portfolio/review", {
      portfolioText: "A UX redesign case study for a bank app, with research and a prototype.",
      targetRole: "Product Designer",
    }));
    expect(sentBody()).toContain("TARGET ROLE: Product Designer");
  });

  it("linkedin/check adds the mismatch instruction only when a CV summary is pasted", async () => {
    mockOpenAI(LINKEDIN);
    await linkedin(req("linkedin/check", { headline: "Dev", aboutSection: "I build.", cvSummary: "Software Intern at Acme, 2024" }));
    expect(sentBody()).toContain("CV CONSISTENCY CHECK");
    expect(sentBody()).toContain("titles, roles");
    expect(sentBody()).toContain("Software Intern at Acme, 2024");

    mockOpenAI(LINKEDIN);
    await linkedin(req("linkedin/check", { headline: "Dev" }));
    expect(sentBody()).not.toContain("CV CONSISTENCY CHECK");
  });

  it("project-builder/generate asks for the case-study skeleton and no engineering default", async () => {
    mockOpenAI({ data: { projects: [{ title: "x" }] } });
    await projects(req("project-builder/generate", { skillGaps: ["SQL"] }));
    expect(sentBody()).toContain("caseStudy");
    expect(sentBody()).not.toContain("Software Engineering Intern");
  });
});
