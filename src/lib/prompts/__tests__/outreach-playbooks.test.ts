import { describe, it, expect } from "vitest";
import { buildOutreachPrompt } from "../networking-prompts";
import { NETWORKING_STRATEGY } from "@/lib/methodology";
import { SOURCES } from "@/lib/knowledge/sources";
import { NETWORKING_KNOWLEDGE } from "@/lib/knowledge/domains/networking";

const p = (contactType: "recruiter" | "hiringManager" | "peer") =>
  buildOutreachPrompt({ studentProfile: "s", contactProfile: "c", contactType, roleName: "r" });

describe("outreach prompt: who to ask for what", () => {
  it("never lets a recruiter or hiring manager be asked for a referral or a job", () => {
    for (const t of ["recruiter", "hiringManager"] as const) {
      const out = p(t);
      expect(out).toContain("NEVER ask them for a referral or a job");
      expect(out).toContain("Never ask this contact for a referral.");
    }
  });

  it("asks a peer for a story first, not a referral", () => {
    const out = p("peer");
    expect(out).toContain("not a referral and not a job");
    expect(out).not.toContain("NEVER ask them for a referral");
  });

  it("carries the matrix, the 300-character anatomy and the nine signals", () => {
    const out = p("recruiter");
    expect(out).toContain("Hiring managers: Fit-driven");
    expect(out).toContain("at most 300 characters");
    expect(out).toContain("Recruiter note: Purpose:");
    expect(p("peer")).toContain("Peer note:");
    for (const s of NETWORKING_STRATEGY.personalisationSignals) expect(out).toContain(s.signal);
    expect(NETWORKING_STRATEGY.personalisationSignals).toHaveLength(9);
  });

  it("includes the transactional vs relationship guidance", () => {
    expect(p("peer")).toContain("Can I learn from you?");
  });
});

describe("networking events knowledge", () => {
  it("cites sources that exist", () => {
    const ids = [...NETWORKING_KNOWLEDGE.playbooks, ...NETWORKING_KNOWLEDGE.frameworks].flatMap((x) => x.sourceIds);
    for (const id of ids) expect(SOURCES[id], id).toBeDefined();
    expect(NETWORKING_KNOWLEDGE.playbooks.some((x) => x.id === "pb-network-at-events")).toBe(true);
  });
});
