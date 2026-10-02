import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const set = vi.fn();
const saveBriefing = vi.fn();
type Card = { company: string; role: string };
const store = {
  savedJobs: [] as Card[],
  board: [] as { id: string; cards: Card[] }[],
  ivBriefings: {} as Record<string, unknown>,
  ivBriefingFor: null as Card | null,
};
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: unknown) => unknown) => sel({ ...store, emit, set, saveBriefing }),
  useProfile: () => ({ targetRole: "Backend Engineer", currentSkills: ["Go"], leetSolved: 12 }),
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { BriefingTab } from "../briefing-tab";
import { useAiTask } from "@/lib/pf/use-ai";

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  set.mockClear();
  saveBriefing.mockClear();
  store.savedJobs = [];
  store.board = [];
  store.ivBriefings = {};
  store.ivBriefingFor = null;
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("BriefingTab", () => {
  it("stays disabled until a company is entered", () => {
    render(<BriefingTab />);
    expect(screen.getByRole("button", { name: /generate briefing/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/company name/i), { target: { value: "Monzo" } });
    expect(screen.getByRole("button", { name: /generate briefing/i })).not.toBeDisabled();
  });

  it("fills the company from a saved-job chip", () => {
    store.savedJobs = [{ company: "Skyscanner", role: "SWE Intern" }];
    render(<BriefingTab />);
    fireEvent.click(screen.getByRole("button", { name: "Skyscanner" }));
    expect((screen.getByPlaceholderText(/company name/i) as HTMLInputElement).value).toBe("Skyscanner");
  });

  it("lists tracker cards as well as saved jobs, one chip per role", () => {
    store.savedJobs = [{ company: "Skyscanner", role: "SWE Intern" }];
    store.board = [
      { id: "interview", cards: [{ company: "Monzo", role: "Backend Intern" }, { company: "Skyscanner", role: "SWE Intern" }] },
      { id: "rejected", cards: [{ company: "Revolut", role: "Intern" }] },
    ];
    render(<BriefingTab />);
    expect(screen.getByRole("button", { name: "Monzo" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Skyscanner" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Revolut" })).toBeNull();
  });

  it("opens on the company the tracker's Prep action handed over, then clears the hand-over", () => {
    store.ivBriefingFor = { company: "Monzo", role: "Backend Intern" };
    render(<BriefingTab />);
    expect((screen.getByPlaceholderText(/company name/i) as HTMLInputElement).value).toBe("Monzo");
    expect(set).toHaveBeenCalledWith({ ivBriefingFor: null });
  });

  it("runs with the company and student profile line, and logs the consult", async () => {
    const run = vi.fn(async () => ({ data: { companyOverview: "Monzo is a UK challenger bank." } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<BriefingTab />);
    fireEvent.change(screen.getByPlaceholderText(/company name/i), { target: { value: "Monzo" } });
    fireEvent.click(screen.getByRole("button", { name: /generate briefing/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ companyName: "Monzo", studentProfile: expect.stringContaining("Go") })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "interview", expect.stringContaining("Monzo")));
    // Kept per company, so the briefing is still there after a reload.
    expect(saveBriefing).toHaveBeenCalledWith(expect.objectContaining({ company: "Monzo", data: { companyOverview: "Monzo is a UK challenger bank." } }));
  });

  it("renders the stored briefing for the chosen company with the tech-stack confidence note", () => {
    store.ivBriefings = { monzo: { company: "Monzo", role: "Backend Intern", at: Date.now(), data: {
      companyOverview: "Monzo builds on Go microservices.",
      techStack: ["Go", "Cassandra"],
      techStackConfidence: "medium",
    } } };
    store.ivBriefingFor = { company: "Monzo", role: "Backend Intern" };
    render(<BriefingTab />);
    expect(screen.getByText("Monzo builds on Go microservices.")).toBeTruthy();
    expect(screen.getByText(/Partly inferred/)).toBeTruthy();
  });
});
