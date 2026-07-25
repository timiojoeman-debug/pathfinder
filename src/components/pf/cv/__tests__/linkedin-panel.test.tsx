import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { emit: typeof emit }) => unknown) => sel({ emit }),
  useProfile: () => ({ targetRole: "Backend Engineer", targetKeywords: ["Go"], targetIndustry: "fintech" }),
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { LinkedInPanel } from "../linkedin-panel";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * LinkedIn review: reads what the student wrote, returns scored feedback plus
 * the recruiter keywords that live *beside* the envelope, not under `data`.
 * These pin the headline-or-about gate, the run payload, and both renders.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("LinkedInPanel", () => {
  it("keeps review disabled until a headline or about is entered", () => {
    render(<LinkedInPanel />);
    expect(screen.getByRole("button", { name: /review my profile/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/current linkedin headline/i), { target: { value: "Aspiring dev" } });
    expect(screen.getByRole("button", { name: /review my profile/i })).not.toBeDisabled();
  });

  it("runs with the profile's target role and keywords, and logs the consult", async () => {
    const run = vi.fn(async () => ({ data: { suggestedHeadline: "Backend Engineer | Go" } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<LinkedInPanel />);
    fireEvent.change(screen.getByPlaceholderText(/current about section/i), { target: { value: "I like code." } });
    fireEvent.click(screen.getByRole("button", { name: /review my profile/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ aboutSection: "I like code.", targetRole: "Backend Engineer", industry: "fintech" })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "cv", expect.stringContaining("LinkedIn")));
  });

  it("renders the scores, a suggested headline, and the keyword analysis beside the envelope", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: {
      data: { headlineScore: 55, aboutScore: 70, suggestedHeadline: "Backend Engineer | Go & Postgres" },
      keywordAnalysis: { keywords: [{ keyword: "gRPC", priority: "critical", foundInProfile: false, suggestedPlacement: "headline" }] },
    } as never }));
    render(<LinkedInPanel />);
    expect(screen.getByText(/Headline 55 \/ 100/)).toBeTruthy();
    expect(screen.getByText("Backend Engineer | Go & Postgres")).toBeTruthy();
    expect(screen.getByText(/gRPC/)).toBeTruthy();
  });
});
