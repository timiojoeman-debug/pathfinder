import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const store = { savedStories: [] as { title: string }[] };
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: unknown) => unknown) => sel(store),
}));

import { AnswerGuides, projectNamesFromStories } from "../answer-guides";

beforeEach(() => {
  store.savedStories = [];
});

describe("projectNamesFromStories", () => {
  it("uses real titles, skips category-name defaults and duplicates, and pads with brackets", () => {
    expect(
      projectNamesFromStories([{ title: "Teamwork" }, { title: "Caching layer" }, { title: "caching layer" }, { title: "AI usage" }, { title: "Slack bot" }]),
    ).toEqual(["Caching layer", "Slack bot", "[Project 3]"]);
  });

  it("is all brackets with no stories, and caps at three", () => {
    expect(projectNamesFromStories([])).toEqual(["[Project 1]", "[Project 2]", "[Project 3]"]);
    expect(projectNamesFromStories([{ title: "A" }, { title: "B" }, { title: "C" }, { title: "D" }])).toEqual(["A", "B", "C"]);
  });
});

describe("AnswerGuides", () => {
  it("renders the screening-call module, AIM and the Good vs Great checklist", () => {
    render(<AnswerGuides />);
    for (const t of ["Conciseness", "Precision", "Ownership", "Original questions", "Curiosity"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.getByText("Do you have any questions?")).toBeTruthy();
    expect(screen.getByText(/Power of 3/)).toBeTruthy();
    expect(screen.getByText("Acknowledge.")).toBeTruthy();
    expect(screen.getByText("Move Forward.")).toBeTruthy();
    expect(screen.getByText("Great")).toBeTruthy();
    expect(screen.getAllByText(/practise out loud/i).length).toBeGreaterThan(0);
  });

  it("names saved projects in the Present step, else brackets", () => {
    const { unmount } = render(<AnswerGuides />);
    expect(screen.getByText(/\[Project 1\], \[Project 2\], \[Project 3\]/)).toBeTruthy();
    unmount();
    store.savedStories = [{ title: "Caching layer" }];
    render(<AnswerGuides />);
    expect(screen.getByText(/Caching layer, \[Project 2\]/)).toBeTruthy();
  });

  it("credits its sources and omits unreadable rubric levels", () => {
    render(<AnswerGuides />);
    expect(screen.getByText(/Zapier AI Fluency rubric/)).toBeTruthy();
    expect(screen.getAllByText(/June 2026 Masterclass/).length).toBeGreaterThan(0);
  });
});
