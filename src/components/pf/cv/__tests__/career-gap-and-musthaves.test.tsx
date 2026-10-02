import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/pf/store", async () => {
  const { create } = await import("zustand");
  const usePfStore = create<Record<string, unknown>>()((set, get) => ({
    cvText: "",
    cvTailorJD: "",
    cvTailorAts: null,
    cvTailorMatch: null,
    emit: vi.fn(),
    setTailorJD: (jd: string) => set({ cvTailorJD: jd }),
    keepTailorResult: () => get() && true,
  }));
  return { usePfStore };
});
vi.mock("@/lib/pf/use-ai", () => ({
  useAiTask: vi.fn(() => ({ data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn() })),
}));

import { CareerGapCard } from "../career-gap-card";
import { TailorPanel } from "../tailor-panel";
import { usePfStore } from "@/lib/pf/store";

describe("CareerGapCard", () => {
  it("shows the bands, the CV labels and the three-things answer", () => {
    render(<CareerGapCard />);
    expect(screen.getByText(/3 to 6 months/)).toBeTruthy();
    expect(screen.getByText("Reskilling Break")).toBeTruthy();
    expect(screen.getByText(/power of 3/i)).toBeTruthy();
    expect(screen.getByText(/1 to 2 minute/)).toBeTruthy();
  });
});

describe("TailorPanel must-haves", () => {
  it("renders 'x of y' derived from the list, with the caveat", () => {
    usePfStore.setState({
      cvTailorMatch: {
        data: { matchScore: 60 },
        mustHaves: [{ skill: "SQL", met: true }, { skill: "Python", met: true }, { skill: "dbt", met: false }],
      },
    });
    render(<TailorPanel />);
    expect(screen.getByText(/2 of 3 \(67%\)/)).toBeTruthy();
    expect(screen.getByText(/under the 70% mark/i)).toBeTruthy();
    expect(screen.getByText(/rule of thumb from a TechTalk recruiter session/i)).toBeTruthy();
  });

  it("shows nothing when the model returned no must-haves", () => {
    usePfStore.setState({ cvTailorMatch: { data: { matchScore: 60 }, mustHaves: [] } });
    render(<TailorPanel />);
    expect(screen.queryByText(/must-haves met/i)).toBeNull();
  });
});
