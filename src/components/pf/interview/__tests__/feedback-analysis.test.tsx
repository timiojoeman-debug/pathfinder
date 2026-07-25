import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const store = { ivFeedback: [] as { company: string; rating: number; date: string; note: string }[] };
vi.mock("@/lib/pf/store", () => ({ usePfStore: (sel: (s: { ivFeedback: typeof store.ivFeedback; emit: typeof emit }) => unknown) => sel({ ivFeedback: store.ivFeedback, emit }) }));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { FeedbackAnalysis } from "../feedback-analysis";
import { useAiTask } from "@/lib/pf/use-ai";

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  store.ivFeedback = [];
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("FeedbackAnalysis", () => {
  it("stays disabled until the questions or what-went-well is filled", () => {
    render(<FeedbackAnalysis />);
    expect(screen.getByRole("button", { name: /analyse this interview/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/what did they actually ask/i), { target: { value: "Two Sum, then system design." } });
    expect(screen.getByRole("button", { name: /analyse this interview/i })).not.toBeDisabled();
  });

  it("runs with the selected type and the reflection, and logs the consult", async () => {
    const run = vi.fn(async () => ({ data: { analysis: "You rushed the tradeoffs." } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<FeedbackAnalysis />);
    fireEvent.click(screen.getByRole("button", { name: "Technical" }));
    fireEvent.change(screen.getByPlaceholderText(/what went well/i), { target: { value: "Explained clearly." } });
    fireEvent.click(screen.getByRole("button", { name: /analyse this interview/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ interviewType: "Technical", wentWell: "Explained clearly." })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "interview", expect.stringContaining("technical")));
  });

  it("renders the analysis and thank-you note when present", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { data: { analysis: "Solid on behavioural.", followUpEmail: "Thanks for your time." } } as never }));
    render(<FeedbackAnalysis />);
    expect(screen.getByText("Solid on behavioural.")).toBeTruthy();
    expect(screen.getByText("Thanks for your time.")).toBeTruthy();
  });
});
