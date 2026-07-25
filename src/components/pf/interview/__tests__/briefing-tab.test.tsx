import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const store = { savedJobs: [] as { company: string; role: string }[] };
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { savedJobs: typeof store.savedJobs; emit: typeof emit }) => unknown) => sel({ savedJobs: store.savedJobs, emit }),
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
  store.savedJobs = [];
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

  it("runs with the company and student profile line, and logs the consult", async () => {
    const run = vi.fn(async () => ({ data: { companyOverview: "Monzo is a UK challenger bank." } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<BriefingTab />);
    fireEvent.change(screen.getByPlaceholderText(/company name/i), { target: { value: "Monzo" } });
    fireEvent.click(screen.getByRole("button", { name: /generate briefing/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ companyName: "Monzo", studentProfile: expect.stringContaining("Go") })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "interview", expect.stringContaining("Monzo")));
  });

  it("renders the briefing with the tech-stack confidence note", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { data: {
      companyOverview: "Monzo builds on Go microservices.",
      techStack: ["Go", "Cassandra"],
      techStackConfidence: "medium",
    } } as never }));
    render(<BriefingTab />);
    expect(screen.getByText("Monzo builds on Go microservices.")).toBeTruthy();
    expect(screen.getByText(/Partly inferred/)).toBeTruthy();
  });
});
