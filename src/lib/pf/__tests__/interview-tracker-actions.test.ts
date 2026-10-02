import { describe, it, expect, beforeEach } from "vitest";
import { usePfStore } from "../store";
import { deriveProfile } from "../profile";
import { computeProgress } from "../progress";
import { dominantRejectionTiming } from "../logic";
import { DIAG_FIX } from "../data";
import { applicationFollowUpNotes } from "@/components/pf/tracker/follow-up-draft";

/**
 * Store actions behind the Interview and Tracker honesty pass: saved STAR
 * stories (the evidence for "stories prepared"), the per-company briefing
 * memory, hand-added tracker cards and editable notes.
 */

const PRISTINE = usePfStore.getState();
const s = () => usePfStore.getState();
const lastEvent = () => s().events[s().events.length - 1];
const cards = () => s().board.flatMap((col) => col.cards.map((c) => ({ ...c, column: col.id })));

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
});

const BEATS = { situation: "Build kept breaking.", task: "Keep us shipping.", action: "Added CI and reviews.", result: "Breakages hit zero." };

describe("STAR stories", () => {
  it("saves a complete story, logs StoryPrepared, and counts it in the profile", () => {
    expect(s().saveStory({ title: "Broken build", ...BEATS })).toBe(true);
    expect(s().savedStories).toHaveLength(1);
    expect(s().savedStories[0]).toMatchObject({ title: "Broken build", ...BEATS });
    expect(lastEvent().type).toBe("StoryPrepared");
    expect(deriveProfile({ ...s() }).storiesPrepared).toBe(1);
  });

  it("refuses a story with an empty beat", () => {
    expect(s().saveStory({ title: "x", ...BEATS, result: "  " })).toBe(false);
    expect(s().savedStories).toHaveLength(0);
    expect(s().events).toHaveLength(0);
  });

  it("deletes a story, and the count follows", () => {
    s().saveStory({ title: "", ...BEATS });
    expect(s().savedStories[0].title).toBe(BEATS.situation);
    s().deleteStory(s().savedStories[0].id);
    expect(deriveProfile({ ...s() }).storiesPrepared).toBe(0);
  });

  it("moves interview readiness modestly: five stories are worth 15 points, no more", () => {
    const before = computeProgress(deriveProfile({ ...s() })).phases.find((p) => p.phase === "interview")!.pct;
    for (let i = 0; i < 7; i++) s().saveStory({ title: `s${i}`, ...BEATS });
    const after = computeProgress(deriveProfile({ ...s() })).phases.find((p) => p.phase === "interview")!.pct;
    expect(after - before).toBe(15);
  });
});

describe("company briefings", () => {
  it("keeps the latest briefing per company, case-insensitively", () => {
    s().saveBriefing({ company: "Monzo", role: "Backend Intern", data: { companyOverview: "old" } });
    s().saveBriefing({ company: "monzo ", role: "Backend Intern", data: { companyOverview: "new" } });
    expect(Object.keys(s().ivBriefings)).toEqual(["monzo"]);
    expect(s().ivBriefings.monzo.data.companyOverview).toBe("new");
  });
});

describe("tracker — add application", () => {
  it("adds a card to the chosen column, keyed by company and role, with no match score", () => {
    expect(s().addCard({ company: " Monzo ", role: "Backend Intern", column: "applied", link: "https://monzo.com/careers/1", appliedOn: "2026-09-01" })).toBe(true);
    const c = cards()[0];
    expect(c).toMatchObject({ key: "monzo::backend intern", company: "Monzo", column: "applied", link: "https://monzo.com/careers/1" });
    expect(c.match).toBeUndefined();
    expect(c.appliedDate).toBe(new Date("2026-09-01T00:00:00").getTime());
    expect(lastEvent()).toMatchObject({ type: "ApplicationSubmitted", phase: "tracker" });
  });

  it("refuses a duplicate or an empty field, and drops a non-http link", () => {
    s().addCard({ company: "Monzo", role: "Backend Intern", column: "saved", link: "javascript:alert(1)" });
    expect(cards()[0].link).toBeUndefined();
    expect(cards()[0].appliedDate).toBeUndefined();
    expect(lastEvent().type).toBe("JobSaved");
    expect(s().addCard({ company: "monzo", role: "backend intern", column: "applied" })).toBe(false);
    expect(s().addCard({ company: "Wise", role: " ", column: "applied" })).toBe(false);
    expect(cards()).toHaveLength(1);
  });

  it("marks a card added straight to Interview as a callback", () => {
    s().addCard({ company: "Wise", role: "SWE Intern", column: "interview" });
    expect(cards()[0]).toMatchObject({ column: "interview", reachedInterview: true });
    expect(lastEvent().type).toBe("InterviewScheduled");
  });
});

describe("tracker — notes", () => {
  it("edits a card's note and logs it once, ignoring an unchanged save", () => {
    s().addCard({ company: "Monzo", role: "Backend Intern", column: "applied" });
    const n = s().events.length;
    s().setCardNote("monzo::backend intern", "Spoke to Sam in recruiting.");
    expect(cards()[0].note).toBe("Spoke to Sam in recruiting.");
    s().setCardNote("monzo::backend intern", "Spoke to Sam in recruiting.");
    expect(s().events).toHaveLength(n + 1);
  });
});

describe("rejection fix routing", () => {
  it("sends slow rejections and silence to networking, fast ones to the CV", () => {
    const route = (t: string) => DIAG_FIX[dominantRejectionTiming({ a: t, b: t })!.timing].href;
    expect(route("Within hours")).toBe("/cv");
    expect(route("1–2 days")).toBe("/cv");
    expect(route("1–2 weeks")).toBe("/networking");
    expect(route("Never")).toBe("/networking");
    expect(dominantRejectionTiming({ a: "Never" })).toBeNull();
  });
});

describe("application follow-up notes", () => {
  it("tells the model there was no conversation, and carries the card's note", () => {
    const notes = applicationFollowUpNotes({ company: "Monzo", role: "Backend Intern", appliedDate: new Date("2026-09-01T00:00:00").getTime(), note: "Referred by Sam." });
    expect(notes).toContain("Backend Intern role at Monzo on 1 September");
    expect(notes).toMatch(/no conversation/i);
    expect(notes).toContain("Referred by Sam.");
  });
});
