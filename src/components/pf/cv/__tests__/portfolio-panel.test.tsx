import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { emit: typeof emit }) => unknown) => sel({ emit }),
  useProfile: () => ({ targetRole: "Full-Stack Engineer", targetKeywords: ["React", "Node"] }),
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { PortfolioPanel } from "../portfolio-panel";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * Portfolio review: gated on real pasted content, runs with the profile's
 * target role/stack, and renders the model's read grounded in what was pasted.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("PortfolioPanel", () => {
  it("keeps review disabled until enough content is pasted", () => {
    render(<PortfolioPanel />);
    expect(screen.getByRole("button", { name: /review my portfolio/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/paste your project descriptions/i), {
      target: { value: "Task Tracker — a deployed React app my classmates use daily." },
    });
    expect(screen.getByRole("button", { name: /review my portfolio/i })).not.toBeDisabled();
  });

  it("runs with the profile's target role and keywords, and logs the consult", async () => {
    const run = vi.fn(async () => ({ data: { overallImpression: "Solid start." } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<PortfolioPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste your project descriptions/i), {
      target: { value: "Task Tracker — a deployed React app my classmates use daily." },
    });
    fireEvent.click(screen.getByRole("button", { name: /review my portfolio/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ targetRole: "Full-Stack Engineer", techStack: ["React", "Node"] })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "cv", expect.stringContaining("portfolio")));
  });

  it("renders the overall read, per-project gaps and top fixes", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: {
      data: {
        overallImpression: "Two projects; neither deployed.",
        projectFeedback: [{ name: "Task Tracker", verdict: "Not deployed", missing: ["Deployed URL"] }],
        topFixes: ["Deploy the task tracker"],
      },
    } as never }));
    render(<PortfolioPanel />);
    expect(screen.getByText(/neither deployed/i)).toBeTruthy();
    expect(screen.getByText("Task Tracker")).toBeTruthy();
    expect(screen.getByText(/Deploy the task tracker/)).toBeTruthy();
  });
});
