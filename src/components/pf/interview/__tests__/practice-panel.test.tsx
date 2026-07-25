import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { ivProblems: Record<string, boolean>; emit: typeof emit }) => unknown) => sel({ ivProblems: {}, emit }),
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { PracticePanel } from "../practice-panel";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * Practice picks a real problem client-side (never an invented LeetCode URL)
 * and rates the pasted solution via the AI route. These pin the problem pick,
 * the ≥15-char rate gate, the run payload, and the rendered rating.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("PracticePanel", () => {
  it("reveals a real, linked problem when asked for one", () => {
    render(<PracticePanel />);
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /give me a problem/i }));
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("leetcode.com");
    expect(screen.getByRole("button", { name: /another problem/i })).toBeTruthy();
  });

  it("gates rating behind a written approach of at least 15 characters", () => {
    render(<PracticePanel />);
    fireEvent.click(screen.getByRole("button", { name: /give me a problem/i }));
    const rate = screen.getByRole("button", { name: /rate my solution/i });
    expect(rate).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/paste your solution/i), { target: { value: "nested loops O(n^2)" } });
    expect(screen.getByRole("button", { name: /rate my solution/i })).not.toBeDisabled();
  });

  it("runs with the problem title and solution, and logs a rating event", async () => {
    const run = vi.fn(async () => ({ feedback: "Use a hash map." }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<PracticePanel />);
    fireEvent.click(screen.getByRole("button", { name: /give me a problem/i }));
    fireEvent.change(screen.getByPlaceholderText(/paste your solution/i), { target: { value: "brute force nested loops" } });
    fireEvent.click(screen.getByRole("button", { name: /rate my solution/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ userSolution: "brute force nested loops", problemTitle: expect.any(String) })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "interview", expect.stringContaining("Rated a solution")));
  });

  it("renders the numeric rating and feedback when a result is present", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { rating: 3, feedback: "Brute force — O(n^2).", timeComplexity: "O(n^2)" } as never }));
    render(<PracticePanel />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText(/Brute force/)).toBeTruthy();
    expect(screen.getByText(/time O\(n\^2\)/)).toBeTruthy();
  });
});
