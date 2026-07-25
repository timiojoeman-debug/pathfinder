import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const store = { cvText: "" };
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { cvText: string; emit: typeof emit }) => unknown) => sel({ cvText: store.cvText, emit }),
  useProfile: () => ({ targetRole: "Backend Engineer" }),
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { QuestionsTab } from "../questions-tab";
import { useAiTask } from "@/lib/pf/use-ai";

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  store.cvText = "";
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("QuestionsTab", () => {
  it("generates against the CV and target role, and logs the consult", async () => {
    store.cvText = "Backend engineer, Go and Postgres.";
    const run = vi.fn(async () => ({ questions: [{ type: "Technical", question: "Design a URL shortener.", answerTemplate: "" }] }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<QuestionsTab />);
    fireEvent.click(screen.getByRole("button", { name: /generate questions/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ targetRole: "Backend Engineer Intern", more: false, cvSummary: expect.stringContaining("Backend engineer") })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "interview", expect.stringContaining("likely questions")));
  });

  it("renders generated questions and offers a harder set", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { questions: [
      { type: "Behavioural", question: "Tell me about a conflict.", answerTemplate: "Use STAR." },
    ] } as never }));
    render(<QuestionsTab />);
    expect(screen.getByText("Tell me about a conflict.")).toBeTruthy();
    expect(screen.getByText("Use STAR.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /harder ones/i })).toBeTruthy();
  });

  it("requests a harder set with more:true", async () => {
    const run = vi.fn(async () => ({ questions: [{ type: "Technical", question: "q", answerTemplate: "" }] }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { questions: [{ type: "Technical", question: "q", answerTemplate: "" }] } as never, run: run as never }));
    render(<QuestionsTab />);
    fireEvent.click(screen.getByRole("button", { name: /harder ones/i }));
    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ more: true })));
  });
});
