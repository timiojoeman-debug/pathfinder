import { describe, it, expect } from "vitest";
import { recommend, topRecommendation } from "../recommendations";
import type { CareerProfile } from "../profile";
import type { ProgressReport } from "../progress";
import type { PfPhase } from "../events";

/**
 * The recommendation engine ranks the single next action from the whole
 * profile. These tests pin the gating logic for each rec and the overall
 * ordering — advice must shift as the student progresses, and the fallback
 * must keep the lowest phase moving when nothing else fires.
 */

function mkProfile(overrides: Partial<CareerProfile> = {}): CareerProfile {
  return {
    targetRole: null, targetIndustry: null, companySize: null, workSetting: null,
    directionStatement: null, directionSet: false, targetStack: [], coffeeChatsDone: 0,
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

const PHASES: PfPhase[] = ["direction", "cv", "jobs", "networking", "interview", "tracker"];

function mkProgress(pcts: Partial<Record<PfPhase, number>> = {}): ProgressReport {
  return {
    phases: PHASES.map((phase) => ({ phase, label: phase[0].toUpperCase() + phase.slice(1), pct: pcts[phase] ?? 50, tone: "" })),
    overall: 0,
    band: "",
  };
}

const ids = (p: CareerProfile, pr = mkProgress()) => recommend(p, pr).map((r) => r.id);

describe("recommend — gating per action", () => {
  it("tells a fresh user to set direction first, above everything", () => {
    const recs = recommend(mkProfile(), mkProgress());
    expect(recs[0].id).toBe("set-direction");
    expect(recs[0].priority).toBe(100);
  });

  it("moves to CV analysis once direction is set", () => {
    expect(ids(mkProfile({ directionSet: true }))).toContain("analyze-cv");
  });

  it("pushes an ATS fix — naming the missing skills — when the score is low", () => {
    const recs = recommend(mkProfile({ directionSet: true, cvAnalyzed: true, atsScore: 50, missingSkills: ["Go", "Docker", "Kubernetes"] }), mkProgress());
    const raise = recs.find((r) => r.id === "raise-ats");
    expect(raise).toBeTruthy();
    expect(raise!.why).toContain("Go");
  });

  it("suggests a project when two+ target skills have no evidence", () => {
    expect(ids(mkProfile({ directionSet: true, missingSkills: ["Go", "Rust"] }))).toContain("build-project");
  });

  it("surfaces networking early (priority 90) once the CV clears a basic bar", () => {
    const recs = recommend(mkProfile({ directionSet: true, cvAnalyzed: true, atsScore: 60, contactedCompanies: [] }), mkProgress());
    // start-networking (90) outranks raise-ats (88) at the same ATS.
    expect(recs[0].id).toBe("start-networking");
  });

  it("starts interview prep before the first callback", () => {
    expect(ids(mkProfile({ directionSet: true, cvAnalyzed: true, atsScore: 70, contactedCompanies: ["A", "B", "C"], applicationsSubmitted: 2, leetSolved: 0, interviewsLanded: 0 }))).toContain("build-interview-readiness");
  });

  it("prioritises converting interviews already earned", () => {
    expect(ids(mkProfile({ directionSet: true, cvAnalyzed: true, atsScore: 70, contactedCompanies: ["A", "B", "C"], applicationsSubmitted: 5, interviewsLanded: 1, leetSolved: 20 }))).toContain("prep-interviews");
  });

  it("says start applying once the CV clears the bar and the pipeline is thin", () => {
    const recs = recommend(mkProfile({ directionSet: true, cvAnalyzed: true, atsScore: 68, contactedCompanies: ["A", "B", "C"], applicationsSubmitted: 0, targetCompanies: [{ company: "Monzo", role: "Backend", fit: 66, stage: "Prospect" }] }), mkProgress());
    const apply = recs.find((r) => r.id === "start-applying");
    expect(apply).toBeTruthy();
    expect(apply!.why).toContain("Monzo");
  });

  it("rebalances toward networking after over-applying", () => {
    expect(ids(mkProfile({ directionSet: true, cvAnalyzed: true, atsScore: 70, contactedCompanies: ["A", "B", "C"], applicationsSubmitted: 6, outreachSent: 0 }))).toContain("rebalance");
  });

  it("drills the weakest pattern when an interview is in the pipeline", () => {
    expect(ids(mkProfile({ directionSet: true, weakPatterns: ["Graphs"], interviewsLanded: 1 }))).toContain("drill-pattern");
  });
});

describe("recommend — fallback and ordering", () => {
  it("falls back to keeping the lowest phase moving when nothing else fires", () => {
    const p = mkProfile({
      directionSet: true, cvAnalyzed: true, atsScore: 70, projectsGenerated: true,
      contactedCompanies: ["A", "B", "C"], applicationsSubmitted: 3, leetSolved: 30, interviewsLanded: 0,
    });
    const recs = recommend(p, mkProgress({ networking: 12, direction: 90 }));
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe("advance-lowest");
    expect(recs[0].phase).toBe("networking");
    expect(recs[0].why).toContain("12%");
  });

  it("returns recommendations sorted by descending priority", () => {
    const recs = recommend(mkProfile({ directionSet: true, cvAnalyzed: true, atsScore: 60, missingSkills: ["Go", "Rust"] }), mkProgress());
    const priorities = recs.map((r) => r.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
  });

  it("topRecommendation returns the single highest-priority action", () => {
    expect(topRecommendation(mkProfile(), mkProgress()).id).toBe("set-direction");
  });
});

describe("recommend — scheme timing", () => {
  it("lifts a due dated step above networking, and ignores one not yet due", () => {
    const p = mkProfile({ directionSet: true, atsScore: 70, schemeWindows: [{ company: "Stripe", role: "SWE Intern", deadline: "2026-11-30" }] });
    const recs = recommend(p, mkProgress(), "2026-11-18");
    expect(recs[0]).toMatchObject({ id: "timing-stripe-apply", priority: 95 });
    expect(recommend(p, mkProgress(), "2026-09-01").some((r) => r.id.startsWith("timing-"))).toBe(false);
  });
});

describe("recommend — tracker reminders and follow-ups", () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
  const card = (over: Partial<CareerProfile["trackedCards"][number]>) => ({ key: "monzo::backend intern", company: "Monzo", role: "Backend Intern", column: "applied" as const, ...over });

  it("raises a reminder on or after its date, opening the card, and not before", () => {
    const p = mkProfile({ directionSet: true, trackedCards: [card({ remind: "2026-10-02" })] });
    expect(recommend(p, mkProgress(), "2026-10-01").some((r) => r.id.startsWith("remind-"))).toBe(false);
    const due = recommend(p, mkProgress(), "2026-10-02").find((r) => r.id.startsWith("remind-"));
    expect(due).toMatchObject({ href: "/tracker", cardKey: "monzo::backend intern", impact: "due today" });
    expect(recommend(p, mkProgress(), "2026-10-05").find((r) => r.id.startsWith("remind-"))!.impact).toBe("overdue");
  });

  it("nudges a follow-up once an Applied card is 14 days old, and not for one that moved on", () => {
    const applied = mkProfile({ directionSet: true, trackedCards: [card({ appliedDate: day("2026-09-18") })] });
    expect(recommend(applied, mkProgress(), "2026-10-01").some((r) => r.id.startsWith("follow-up-"))).toBe(false);
    const nudge = recommend(applied, mkProgress(), "2026-10-02").find((r) => r.id.startsWith("follow-up-"));
    expect(nudge).toMatchObject({ href: "/tracker", cardKey: "monzo::backend intern" });
    expect(nudge!.why).toContain("14 days");

    const interviewing = mkProfile({ directionSet: true, trackedCards: [card({ column: "interview", appliedDate: day("2026-08-01") })] });
    expect(recommend(interviewing, mkProgress(), "2026-10-02").some((r) => r.id.startsWith("follow-up-"))).toBe(false);
  });

  it("does not stack a follow-up on top of a due reminder for the same card", () => {
    const p = mkProfile({ directionSet: true, trackedCards: [card({ remind: "2026-10-01", appliedDate: day("2026-08-01") })] });
    const ids = recommend(p, mkProgress(), "2026-10-02").map((r) => r.id);
    expect(ids).toContain("remind-monzo::backend intern");
    expect(ids.some((id) => id.startsWith("follow-up-"))).toBe(false);
  });
});
