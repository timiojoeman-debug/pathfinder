import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { usePfStore } from "../store";
import { readinessFrom } from "../logic";
import { LEETCODE_PROBLEMS } from "../leetcode";

/**
 * The Zustand store is the app's live state and the input to every Career-OS
 * derivation. These tests drive the actions directly (getState/setState) and
 * assert both the state transition and the event it appends — the event log is
 * what the profile, progress and recommendations are all computed from.
 */

// Snapshot of the pristine store (defaults + action fns) to reset between tests.
const PRISTINE = usePfStore.getState();

function reset() {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
}

const s = () => usePfStore.getState();
const lastEvent = () => s().events[s().events.length - 1];

describe("pf store — shell + drawers", () => {
  beforeEach(reset);

  it("toggles the collapsed sidebar", () => {
    expect(s().collapsed).toBe(false);
    s().toggleCollapsed();
    expect(s().collapsed).toBe(true);
  });

  it("opens and closes the palette, clearing the query", () => {
    usePfStore.setState({ paletteQ: "leftover" });
    s().openPalette();
    expect(s().paletteOpen).toBe(true);
    expect(s().paletteQ).toBe("");
    s().closePalette();
    expect(s().paletteOpen).toBe(false);
  });

  it("opens a job drawer and closes the app drawer, and vice versa", () => {
    s().openJob("Monzo");
    expect(s().jobDetail).toBe("Monzo");
    expect(s().appDetail).toBeNull();
    s().openApp("card-1");
    expect(s().appDetail).toBe("card-1");
    expect(s().jobDetail).toBeNull();
    s().closeDrawers();
    expect(s().appDetail).toBeNull();
    expect(s().jobDetail).toBeNull();
  });
});

describe("pf store — event log + AI memory", () => {
  beforeEach(reset);

  it("emit appends a typed event", () => {
    s().emit("CVAnalyzed", "cv", "CV analyzed — ATS 62", { score: 62 });
    expect(s().events).toHaveLength(1);
    expect(lastEvent().type).toBe("CVAnalyzed");
    expect(lastEvent().label).toContain("ATS 62");
  });

  it("logAi keeps only the 30 most recent interactions, newest first", () => {
    for (let i = 0; i < 35; i++) {
      s().logAi({ feature: "cv", summary: `run ${i}` } as never);
    }
    expect(s().aiLog).toHaveLength(30);
    expect((s().aiLog[0] as { summary: string }).summary).toBe("run 34");
  });
});

describe("pf store — onboarding handoff", () => {
  beforeEach(reset);

  it("finishOnb carries the target into the direction chips and logs baseline events", () => {
    usePfStore.setState({
      onb: { step: 2, role: "Software Engineering", industry: "Fintech", stage: "Seed–Series B startups", cv: 45, projects: 42, outreach: 42, cadence: 42 },
    });
    s().finishOnb();
    expect(s().onbDone).toBe(true);
    expect(s().dirRole).toBe("Full-Stack SWE");
    expect(s().dirIndustry).toBe("Fintech");
    expect(s().dirSize).toBe("Startups 0–50");
    const types = s().events.map((e) => e.type);
    expect(types).toContain("ProfileCreated");
    expect(types).toContain("CareerDirectionUpdated");
  });

  it("does not clobber a direction the student already built in the wizard", () => {
    usePfStore.setState({
      dirRole: "Backend",
      onb: { step: 2, role: "Software Engineering", industry: "Fintech", stage: "Big Tech", cv: 10, projects: 10, outreach: 10, cadence: 10 },
    });
    s().finishOnb();
    expect(s().dirRole).toBe("Backend");
  });

  it("readiness() reflects the self-rated onboarding sliders", () => {
    usePfStore.setState({ onb: { ...s().onb, cv: 45, projects: 42, outreach: 42, cadence: 42 } });
    expect(s().readiness()).toBe(readinessFrom(s().onb));
  });
});

describe("pf store — direction chips + chat", () => {
  beforeEach(reset);

  it("pickDirChip sets the chip and invalidates a stale generation", () => {
    usePfStore.setState({ dirGenerated: true });
    s().pickDirChip("dirRole", "Backend");
    expect(s().dirRole).toBe("Backend");
    expect(s().dirGenerated).toBe(false);
  });

  it("toggleDirStack adds then removes a technology", () => {
    s().toggleDirStack("Go");
    expect(s().dirStack).toContain("Go");
    s().toggleDirStack("Go");
    expect(s().dirStack).not.toContain("Go");
  });

  it("sendChat appends a you+ai turn and advances the counter; empty draft is a no-op", () => {
    usePfStore.setState({ chatDraft: "   " });
    s().sendChat();
    expect(s().chat).toHaveLength(0);

    usePfStore.setState({ chatDraft: "I like building interfaces" });
    s().sendChat();
    expect(s().chat).toHaveLength(2);
    expect(s().chat[0].who).toBe("you");
    expect(s().chat[1].who).toBe("ai");
    expect(s().chatN).toBe(1);
    expect(s().chatDraft).toBe("");
  });
});

describe("pf store — jobs + networking + interview", () => {
  beforeEach(reset);

  it("saveJfJob is a no-op without a title and company", () => {
    usePfStore.setState({ jfTitle: "SWE Intern", jfCompany: "" });
    s().saveJfJob();
    expect(s().savedJobs).toHaveLength(0);
  });

  it("saveJfJob adds a scored saved job and logs it", () => {
    usePfStore.setState({ jfTitle: "Backend Intern", jfCompany: "Monzo", jfJD: "We use Go, PostgreSQL and Docker to build REST services at scale." });
    s().saveJfJob();
    expect(s().savedJobs).toHaveLength(1);
    expect(s().savedJobs[0].company).toBe("Monzo");
    expect(lastEvent().type).toBe("JobSaved");
  });

  it("generateOutreach increments the sent count and logs a contact", () => {
    s().generateOutreach();
    expect(s().netGenerated).toBe(true);
    expect(s().netSent).toBe(1);
    expect(lastEvent().type).toBe("RecruiterContacted");
  });

  it("saveFeedback needs a company and rating, then records and resets", () => {
    usePfStore.setState({ fbCompany: "Skyscanner", fbRating: 0 });
    s().saveFeedback();
    expect(s().ivFeedback).toHaveLength(0);

    usePfStore.setState({ fbCompany: "Skyscanner", fbRating: 4, fbNote: "Rushed the tradeoffs." });
    s().saveFeedback();
    expect(s().ivFeedback).toHaveLength(1);
    expect(s().ivFeedback[0].rating).toBe(4);
    expect(s().fbCompany).toBe("");
    expect(s().fbRating).toBe(0);
    expect(lastEvent().type).toBe("InterviewCompleted");
  });

  it("toggleProblem ticks a real problem and logs a solve, then un-ticks without a second event", () => {
    const slug = LEETCODE_PROBLEMS[0].slug;
    s().toggleProblem(slug);
    expect(s().ivProblems[slug]).toBe(true);
    expect(lastEvent().type).toBe("LeetCodeSolved");
    const eventCount = s().events.length;
    s().toggleProblem(slug);
    expect(s().ivProblems[slug]).toBeUndefined();
    // Un-ticking is a correction, not an achievement — no new event.
    expect(s().events).toHaveLength(eventCount);
  });
});

describe("pf store — tracker board", () => {
  beforeEach(reset);

  it("trackJob adds a card to Saved, logs it, and dedupes on a second call", () => {
    s().trackJob({ company: "Vercel", role: "Frontend Intern", fit: 74, tone: "var(--strong)" });
    const saved = s().board.find((c) => c.id === "saved")!;
    expect(saved.cards.map((c) => c.key)).toContain("vercel");
    expect(lastEvent().type).toBe("JobSaved");
    const count = saved.cards.length;
    s().trackJob({ company: "Vercel", role: "Frontend Intern", fit: 74, tone: "var(--strong)" });
    expect(s().board.find((c) => c.id === "saved")!.cards).toHaveLength(count);
  });

  it("moveCard relocates a card, stamps it, and logs the stage change", () => {
    s().trackJob({ company: "Monzo", role: "Backend Intern", fit: 66, tone: "var(--warn)" });
    s().moveCard("monzo", "applied");
    const applied = s().board.find((c) => c.id === "applied")!;
    const card = applied.cards.find((c) => c.key === "monzo");
    expect(card).toBeTruthy();
    expect(card!.tag).toBe("ATS ✓");
    expect(lastEvent().type).toBe("ApplicationSubmitted");
  });

  it("removeCard drops the card and clears the app drawer", () => {
    s().trackJob({ company: "Stripe", role: "SWE Intern", fit: 58, tone: "var(--warn)" });
    usePfStore.setState({ appDetail: "stripe" });
    s().removeCard("stripe");
    expect(s().board.flatMap((c) => c.cards).find((c) => c.key === "stripe")).toBeUndefined();
    expect(s().appDetail).toBeNull();
  });

  it("setRemind stamps a reminder date on a card", () => {
    s().trackJob({ company: "FanDuel", role: "Backend Intern", fit: 73, tone: "var(--strong)" });
    s().setRemind("fanduel", "2026-08-01");
    const card = s().board.flatMap((c) => c.cards).find((c) => c.key === "fanduel");
    expect(card!.remind).toBe("2026-08-01");
  });

  it("setDiag records a rejection diagnosis event", () => {
    s().setDiag("optiver", "Within hours");
    expect(s().diags["optiver"]).toBe("Within hours");
    expect(lastEvent().type).toBe("RejectionDiagnosed");
  });
});

describe("pf store — timer-driven actions", () => {
  beforeEach(() => { reset(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("analyzeCv ignores too-short input and analyses real CV text", () => {
    usePfStore.setState({ cvText: "too short" });
    s().analyzeCv();
    vi.runAllTimers();
    expect(s().cvAnalyzed).toBe(false);

    usePfStore.setState({ cvText: "x".repeat(120), dirStack: ["React", "Node"] });
    s().analyzeCv();
    expect(s().cvAnalyzing).toBe(true);
    vi.runAllTimers();
    expect(s().cvAnalyzed).toBe(true);
    expect(s().cvScores).toHaveLength(1);
    expect(lastEvent().type).toBe("CVAnalyzed");
  });

  it("analyzeJf needs a substantial JD, then produces a result and logs the match", () => {
    usePfStore.setState({ jfJD: "short jd" });
    s().analyzeJf();
    vi.runAllTimers();
    expect(s().jfResult).toBeNull();

    usePfStore.setState({ jfJD: "We build Go and PostgreSQL services with Docker, Kubernetes and REST APIs at real production scale.", jfCompany: "Monzo" });
    s().analyzeJf();
    vi.runAllTimers();
    expect(s().jfResult).not.toBeNull();
    expect(lastEvent().type).toBe("JobMatched");
  });

  it("generateDirection needs role+industry+size, then sets generated and logs it", () => {
    s().generateDirection();
    vi.runAllTimers();
    expect(s().dirGenerated).toBe(false);

    usePfStore.setState({ dirRole: "Backend", dirIndustry: "Fintech", dirSize: "Scaleups" });
    s().generateDirection();
    vi.runAllTimers();
    expect(s().dirGenerated).toBe(true);
    expect(lastEvent().type).toBe("CareerDirectionUpdated");
  });

  it("startOnbScan only runs once every self-rating is chosen", () => {
    usePfStore.setState({ onb: { ...s().onb, cv: 45, projects: 42, outreach: 42, cadence: null } });
    s().startOnbScan();
    expect(s().onbScanning).toBe(false);

    usePfStore.setState({ onb: { ...s().onb, cadence: 42 } });
    s().startOnbScan();
    expect(s().onbScanning).toBe(true);
    vi.runAllTimers();
    expect(s().onbScanning).toBe(false);
    expect(s().onb.step).toBe(3);
  });
});
