import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const set = vi.fn();
const profile = { missingSkills: [] as string[], currentSkills: ["JavaScript"], targetRole: "Backend" };
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { emit: typeof emit; set: typeof set }) => unknown) => sel({ emit, set }),
  useProfile: () => profile,
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { ProjectsPanel } from "../projects-panel";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * Project ideas are gated on recorded skill gaps (empty gaps -> generic ideas,
 * which is the thing this panel exists to avoid). These pin the gate, the run
 * payload (skillGaps, not missingSkills), the cvProjects side effect on
 * success, and the expandable idea render.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  set.mockClear();
  profile.missingSkills = [];
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("ProjectsPanel", () => {
  it("stays disabled with an explanation when no skill gaps are recorded", () => {
    render(<ProjectsPanel />);
    expect(screen.getByRole("button", { name: /generate project ideas/i })).toBeDisabled();
    expect(screen.getByText(/no skill gaps recorded yet/i)).toBeTruthy();
  });

  it("runs with skillGaps (not missingSkills) and marks cvProjects on success", async () => {
    profile.missingSkills = ["Go", "Docker"];
    const run = vi.fn(async () => ({ data: { projects: [{ title: "Rate limiter" }] } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<ProjectsPanel />);
    fireEvent.click(screen.getByRole("button", { name: /generate project ideas/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ skillGaps: ["Go", "Docker"] })));
    await waitFor(() => expect(set).toHaveBeenCalledWith({ cvProjects: true }));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("ProjectGenerated", "cv", expect.stringContaining("skill gaps")));
  });

  it("renders generated ideas and expands one on click", () => {
    profile.missingSkills = ["Go"];
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: {
      data: { projects: [{ title: "Rate-limited URL shortener", description: "A Go service", problemItSolves: "Throttles abusive clients" }] },
    } as never }));
    render(<ProjectsPanel />);

    const toggle = screen.getByRole("button", { name: /rate-limited url shortener/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: /rate-limited url shortener/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Throttles abusive clients/)).toBeTruthy();
  });
});
