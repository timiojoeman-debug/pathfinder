import { describe, it, expect } from "vitest";
import { factsFromClientState } from "../client-state-context";

const NOW = new Date("2026-10-02T12:00:00Z").getTime(); // a Friday

describe("factsFromClientState", () => {
  it("reads applications, networking and prep from the synced store snapshot", () => {
    const f = factsFromClientState(
      {
        dirRole: "Backend", dirIndustry: "Fintech", dirStack: ["Go", 3],
        cvAiRead: { skills: ["Go", "SQL"] },
        board: [
          { id: "saved", cards: [{ key: "a", company: "Saved Co" }] },
          { id: "applied", cards: [{ key: "b", company: "Monzo", appliedDate: NOW - 3600e3 }, { key: "c", company: "Revolut", appliedDate: NOW - 30 * 864e5 }] },
          { id: "interview", cards: [{ key: "d", company: "Stripe" }] },
          { id: "rejected", cards: [{ key: "e", company: "Wise" }] },
        ],
        diags: { e: "Within hours" },
        events: [
          { type: "RecruiterContacted", meta: { contact: "Sam", company: "Monzo" } },
          { type: "RecruiterContacted", meta: { contact: "Sam", company: "Monzo" } },
          { type: "CoffeeChatCompleted", meta: { contact: "Sam" } },
        ],
        netSent: 2,
        savedStories: [{}, {}],
        ivProblems: { "two-sum": true, "valid-anagram": true, "3sum": false },
      },
      NOW,
    );
    expect(f.role).toBe("Backend");
    expect(f.techStack).toEqual(["Go"]);
    expect(f.skills).toEqual(["Go", "SQL"]);
    expect(f.applications.total).toBe(4); // saved roles aren't applications
    expect(f.applications.thisWeek).toBe(1);
    expect(f.applications.statuses).toEqual({ applied: 2, interviewing: 1, rejected: 1 });
    expect(f.applications.companies).toEqual(["Monzo", "Revolut", "Stripe", "Wise"]);
    expect(f.applications.recentRejectionTimings).toEqual(["Within hours"]);
    expect(f.networking).toEqual({ contactsCount: 1, coffeeChatsDone: 1, messagesSent: 2 });
    expect(f.interviewPrep).toEqual({ storiesCount: 2, leetcodeSolved: 2 });
  });

  it("survives a missing or malformed snapshot", () => {
    for (const bad of [null, undefined, "x", 4, [], { board: "nope", events: {}, ivProblems: [] }]) {
      const f = factsFromClientState(bad, NOW);
      expect(f.applications.total).toBe(0);
      expect(f.networking.coffeeChatsDone).toBe(0);
      expect(f.interviewPrep.leetcodeSolved).toBe(0);
    }
  });
});
