// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildMentorContext, whatChanged, callMentor, type AiInteraction } from "../orchestrator";
import type { CareerProfile } from "../profile";
import type { PfEvent } from "../events";

/**
 * The orchestrator composes the profile into a memory context, summarises the
 * event stream, and calls an AI route while logging the interaction. These
 * tests pin the context contents (what the mentor is told), the "what changed"
 * feed, and callMentor's success/failure contract.
 */

function mkProfile(overrides: Partial<CareerProfile> = {}): CareerProfile {
  return {
    targetRole: null, targetIndustry: null, companySize: null, workSetting: null,
    directionStatement: null, directionSet: false, targetStack: [], coffeeChatsDone: 0, contactNudges: [], referralsReceived: 0,
    currentSkills: [], missingSkills: [], targetKeywords: [],
    cvAnalyzed: false, cvHasContent: false, atsScore: null, atsHistory: [], atsDelta: null, projectsGenerated: false,
    targetCompanies: [], applicationsSubmitted: 0, interviewsLanded: 0, offers: 0, interviewRate: 0, schemeWindows: [],
    outreachSent: 0, contactedCompanies: [],
    leetSolved: 0, weakPatterns: [], interviewsLogged: 0, storiesPrepared: 0, trackedCards: [],
    strengths: [], weaknesses: [], currentPhase: "direction",
    events: [],
    ...overrides,
  };
}

describe("buildMentorContext", () => {
  it("says direction is not set for an empty profile", () => {
    const ctx = buildMentorContext(mkProfile(), []);
    expect(ctx).toContain("Direction: not set yet");
    // Always includes the applications / networking / interview summary lines.
    expect(ctx).toContain("Applications: 0 submitted");
  });

  it("renders the substantive facts of a rich profile", () => {
    const ctx = buildMentorContext(
      mkProfile({
        directionStatement: "Backend engineering in fintech",
        targetRole: "Backend Engineer", targetIndustry: "fintech", companySize: "scaleup",
        currentSkills: ["Go", "Postgres"], missingSkills: ["Kubernetes"],
        atsScore: 71, atsDelta: 19,
        targetCompanies: [{ company: "Monzo", role: "Backend", fit: 66, stage: "Prospect" }],
        applicationsSubmitted: 4, interviewsLanded: 1, offers: 0,
        outreachSent: 3, contactedCompanies: ["Monzo"],
        leetSolved: 40, weakPatterns: ["Graphs"],
        strengths: ["Ships real projects"], weaknesses: ["No distributed-systems evidence"],
      }),
      [],
    );
    expect(ctx).toContain("Backend engineering in fintech");
    expect(ctx).toContain("Target role: Backend Engineer in fintech at scaleup");
    expect(ctx).toContain("Current ATS score: 71 (+19 over time)");
    expect(ctx).toContain("Monzo (Prospect, fit 66)");
    expect(ctx).toContain("weak in Graphs");
    expect(ctx).toContain("Strengths: Ships real projects");
  });

  it("appends a recent-sessions block when interactions are supplied", () => {
    const interactions: AiInteraction[] = [{ phase: "cv", summary: "Analysed the CV — ATS 71", ts: Date.now() - 1000 }];
    const ctx = buildMentorContext(mkProfile(), interactions);
    expect(ctx).toContain("RECENT AI SESSIONS");
    expect(ctx).toContain("Analysed the CV — ATS 71");
  });
});

describe("whatChanged", () => {
  const events = [
    { ts: 1, label: "first" },
    { ts: 3, label: "third" },
    { ts: 2, label: "second" },
  ] as unknown as PfEvent[];

  it("returns labels newest-first", () => {
    expect(whatChanged(events)).toEqual(["third", "second", "first"]);
  });

  it("respects the limit", () => {
    expect(whatChanged(events, 2)).toEqual(["third", "second"]);
  });
});

describe("callMentor", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(ok: boolean, json: unknown) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(ok ? JSON.stringify(json) : "err", { status: ok ? 200 : 500, headers: { "Content-Type": "application/json" } })));
  }

  const opts = (parse: (j: unknown) => string | null) => ({
    phase: "cv" as const,
    endpoint: "/api/cv/match",
    profile: mkProfile(),
    interactions: [] as AiInteraction[],
    buildBody: (ctx: string) => ({ context: ctx }),
    parse,
    summarize: (r: string) => `Result: ${r}`,
  });

  it("returns the parsed result and an AiConsulted event on success", async () => {
    stubFetch(true, { value: "ok" });
    const { result, event } = await callMentor(opts((j) => (j as { value: string }).value));
    expect(result).toBe("ok");
    expect(event?.type).toBe("AiConsulted");
    expect(event?.label).toBe("Result: ok");
  });

  it("returns nulls when the route responds non-ok", async () => {
    stubFetch(false, null);
    const { result, event } = await callMentor(opts(() => "unused"));
    expect(result).toBeNull();
    expect(event).toBeNull();
  });

  it("returns nulls when parse rejects the payload", async () => {
    stubFetch(true, { value: "ok" });
    const { result, event } = await callMentor(opts(() => null));
    expect(result).toBeNull();
    expect(event).toBeNull();
  });

  it("swallows a network error and returns nulls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const { result, event } = await callMentor(opts(() => "x"));
    expect(result).toBeNull();
    expect(event).toBeNull();
  });
});
