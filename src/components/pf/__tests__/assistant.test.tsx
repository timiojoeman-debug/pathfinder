import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const state = {
    asstOpen: false,
    asstMsgs: [] as { role: "user" | "assistant"; content: string }[],
    asstDraft: "",
    set: vi.fn(),
    emit: vi.fn(),
  };
  return { state };
});

vi.mock("@/lib/pf/store", () => {
  const usePfStore = (sel: (s: typeof h.state) => unknown) => sel(h.state);
  usePfStore.getState = () => h.state;
  return {
    usePfStore,
    useProfile: () => ({ directionStatement: "Backend", targetRole: "Backend Engineer", currentPhase: "cv", strengths: [], weaknesses: [], currentSkills: [], missingSkills: [], events: [] }),
    useProgress: () => ({ overall: 40, band: "Building", phases: [{ pct: 45, label: "CV" }] }),
  };
});
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { MentorAssistant } from "../assistant";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * The docked mentor is advisory only: it reads the profile and answers, and the
 * only store writes it makes are to its own asst* slice (open/msgs/draft) — never
 * to any progress-bearing field. These pin the open/close, the send flow, and
 * that the reply is appended without touching anything else.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  h.state.asstOpen = false;
  h.state.asstMsgs = [];
  h.state.asstDraft = "";
  h.state.set.mockClear();
  h.state.emit.mockClear();
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("MentorAssistant", () => {
  it("shows a launcher when closed and opens on click", () => {
    render(<MentorAssistant />);
    fireEvent.click(screen.getByRole("button", { name: /open the mentor/i }));
    expect(h.state.set).toHaveBeenCalledWith({ asstOpen: true });
  });

  it("renders the conversation when open", () => {
    h.state.asstOpen = true;
    h.state.asstMsgs = [{ role: "user", content: "What should I do next?" }, { role: "assistant", content: "Head to Networking." }];
    render(<MentorAssistant />);
    expect(screen.getByRole("dialog", { name: /mentor/i })).toBeTruthy();
    expect(screen.getByText("What should I do next?")).toBeTruthy();
    expect(screen.getByText("Head to Networking.")).toBeTruthy();
  });

  it("sends a starter question with profile context and appends only the reply", async () => {
    h.state.asstOpen = true;
    const run = vi.fn(async () => ({ reply: "Head to the Networking page." }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<MentorAssistant />);

    fireEvent.click(screen.getByRole("button", { name: "What should I do next?" }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([{ role: "user", content: "What should I do next?" }]),
      context: expect.objectContaining({ targetRole: "Backend Engineer" }),
    })));
    // The only writes are to the asst* slice — the question, then the reply.
    await waitFor(() => expect(h.state.set).toHaveBeenCalledWith(expect.objectContaining({ asstMsgs: expect.arrayContaining([{ role: "assistant", content: "Head to the Networking page." }]) })));
    expect(h.state.emit).toHaveBeenCalledWith("AiConsulted", "cv", expect.stringContaining("mentor"));
    // Every set call touched only asst* keys — never a progress-bearing field.
    for (const call of h.state.set.mock.calls) {
      for (const key of Object.keys(call[0] as object)) expect(key.startsWith("asst")).toBe(true);
    }
  });
});
