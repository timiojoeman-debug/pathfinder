import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../app-store";

/**
 * The app store is the legacy local-first slice (direction, CV, applications,
 * contacts, stories, LeetCode, reviews, explore chat). These tests pin the CRUD
 * actions — add returns an id, updates merge, removes filter, and the nested
 * direction/preferences merge doesn't clobber sibling fields.
 */

const PRISTINE = useAppStore.getState();
const s = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(PRISTINE, true);
  localStorage.clear();
});

describe("app store — direction + cv", () => {
  it("setDirection merges top-level fields", () => {
    s().setDirection({ statement: "Backend in fintech", score: 82 });
    expect(s().direction.statement).toBe("Backend in fintech");
    expect(s().direction.score).toBe(82);
  });

  it("setDirectionPreferences merges without clobbering siblings", () => {
    s().setDirectionPreferences({ industry: "fintech" });
    s().setDirectionPreferences({ roleType: "Backend" });
    expect(s().direction.preferences.industry).toBe("fintech");
    expect(s().direction.preferences.roleType).toBe("Backend");
  });

  it("setCVData merges the CV slice", () => {
    s().setCVData({ rawText: "my cv", analysisScore: 64 });
    expect(s().cv.rawText).toBe("my cv");
    expect(s().cv.analysisScore).toBe(64);
  });
});

describe("app store — applications CRUD", () => {
  const app = { company: "Monzo", role: "Backend Intern", status: "researching" as const, matchScore: 66, atsKeywords: ["Go"] };

  it("addApplication returns an id and appends the row", () => {
    const id = s().addApplication(app);
    expect(id).toBeTruthy();
    expect(s().applications).toHaveLength(1);
    expect(s().applications[0].id).toBe(id);
  });

  it("updateApplication merges into the matching row only", () => {
    const id = s().addApplication(app);
    s().addApplication({ ...app, company: "Stripe" });
    s().updateApplication(id, { notes: "referred by Priya" });
    expect(s().applications.find((a) => a.id === id)!.notes).toBe("referred by Priya");
    expect(s().applications.find((a) => a.company === "Stripe")!.notes).toBeUndefined();
  });

  it("moveApplication changes only the status", () => {
    const id = s().addApplication(app);
    s().moveApplication(id, "applied");
    expect(s().applications.find((a) => a.id === id)!.status).toBe("applied");
  });

  it("removeApplication filters the row out", () => {
    const id = s().addApplication(app);
    s().removeApplication(id);
    expect(s().applications).toHaveLength(0);
  });
});

describe("app store — contacts + stories CRUD", () => {
  it("adds, updates, and removes a contact", () => {
    const id = s().addContact({ name: "Dana", company: "Stripe", role: "Engineer", contactType: "peer", followUpStep: 0 });
    expect(s().contacts).toHaveLength(1);
    s().updateContact(id, { followUpStep: 1 });
    expect(s().contacts[0].followUpStep).toBe(1);
    s().removeContact(id);
    expect(s().contacts).toHaveLength(0);
  });

  it("adds, updates, and removes a STAR story", () => {
    s().addStory({ category: "conflict", situation: "s", task: "t", action: "a", result: "r", mappedQuestions: [] });
    const id = s().stories[0].id;
    s().updateStory(id, { result: "shipped on time" });
    expect(s().stories[0].result).toBe("shipped on time");
    s().removeStory(id);
    expect(s().stories).toHaveLength(0);
  });
});

describe("app store — leetcode, reviews, explore chat", () => {
  it("toggleLeetCodeProblem ticks and un-ticks within the right list", () => {
    s().toggleLeetCodeProblem("two-sum", "75");
    expect(s().leetcode.neetCode75Completed).toContain("two-sum");
    expect(s().leetcode.neetCode150Completed).not.toContain("two-sum");
    s().toggleLeetCodeProblem("two-sum", "75");
    expect(s().leetcode.neetCode75Completed).not.toContain("two-sum");
  });

  it("tracks the 150 list independently of the 75 list", () => {
    s().toggleLeetCodeProblem("three-sum", "150");
    expect(s().leetcode.neetCode150Completed).toContain("three-sum");
    expect(s().leetcode.neetCode75Completed).toHaveLength(0);
  });

  it("appends a Friday review", () => {
    s().addFridayReview({ date: "2026-07-25", clarity: true, positioning: false, networking: true, consistency: false });
    expect(s().fridayReviews).toHaveLength(1);
  });

  it("appends then clears the explore conversation", () => {
    s().addExploreMessage("user", "I like data work");
    s().addExploreMessage("assistant", "Consider ML infra");
    expect(s().exploreConversation).toHaveLength(2);
    s().clearExploreConversation();
    expect(s().exploreConversation).toHaveLength(0);
  });

  it("records that the networking education was shown", () => {
    s().setNetworkingEducationShown(true);
    expect(s().networkingEducationShown).toBe(true);
  });
});
