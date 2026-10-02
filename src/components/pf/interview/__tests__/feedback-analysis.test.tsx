import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const store = {
  ivFeedback: [] as { company: string; rating: number; date: string; note: string }[],
  fbCompany: "",
  fbRating: 0,
  fbNote: "",
};
vi.mock("@/lib/pf/store", () => ({ usePfStore: (sel: (s: unknown) => unknown) => sel({ ...store, emit }) }));
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
  store.fbCompany = "";
  store.fbRating = 0;
  store.fbNote = "";
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("FeedbackAnalysis", () => {
  it("stays disabled until there is a reflection to analyse and something in it", () => {
    const { unmount } = render(<FeedbackAnalysis />);
    expect(screen.getByRole("button", { name: /analyse this interview/i })).toBeDisabled();
    expect(screen.getByText(/fill in the reflection above/i)).toBeTruthy();
    unmount();

    store.fbCompany = "Monzo";
    render(<FeedbackAnalysis />);
    expect(screen.getByRole("button", { name: /analyse this interview/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/what did they actually ask/i), { target: { value: "Two Sum, then system design." } });
    expect(screen.getByRole("button", { name: /analyse this interview/i })).not.toBeDisabled();
  });

  it("sends this interview's company, stars and notes from the reflection form", async () => {
    store.fbCompany = "Monzo · Backend Intern";
    store.fbRating = 4;
    store.fbNote = "Explained clearly.";
    store.ivFeedback = [{ company: "Skyscanner", rating: 2, date: "1 Sep", note: "Rushed." }];
    const run = vi.fn<(body: unknown) => Promise<unknown>>(async () => ({ data: { analysis: "You rushed the tradeoffs." } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<FeedbackAnalysis />);
    fireEvent.click(screen.getByRole("button", { name: "Technical" }));
    fireEvent.click(screen.getByRole("button", { name: /analyse this interview/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({
      interviewType: "Technical",
      company: "Monzo · Backend Intern",
      selfRatings: { overall: 4 },
      wentWell: "Explained clearly.",
      previousInterviews: expect.stringContaining("Skyscanner"),
    })));
    // An earlier interview's stars are context, never this interview's self-rating.
    expect(run.mock.calls[0][0]).not.toHaveProperty("selfRatings.Skyscanner");
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "interview", expect.stringContaining("technical")));
  });

  it("falls back to the latest saved reflection and leaves it out of the earlier context", async () => {
    store.ivFeedback = [
      { company: "Monzo", rating: 3, date: "2 Oct", note: "No reflections logged." },
      { company: "Skyscanner", rating: 2, date: "1 Sep", note: "Rushed." },
    ];
    const run = vi.fn<(body: unknown) => Promise<unknown>>(async () => null);
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<FeedbackAnalysis />);
    expect(screen.getByText("Monzo")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/what did they actually ask/i), { target: { value: "Design a cache." } });
    fireEvent.click(screen.getByRole("button", { name: /analyse this interview/i }));

    await waitFor(() => expect(run).toHaveBeenCalled());
    const body = run.mock.calls[0][0] as unknown as { company: string; wentWell: string; previousInterviews: string };
    expect(body.company).toBe("Monzo");
    expect(body.wentWell).toBe("");
    expect(body.previousInterviews).not.toContain("Monzo");
  });

  it("renders the analysis and thank-you note when present", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { data: { analysis: "Solid on behavioural.", followUpEmail: "Thanks for your time." } } as never }));
    render(<FeedbackAnalysis />);
    expect(screen.getByText("Solid on behavioural.")).toBeTruthy();
    expect(screen.getByText("Thanks for your time.")).toBeTruthy();
  });
});
