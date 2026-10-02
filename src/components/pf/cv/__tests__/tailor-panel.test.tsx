import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { emit } = vi.hoisted(() => ({ emit: vi.fn() }));
// A real (tiny) zustand store, so the panel's reads and writes behave as they do live.
vi.mock("@/lib/pf/store", async () => {
  const { create } = await import("zustand");
  type S = Record<string, unknown>;
  const usePfStore = create<S>()((set) => ({
    cvText: "",
    cvTailorJD: "",
    cvTailorAts: null,
    cvTailorMatch: null,
    emit,
    set: (patch: S) => set(patch),
    setTailorJD: (jd: string) => set({ cvTailorJD: jd, cvTailorAts: null, cvTailorMatch: null }),
  }));
  return { usePfStore };
});
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { TailorPanel } from "../tailor-panel";
import { useAiTask } from "@/lib/pf/use-ai";
import { usePfStore } from "@/lib/pf/store";

/**
 * The CV tailoring panel drives two AI routes (ATS audit + match) off one paste
 * box. These pin the shared gate (CV text + a substantial advert), the run
 * payload, the two result renders (a blocker shown above the score), and that
 * the advert and results live in the store so they survive navigation.
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
  usePfStore.setState({ cvText: "", cvTailorJD: "", cvTailorAts: null, cvTailorMatch: null });
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
    usePfStore.setState({ cvText: "Backend engineer, five years in Go and Postgres." });
    render(<TailorPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste the full job description/i), { target: { value: JD } });
    expect(screen.getByRole("button", { name: /run ats audit/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /score the match/i })).not.toBeDisabled();
    expect(usePfStore.getState().cvTailorJD).toBe(JD);
  });

  it("opens with an advert handed over from elsewhere", () => {
    usePfStore.setState({ cvTailorJD: JD });
    render(<TailorPanel />);
    expect((screen.getByPlaceholderText(/paste the full job description/i) as HTMLTextAreaElement).value).toBe(JD);
  });

  it("runs the ATS audit with the advert and CV, keeps the result, and logs the consult", async () => {
    usePfStore.setState({ cvText: "Backend engineer." });
    atsTask = aiTask({ run: vi.fn(async () => ({ data: { overallATSScore: 64 } })) as never });
    render(<TailorPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste the full job description/i), { target: { value: JD } });
    fireEvent.click(screen.getByRole("button", { name: /run ats audit/i }));

    await waitFor(() => expect(atsTask.run).toHaveBeenCalledWith(expect.objectContaining({ jobDescription: JD, cvData: "Backend engineer." })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "cv", expect.stringContaining("ATS audit")));
    expect(usePfStore.getState().cvTailorAts).toEqual({ data: { overallATSScore: 64 } });
  });

  it("renders the stored ATS score and keyword findings", () => {
    usePfStore.setState({ cvTailorAts: { data: { overallATSScore: 64, criticalKeywords: [{ keyword: "React", foundInCV: true }] } } });
    render(<TailorPanel />);
    expect(screen.getByText("64 / 100")).toBeTruthy();
    expect(screen.getByText(/React/)).toBeTruthy();
  });

  it("renders the match score with hard-requirement blockers surfaced", () => {
    usePfStore.setState({ cvTailorMatch: {
      data: { matchScore: 78 },
      nonNegotiables: [{ requirement: "3 years professional experience", category: "experience", studentMeets: false, explanation: "You have none yet." }],
      blockerWarning: "Hard requirements you may not meet",
    } });
    render(<TailorPanel />);
    expect(screen.getByText(/78%/)).toBeTruthy();
    expect(screen.getByText(/Hard requirements you may not meet/)).toBeTruthy();
    expect(screen.getByText(/3 years professional experience/)).toBeTruthy();
  });
});
