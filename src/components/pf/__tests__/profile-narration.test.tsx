import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const profile = {
  directionSet: false, cvAnalyzed: false, strengths: [] as string[], events: [] as unknown[],
  directionStatement: null as string | null, targetRole: null as string | null, currentPhase: "direction",
  weaknesses: [] as string[], currentSkills: [] as string[], missingSkills: [] as string[],
};
vi.mock("@/lib/pf/store", () => ({
  useProfile: () => profile,
  useProgress: () => ({ overall: 0, band: "Getting started", phases: [] }),
  usePfStore: (sel: (s: { emit: typeof emit }) => unknown) => sel({ emit }),
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { ProfileNarration } from "../profile-narration";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * Narration is a presentation layer over the derived profile — it must not
 * narrate an empty profile (that is when a model invents). These pin the
 * substance gate, the run, and the paragraph render.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  Object.assign(profile, { directionSet: false, cvAnalyzed: false, strengths: [], events: [], directionStatement: null });
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("ProfileNarration", () => {
  it("refuses to narrate an empty profile", () => {
    render(<ProfileNarration />);
    expect(screen.getByRole("button", { name: /have the mentor read it back/i })).toBeDisabled();
    expect(screen.getByText(/not enough here to narrate yet/i)).toBeTruthy();
  });

  it("runs once the profile has substance, and logs the consult", async () => {
    profile.directionSet = true;
    profile.directionStatement = "Backend in fintech";
    const run = vi.fn(async () => ({ narration: "You've set a direction and analysed your CV." }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<ProfileNarration />);
    fireEvent.click(screen.getByRole("button", { name: /have the mentor read it back/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ directionStatement: "Backend in fintech", progressLines: expect.any(Array) })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "direction", expect.stringContaining("read of the whole profile")));
  });

  it("renders the narration and its focus line", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { narration: "You've made a strong start.\n\nThe main gap is Go.", focus: "Close the Go gap next." } as never }));
    render(<ProfileNarration />);
    expect(screen.getByText("You've made a strong start.")).toBeTruthy();
    expect(screen.getByText("The main gap is Go.")).toBeTruthy();
    expect(screen.getByText("Close the Go gap next.")).toBeTruthy();
  });
});
