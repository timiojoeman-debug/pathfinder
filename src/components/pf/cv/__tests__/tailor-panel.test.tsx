import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const store = { cvText: "" };
vi.mock("@/lib/pf/store", () => ({ usePfStore: (sel: (s: { cvText: string; emit: typeof emit }) => unknown) => sel({ cvText: store.cvText, emit }) }));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { TailorPanel } from "../tailor-panel";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * The CV tailoring panel drives two AI routes (ATS audit + match) off one paste
 * box. These pin the shared gate (CV text + a substantial advert), the run
 * payload, and the two result renders — including that a blocker is shown above
 * the score.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

const JD = "We are hiring a backend intern to build Go and Postgres services with REST APIs at real scale.";
let atsTask: Task;
let matchTask: Task;

beforeEach(() => {
  emit.mockClear();
  store.cvText = "";
  atsTask = aiTask();
  matchTask = aiTask();
  vi.mocked(useAiTask).mockImplementation((endpoint: string) => (endpoint.includes("ats-audit") ? atsTask : matchTask));
});

describe("TailorPanel", () => {
  it("tells the student to add their CV first when there is none", () => {
    render(<TailorPanel />);
    expect(screen.getByText(/add your cv text first/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /run ats audit/i })).toBeDisabled();
  });

  it("enables both buttons once a CV and a substantial advert are present", () => {
    store.cvText = "Backend engineer, five years in Go and Postgres.";
    render(<TailorPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste the full job description/i), { target: { value: JD } });
    expect(screen.getByRole("button", { name: /run ats audit/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /score the match/i })).not.toBeDisabled();
  });

  it("runs the ATS audit with the advert and CV, and logs the consult", async () => {
    store.cvText = "Backend engineer.";
    atsTask = aiTask({ run: vi.fn(async () => ({ data: { overallATSScore: 64 } })) as never });
    render(<TailorPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste the full job description/i), { target: { value: JD } });
    fireEvent.click(screen.getByRole("button", { name: /run ats audit/i }));

    await waitFor(() => expect(atsTask.run).toHaveBeenCalledWith(expect.objectContaining({ jobDescription: JD, cvData: "Backend engineer." })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "cv", expect.stringContaining("ATS audit")));
  });

  it("renders the ATS score and keyword findings", () => {
    atsTask = aiTask({ data: { data: { overallATSScore: 64, criticalKeywords: [{ keyword: "React", foundInCV: true }] } } as never });
    render(<TailorPanel />);
    expect(screen.getByText("64 / 100")).toBeTruthy();
    expect(screen.getByText(/React/)).toBeTruthy();
  });

  it("renders the match score with hard-requirement blockers surfaced", () => {
    matchTask = aiTask({ data: {
      data: { matchScore: 78 },
      nonNegotiables: [{ requirement: "3 years professional experience", category: "experience", studentMeets: false, explanation: "You have none yet." }],
      blockerWarning: "Hard requirements you may not meet",
    } as never });
    render(<TailorPanel />);
    expect(screen.getByText(/78%/)).toBeTruthy();
    expect(screen.getByText(/Hard requirements you may not meet/)).toBeTruthy();
    expect(screen.getByText(/3 years professional experience/)).toBeTruthy();
  });
});
