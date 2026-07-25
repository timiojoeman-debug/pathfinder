import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const store = { savedJobs: [] as { company: string; role: string; jdText?: string }[], cvText: "" };
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { savedJobs: typeof store.savedJobs; cvText: string; emit: typeof emit }) => unknown) => sel({ savedJobs: store.savedJobs, cvText: store.cvText, emit }),
  useProfile: () => ({ directionStatement: "Backend in fintech" }),
}));
vi.mock("@/lib/pf/ai-context", () => ({ studentProfileLine: () => "A CS student targeting backend internships." }));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { IntelAnalysisPanel } from "../analysis-panel";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * The pipeline analyser is not an envelope and degrades to HTTP 200 with
 * `source:"heuristic"` on failure — which useAiTask reads as success. The panel
 * must catch that and state the degradation rather than render an empty result.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  store.savedJobs = [];
  store.cvText = "";
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("IntelAnalysisPanel", () => {
  it("needs saved roles to enable analysis", () => {
    render(<IntelAnalysisPanel />);
    expect(screen.getByRole("button", { name: /analyse my pipeline/i })).toBeDisabled();
    expect(screen.getByText(/save a role in opportunity discovery first/i)).toBeTruthy();
  });

  it("stays disabled when saved roles carry no advert text", () => {
    store.savedJobs = [{ company: "Monzo", role: "Backend Intern" }];
    render(<IntelAnalysisPanel />);
    expect(screen.getByRole("button", { name: /analyse my pipeline/i })).toBeDisabled();
    expect(screen.getByText(/no job-description text yet/i)).toBeTruthy();
  });

  it("states the degradation (and logs nothing) when the route returns the heuristic source", async () => {
    store.savedJobs = [{ company: "Monzo", role: "Backend Intern", jdText: "Go and Postgres services." }];
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: vi.fn(async () => ({ source: "heuristic", roles: [], priorityMoves: [] })) as never }));
    render(<IntelAnalysisPanel />);
    fireEvent.click(screen.getByRole("button", { name: /analyse my pipeline/i }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/couldn.t read your pipeline/i));
    expect(emit).not.toHaveBeenCalled();
  });

  it("renders ranked moves and logs the consult on a real AI result", async () => {
    store.savedJobs = [{ company: "Monzo", role: "Backend Intern", jdText: "Go and Postgres services." }];
    vi.mocked(useAiTask).mockReturnValue(aiTask({
      data: { source: "ai", priorityMoves: [{ action: "Ship a Go service", why: "closes your only backend gap", impact: "+20%", kind: "cv" }], roles: [{ company: "Monzo", fitReason: "Go matches your focus", recommendedMove: "Apply", requiredSkills: ["Go"] }] } as never,
      run: vi.fn(async () => ({ source: "ai", priorityMoves: [{ action: "Ship a Go service", why: "x", impact: "+20%", kind: "cv" }] })) as never,
    }));
    render(<IntelAnalysisPanel />);
    expect(screen.getByText("Ship a Go service")).toBeTruthy();
    expect(screen.getByText("Go matches your focus")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /re-analyse pipeline/i }));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "jobs", expect.stringContaining("saved roles")));
  });
});
