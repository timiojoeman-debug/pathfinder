import { describe, it, expect } from "vitest";
import { cleanMustHaves, summariseMustHaves, findGenericAbout, JD_DECODER } from "../recruiter-signals";
import { buildMatchScorePrompt, buildPortfolioReviewPrompt } from "@/lib/prompts/cv-prompts";
import { buildProjectPrompt } from "@/lib/prompts/project-builder-prompts";
import { SOURCES } from "@/lib/knowledge/sources";
import { JOBS_KNOWLEDGE } from "@/lib/knowledge/domains/jobs";

describe("summariseMustHaves", () => {
  it("derives x of y and applies the 70% rule", () => {
    const rows = [{ skill: "SQL", met: true }, { skill: "Python", met: true }, { skill: "dbt", met: false }];
    expect(summariseMustHaves(rows)).toEqual({ met: 2, total: 3, pct: 67, meetsRule: false });
    expect(summariseMustHaves([...rows, { skill: "Git", met: true }])?.meetsRule).toBe(true); // 3 of 4 = 75%
  });
  it("returns null for no must-haves rather than a fake 0 of 0", () => {
    expect(summariseMustHaves([])).toBeNull();
  });
  it("treats exactly 70% as meeting the rule", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ skill: `s${i}`, met: i < 7 }));
    expect(summariseMustHaves(rows)?.meetsRule).toBe(true);
  });
});

describe("cleanMustHaves", () => {
  it("drops malformed rows and only counts met === true", () => {
    expect(cleanMustHaves([{ skill: " SQL ", met: true }, { skill: "", met: true }, { met: true }, null, { skill: "R", met: "yes" }]))
      .toEqual([{ skill: "SQL", met: true }, { skill: "R", met: false }]);
    expect(cleanMustHaves("nope")).toEqual([]);
  });
});

describe("findGenericAbout", () => {
  it("flags the generic About copy from the portfolio deck", () => {
    const hits = findGenericAbout("I'm a passionate problem solver who loves collaboration and a team player.");
    expect(hits).toEqual(expect.arrayContaining(["passionate problem solver", "problem solver who loves", "team player"]));
  });
  it("leaves specific copy alone", () => {
    expect(findGenericAbout("I run 10k on Sundays and rebuilt my uni's society booking tool.")).toEqual([]);
  });
});

describe("prompts", () => {
  it("match prompt teaches the signal words and asks for mustHaves", () => {
    const p = buildMatchScorePrompt("A JD");
    for (const w of JD_DECODER.mustHaveWords) expect(p).toContain(w);
    expect(p).toContain("shows up 3 times");
    expect(p).toContain('"mustHaves"');
  });
  it("portfolio prompt no longer assumes software engineering and adds the new checks", () => {
    const p = buildPortfolioReviewPrompt("", []);
    expect(p).not.toContain("Software Engineer");
    expect(p).toContain("do not assume software engineering");
    expect(p).toContain("ANSWER-FIRST");
    expect(p).toContain("PAGE-STRUCTURE");
    expect(p).toContain("aboutGeneric");
    expect(buildPortfolioReviewPrompt("Marketing Analyst", [])).toContain("TARGET ROLE: Marketing Analyst");
  });
  it("project prompt asks for a case-study skeleton and allows non-engineering roles", () => {
    const p = buildProjectPrompt([], [], "");
    expect(p).toContain('"caseStudy"');
    expect(p).toContain("NEVER invent results");
    expect(p).not.toContain("Software Engineering Intern");
  });
});

describe("provenance", () => {
  it("registers both decks and cites them from the jobs knowledge", () => {
    expect(SOURCES["deck-recruiters-looking-for"]).toBeTruthy();
    expect(SOURCES["deck-portfolio"]).toBeTruthy();
    expect(JOBS_KNOWLEDGE.principles.some((p) => p.sourceIds.includes("deck-recruiters-looking-for"))).toBe(true);
  });
});
