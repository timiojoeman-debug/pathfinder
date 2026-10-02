import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlumniLink } from "../networking/alumni-link";

describe("AlumniLink", () => {
  it("includes the encoded university when set", () => {
    render(<AlumniLink company="Procter & Gamble" university="University of Edinburgh" />);
    const href = screen.getByRole("link").getAttribute("href")!;
    expect(href).toContain("Procter%20%26%20Gamble%20University%20of%20Edinburgh");
  });

  it("uses the company alone when the university is blank", () => {
    render(<AlumniLink company="Monzo" university="  " />);
    expect(screen.getByRole("link").getAttribute("href")).toMatch(/Monzo$/);
  });
});
