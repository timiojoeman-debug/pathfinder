import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getProfile, netContactKey, netDraftKey, recentCoffeeChat, usePfStore } from "../store";
import { MAX_JD_CHARS, postingKey, readinessFrom } from "../logic";
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

describe("pf store — Opportunity Discovery saves", () => {
  beforeEach(reset);

  const listing = (role: string) => ({
    company: "Monzo", role, meta: "London · Adzuna", fit: 0, fitKnown: false, dash: 144, tone: "var(--faint)",
    tags: ["Not scored"], verdict: "", action: "+ Save", jdText: "", url: "https://example.org/apply",
  });

  it("saves a live listing once, keeps its link, and logs JobSaved", () => {
    s().saveListing(listing("Backend Intern"));
    s().saveListing(listing("Backend Intern"));
    expect(s().savedJobs).toHaveLength(1);
    expect(s().savedJobs[0].url).toBe("https://example.org/apply");
    expect(s().savedJobs[0].action).toBe("Open");
    expect(lastEvent().type).toBe("JobSaved");
    // Unscored roles log no fit number.
    expect(lastEvent().meta).toEqual({ company: "Monzo" });
  });

  it("keeps two roles at one company apart, in the list and in the drawer key", () => {
    s().saveListing(listing("Backend Intern"));
    s().saveListing(listing("Data Intern"));
    expect(s().savedJobs).toHaveLength(2);
    s().openJob("Monzo", "Data Intern");
    expect(s().jobDetail).toBe("monzo::data intern");
  });

  it("attaches a kept cover letter only to the saved role with the same posting", () => {
    s().saveListing({ ...listing("Data Intern"), jdText: "Kafka and Go." });
    s().saveListing({ ...listing("Backend Intern"), jdText: "Kafka and Go." });
    // Same company and role as the first, but a different advert: not the same posting.
    usePfStore.setState({ savedJobs: [...s().savedJobs, { ...listing("Data Intern"), jdText: "Python only." }] });
    const key = postingKey("Monzo", "Data Intern", "Kafka and Go.");
    s().keepCoverLetter({ key, paras: ["Dear team,", "Thanks."], assumptions: [], words: 3 });
    const letters = s().savedJobs.map((j) => [j.role, j.jdText, j.coverLetter]);
    expect(letters).toContainEqual(["Data Intern", "Kafka and Go.", "Dear team,\n\nThanks."]);
    expect(letters).toContainEqual(["Data Intern", "Python only.", undefined]);
    expect(letters).toContainEqual(["Backend Intern", "Kafka and Go.", undefined]);
    expect(s().jfCoverLetter?.key).toBe(key);
  });

  it("caps the advert a saved listing keeps", () => {
    s().saveListing({ ...listing("Backend Intern"), jdText: "x".repeat(20000) });
    expect(s().savedJobs[0].jdText).toHaveLength(MAX_JD_CHARS);
  });

  it("hands an advert to the tailor panel and clears results run against the old one", () => {
    usePfStore.setState({ cvTailorJD: "old", cvTailorAts: { data: {} }, cvTailorMatch: { data: {} } });
    s().setTailorJD("new advert");
    expect(s().cvTailorJD).toBe("new advert");
    expect(s().cvTailorAts).toBeNull();
    expect(s().cvTailorMatch).toBeNull();
  });
});

describe("pf store — late AI results never overwrite newer input", () => {
  beforeEach(reset);

  const read = { skills: ["Kafka"], strengths: ["s"], nextSteps: ["n"], feedback: [{ issue: "i", suggestedFix: "f" }] };

  it("keeps a CV read only while the CV text is the text that was read", () => {
    usePfStore.setState({ cvText: "Edited after the request went out" });
    expect(s().keepCvAiRead(read, "Original CV text")).toBe(false);
    expect(s().cvAiRead).toBeNull();

    usePfStore.setState({ cvText: "Original CV text" });
    expect(s().keepCvAiRead(read, "Original CV text")).toBe(true);
    expect(s().cvAiRead?.skills).toEqual(["Kafka"]);
  });

  it("caps what a CV read persists", () => {
    usePfStore.setState({ cvText: "cv" });
    s().keepCvAiRead({ ...read, strengths: Array(50).fill("y".repeat(2000)), skills: Array(100).fill("z".repeat(200)) }, "cv");
    expect(s().cvAiRead!.strengths).toHaveLength(12);
    expect(s().cvAiRead!.strengths[0]).toHaveLength(300);
    expect(s().cvAiRead!.skills).toHaveLength(40);
    expect(s().cvAiRead!.skills[0]).toHaveLength(60);
  });

  it("keeps a Tailor result only while the advert is the one it ran against", () => {
    usePfStore.setState({ cvTailorJD: "new advert" });
    expect(s().keepTailorResult("ats", { data: { overallATSScore: 50 } }, "old advert")).toBe(false);
    expect(s().cvTailorAts).toBeNull();
    expect(s().keepTailorResult("match", { data: { matchScore: 70 } }, "new advert")).toBe(true);
    expect(s().cvTailorMatch).toEqual({ data: { matchScore: 70 } });
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
    expect(s().dirRole).toBe("Full-Stack");
    expect(s().dirIndustry).toBe("Fintech");
    expect(s().dirSize).toBe("Early-stage startups");
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

  it("acceptChat needs a stated role and industry, and never assumes a size", () => {
    usePfStore.setState({ dirMode: "explore", dirRole: "Frontend", dirIndustry: null });
    s().acceptChat();
    expect(s().dirMode).toBe("explore");

    usePfStore.setState({ dirIndustry: "Fintech", dirSize: null });
    s().acceptChat();
    expect(s().dirMode).toBe("wizard");
    expect(s().dirSize).toBeNull();
    expect(s().dirGenerated).toBe(false);
    expect(s().events).toHaveLength(0);

    usePfStore.setState({ dirMode: "explore", dirSize: "Scaleups" });
    s().acceptChat();
    expect(s().dirGenerated).toBe(true);
    expect(lastEvent().type).toBe("CareerDirectionUpdated");
  });

  it("changing a chip drops the AI statement written for the old chips", () => {
    usePfStore.setState({ dirGenerated: true, dirStatementAi: { statement: "x", specificity: "Clear", suggestions: [] } });
    s().pickDirChip("dirIndustry", "Fintech");
    expect(s().dirStatementAi).toBeNull();
    usePfStore.setState({ dirStatementAi: { statement: "x", specificity: "Clear", suggestions: [] } });
    s().toggleDirStack("Go");
    expect(s().dirStatementAi).toBeNull();
  });

  it("changing the role prunes target roles the list no longer offers", () => {
    usePfStore.setState({ dirTargetRoles: ["Retired Title", "Backend Engineer Intern"] });
    s().pickDirChip("dirIndustry", "Fintech");
    expect(s().dirTargetRoles).toHaveLength(2); // only a role change prunes
    s().pickDirChip("dirRole", "Backend");
    expect(s().dirTargetRoles).toEqual(["Backend Engineer Intern"]);
  });

  it("toggleDirTargetRole caps the list at three and logs each change", () => {
    s().toggleDirTargetRole("A");
    s().toggleDirTargetRole("B");
    s().toggleDirTargetRole("C");
    expect(s().dirTargetRoles).toEqual(["A", "B", "C"]);
    expect(lastEvent().type).toBe("CareerDirectionUpdated");
    expect(lastEvent().meta).toEqual({ targetRoles: "A, B, C" });

    const before = s().events.length;
    s().toggleDirTargetRole("D");
    expect(s().dirTargetRoles).toEqual(["A", "B", "C"]);
    expect(s().events).toHaveLength(before);

    s().toggleDirTargetRole("B");
    expect(s().dirTargetRoles).toEqual(["A", "C"]);
    s().toggleDirTargetRole("D");
    expect(s().dirTargetRoles).toEqual(["A", "C", "D"]);
  });

  it("persists target roles and the AI statement", () => {
    usePfStore.setState({ dirTargetRoles: ["A"], dirStatementAi: { statement: "x", specificity: "Clear", suggestions: [] } });
    const saved = usePfStore.persist.getOptions().partialize!(s()) as Record<string, unknown>;
    expect(saved.dirTargetRoles).toEqual(["A"]);
    expect(saved.dirStatementAi).toEqual({ statement: "x", specificity: "Clear", suggestions: [] });
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

  it("generateOutreach logs nothing without a recipient and a message", () => {
    expect(s().generateOutreach({ name: "", message: "Hi" })).toBe(false);
    expect(s().generateOutreach({ name: "Sam", message: "  " })).toBe(false);
    expect(s().netSent).toBe(0);
  });

  it("generateOutreach increments the sent count and logs a contact", () => {
    expect(s().generateOutreach({ name: "Sam Lee", company: "Monzo", message: "Hi Sam" })).toBe(true);
    expect(s().netGenerated).toBe(true);
    expect(s().netSent).toBe(1);
    expect(lastEvent().type).toBe("RecruiterContacted");
  });

  it("completeCoffeeChat counts one chat once: a repeat within 24 hours is refused", () => {
    expect(s().completeCoffeeChat({ contact: "Sam Lee", company: "Monzo" })).toBe(true);
    expect(s().completeCoffeeChat({ contact: " sam lee", company: "MONZO" })).toBe(false);
    // Same person at a different company is a different contact.
    expect(s().completeCoffeeChat({ contact: "Sam Lee", company: "Stripe" })).toBe(true);
    expect(getProfile().coffeeChatsDone).toBe(2);
  });

  it("recentCoffeeChat only matches the same contact + company inside a day", () => {
    const now = 10 * 86_400_000;
    const ev = (ts: number, meta: Record<string, string>) => ({ id: "x", type: "CoffeeChatCompleted" as const, phase: "networking" as const, label: "", ts, meta });
    expect(recentCoffeeChat([ev(now - 1000, { contact: "Sam", company: "Monzo" })], { contact: "sam", company: "monzo" }, now)).toBe(true);
    expect(recentCoffeeChat([ev(now - 86_400_001, { contact: "Sam", company: "Monzo" })], { contact: "Sam", company: "Monzo" }, now)).toBe(false);
    expect(recentCoffeeChat([ev(now - 1000, { contact: "Sam" })], { contact: "Sam", company: "Monzo" }, now)).toBe(false);
  });

  it("completeCoffeeChat refuses a chat with nobody named", () => {
    expect(s().completeCoffeeChat({ contact: "   ", company: "Monzo" })).toBe(false);
    expect(s().events).toHaveLength(0);
    expect(getProfile().coffeeChatsDone).toBe(0);
  });

  it("completeCoffeeChat logs a CoffeeChatCompleted with contact + company, feeding coffeeChatsDone", () => {
    expect(s().completeCoffeeChat({ contact: " Sam Lee ", company: " Monzo " })).toBe(true);
    expect(lastEvent()).toMatchObject({ type: "CoffeeChatCompleted", phase: "networking", meta: { contact: "Sam Lee", company: "Monzo" } });
    expect(s().completeCoffeeChat({ contact: "Ana" })).toBe(true);
    expect(lastEvent().meta).toEqual({ contact: "Ana" });
    expect(getProfile().coffeeChatsDone).toBe(2);
  });

  it("persists the working contact, research and last draft, and nothing else new", () => {
    const contact = { name: "Sam Lee", company: "Monzo", about: "Backend at Monzo", experience: "" };
    const draft = { key: netDraftKey("Recruiter", contact), paras: ["Hi Sam"], followUp: null, naturalness: null, questions: ["Q?"], topics: [] };
    const research = { key: netContactKey(contact), name: "Sam Lee", data: { summary: "Backend engineer" } };
    s().set({ netContact: contact, netResearch: research, netDraft: draft });
    const saved = JSON.parse(localStorage.getItem("pathfinder-redesign-v1") ?? "{}").state;
    expect(saved.netContact).toEqual(contact);
    expect(saved.netResearch).toEqual(research);
    expect(saved.netDraft).toEqual(draft);
  });

  it("netDraftKey ties a draft to its contact and persona, ignoring case and whitespace", () => {
    const a = netDraftKey("Recruiter", { name: "Sam Lee", company: "Monzo" });
    expect(netDraftKey("Recruiter", { name: " sam lee ", company: "MONZO" })).toBe(a);
    expect(netDraftKey("Hiring manager", { name: "Sam Lee", company: "Monzo" })).not.toBe(a);
    expect(netDraftKey("Recruiter", { name: "Ana", company: "Monzo" })).not.toBe(a);
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
    expect(saved.cards.map((c) => c.key)).toContain("vercel::frontend intern");
    expect(lastEvent().type).toBe("JobSaved");
    const count = saved.cards.length;
    s().trackJob({ company: "Vercel", role: "Frontend Intern", fit: 74, tone: "var(--strong)" });
    expect(s().board.find((c) => c.id === "saved")!.cards).toHaveLength(count);
  });

  it("moveCard relocates a card, stamps it, and logs the stage change", () => {
    s().trackJob({ company: "Monzo", role: "Backend Intern", fit: 66, tone: "var(--warn)" });
    s().moveCard("monzo::backend intern", "applied");
    const applied = s().board.find((c) => c.id === "applied")!;
    const card = applied.cards.find((c) => c.key === "monzo::backend intern");
    expect(card).toBeTruthy();
    expect(card!.tag).toBe("ATS ✓");
    expect(lastEvent().type).toBe("ApplicationSubmitted");
  });

  it("removeCard drops the card and clears the app drawer", () => {
    s().trackJob({ company: "Stripe", role: "SWE Intern", fit: 58, tone: "var(--warn)" });
    usePfStore.setState({ appDetail: "stripe::swe intern" });
    s().removeCard("stripe::swe intern");
    expect(s().board.flatMap((c) => c.cards).find((c) => c.key === "stripe::swe intern")).toBeUndefined();
    expect(s().appDetail).toBeNull();
  });

  it("setRemind stamps a reminder date on a card", () => {
    s().trackJob({ company: "FanDuel", role: "Backend Intern", fit: 73, tone: "var(--strong)" });
    s().setRemind("fanduel::backend intern", "2026-08-01");
    const card = s().board.flatMap((c) => c.cards).find((c) => c.key === "fanduel::backend intern");
    expect(card!.remind).toBe("2026-08-01");
  });

  it("setDiag records a rejection diagnosis event", () => {
    s().setDiag("optiver", "Within hours");
    expect(s().diags["optiver"]).toBe("Within hours");
    expect(lastEvent().type).toBe("RejectionDiagnosed");
  });

  it("tracks two roles at one company as two cards", () => {
    s().trackJob({ company: "Monzo", role: "Backend Intern", fit: 66, tone: "var(--warn)" });
    s().trackJob({ company: "Monzo", role: "Data Intern", fit: null, tone: "var(--faint)" });
    const saved = s().board.find((c) => c.id === "saved")!.cards;
    expect(saved).toHaveLength(2);
    expect(saved.find((c) => c.role === "Data Intern")!.match).toBeUndefined();
  });

  it("keeps the callback when an interviewed card is rejected, and logs the rejection", () => {
    s().trackJob({ company: "Monzo", role: "Backend Intern", fit: 66, tone: "var(--warn)" });
    s().moveCard("monzo::backend intern", "interview");
    s().moveCard("monzo::backend intern", "rejected");
    const card = s().board.find((c) => c.id === "rejected")!.cards[0];
    expect(card.reachedInterview).toBe(true);
    expect(lastEvent().label).toContain("Rejected");
  });

  it("logs a move made by dropping onto a card in another column", () => {
    s().trackJob({ company: "A", role: "R", fit: 60, tone: "" });
    s().trackJob({ company: "B", role: "R", fit: 60, tone: "" });
    s().moveCard("b::r", "applied");
    const before = s().events.length;
    s().moveCardBefore("a::r", "b::r");
    expect(s().board.find((c) => c.id === "applied")!.cards.map((c) => c.key)).toEqual(["a::r", "b::r"]);
    expect(s().events.length).toBe(before + 1);
    expect(lastEvent().type).toBe("ApplicationSubmitted");
  });
});

describe("pf store — instant actions (no pretend delays)", () => {
  beforeEach(() => { reset(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("analyzeCv ignores too-short input and analyses real CV text", () => {
    usePfStore.setState({ cvText: "too short" });
    s().analyzeCv();
    vi.runAllTimers();
    expect(s().cvAnalyzed).toBe(false);

    usePfStore.setState({ cvText: "x".repeat(120), dirStack: ["React", "Node"] });
    s().analyzeCv();
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
    expect(s().onb.step).not.toBe(3);
    usePfStore.setState({ onb: { ...s().onb, cadence: 42 } });
    s().startOnbScan();
    expect(s().onb.step).toBe(3);
  });
});

describe("pf store — university", () => {
  beforeEach(reset);

  it("trims and clips to 120 characters", () => {
    s().setUniversity("  University of Edinburgh  ");
    expect(s().university).toBe("University of Edinburgh");
    s().setUniversity("x".repeat(200));
    expect(s().university).toHaveLength(120);
  });

  it("is persisted", () => {
    s().setUniversity("Durham");
    const saved = usePfStore.persist.getOptions().partialize!(s()) as Record<string, unknown>;
    expect(saved.university).toBe("Durham");
  });

  it("merge turns a non-string into an empty string and keeps a string", () => {
    const merge = usePfStore.persist.getOptions().merge!;
    expect((merge({ university: 42 }, PRISTINE) as { university: string }).university).toBe("");
    expect((merge({}, PRISTINE) as { university: string }).university).toBe("");
    expect((merge({ university: " Durham " }, PRISTINE) as { university: string }).university).toBe("Durham");
  });
});

describe("pf store — location", () => {
  beforeEach(reset);

  it("trims and clips to 120 characters", () => {
    s().setLocation("  London, UK  ");
    expect(s().location).toBe("London, UK");
    s().setLocation("x".repeat(200));
    expect(s().location).toHaveLength(120);
  });

  it("persists, and a non-string stored value becomes empty on rehydrate", async () => {
    s().setLocation("Leeds");
    expect(JSON.parse(localStorage.getItem("pathfinder-redesign-v1")!).state.location).toBe("Leeds");
    localStorage.setItem("pathfinder-redesign-v1", JSON.stringify({ state: { location: 42 }, version: 0 }));
    await usePfStore.persist.rehydrate();
    expect(s().location).toBe("");
  });
});
