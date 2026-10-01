import { describe, it, expect } from "vitest";
import { buildCoffeeChatPrepPrompt, buildFollowUpPrompt } from "../networking-prompts";
import { parseContactType } from "@/lib/contact-type";

/* A recruiter or hiring manager cannot refer anyone, so their prompts must not
   carry the referral scripts, and must say so; a peer keeps them. */
describe("contact type in the networking prompts", () => {
  const prep = (t: Parameters<typeof buildCoffeeChatPrepPrompt>[5]) =>
    buildCoffeeChatPrepPrompt("Dana", "Recruiter", "Stripe", "A CS student", 0, t);

  it("keeps the referral asks for a peer, which is also the default", () => {
    expect(prep("peer")).toMatch(/Direct referral ask/);
    expect(buildCoffeeChatPrepPrompt("Dana", "Engineer", "Stripe", "A CS student", 0)).toMatch(/TRUST-DRIVEN/);
  });

  it("drops the referral asks for recruiters and hiring managers", () => {
    for (const t of ["recruiter", "hiring_manager"] as const) {
      const p = prep(t);
      expect(p).not.toMatch(/Direct referral ask|Indirect referral ask/);
      expect(p).toMatch(/FIT-DRIVEN/);
      expect(p).toMatch(/never a referral request/);
    }
  });

  it("frames the follow-up the same way", () => {
    expect(buildFollowUpPrompt("Dana", "notes", 1, "recruiter")).toMatch(/FIT-DRIVEN/);
    expect(buildFollowUpPrompt("Dana", "notes", 1)).toMatch(/TRUST-DRIVEN/);
  });

  it("treats anything unrecognised in a request body as a peer", () => {
    expect(parseContactType("recruiter")).toBe("recruiter");
    expect(parseContactType("ceo")).toBe("peer");
    expect(parseContactType(undefined)).toBe("peer");
  });
});
