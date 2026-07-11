import { describe, it, expect } from "vitest";
import { roleDifficulty, roleFit } from "../probability";

describe("roleDifficulty", () => {
  it("returns the neutral baseline for an empty description", () => {
    expect(roleDifficulty("")).toBe(50);
  });

  it("raises difficulty for senior / experienced roles", () => {
    expect(roleDifficulty("Senior Engineer, 5+ years required")).toBeGreaterThan(50);
  });

  it("lowers difficulty for internships and graduate roles", () => {
    expect(roleDifficulty("Summer internship for graduate students")).toBeLessThan(50);
  });

  it("clamps within bounds", () => {
    const veryHard = "Senior Staff Principal Lead Manager 10+ years PhD expert";
    const veryEasy = "intern graduate entry-level junior placement trainee student first-year";
    expect(roleDifficulty(veryHard)).toBeLessThanOrEqual(90);
    expect(roleDifficulty(veryEasy)).toBeGreaterThanOrEqual(15);
  });
});

describe("roleFit", () => {
  it("classifies a strong candidate on an entry role as a strong match", () => {
    const fit = roleFit(85, "Graduate software engineering internship, no experience required");
    expect(fit.band).toBe("strong");
    expect(fit.tone).toBe("good");
  });

  it("classifies a weak baseline on a senior role as a reach", () => {
    const fit = roleFit(25, "Senior engineer with 7+ years and a PhD");
    expect(fit.band).toBe("reach");
  });

  it("keeps pct within 4–96", () => {
    expect(roleFit(0, "Senior Principal 10+ years PhD").pct).toBeGreaterThanOrEqual(4);
    expect(roleFit(100, "graduate internship student entry-level").pct).toBeLessThanOrEqual(96);
  });

  it("defaults a non-finite baseline to neutral without throwing", () => {
    expect(() => roleFit(NaN, "intern")).not.toThrow();
  });
});
