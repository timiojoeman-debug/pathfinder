import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
vi.mock("@/lib/pf/store", () => ({ usePfStore: (sel: (s: { emit: typeof emit }) => unknown) => sel({ emit }) }));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { StarTab } from "../star-tab";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * The STAR builder must send the four beats as an object (rawStory.situation
 * etc.) — a single string produces a prompt full of "undefined". These pin the
 * ≥10-char situation+action gate, the no-result nudge, the object payload, and
 * the tightened-story render.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

const SIT = "Group project, teammate broke the build repeatedly.";
const ACT = "Proposed a PR review and CI gate, paired on the first two.";

describe("StarTab", () => {
  it("unlocks once the situation and action are sketched", () => {
    render(<StarTab />);
    expect(screen.getByRole("button", { name: /build my story/i })).toBeDisabled();
    expect(screen.getByText(/sketch the situation/i)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/set the scene/i), { target: { value: SIT } });
    fireEvent.change(screen.getByPlaceholderText(/what did you do/i), { target: { value: ACT } });
    expect(screen.getByRole("button", { name: /build my story/i })).not.toBeDisabled();
  });

  it("nudges about the missing result beat once enough is filled", () => {
    render(<StarTab />);
    fireEvent.change(screen.getByPlaceholderText(/set the scene/i), { target: { value: SIT } });
    fireEvent.change(screen.getByPlaceholderText(/what did you do/i), { target: { value: ACT } });
    expect(screen.getByText(/no result yet/i)).toBeTruthy();
  });

  it("sends the four beats as an object and logs the consult", async () => {
    const run = vi.fn(async () => ({ data: { situation: "Tightened situation." } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<StarTab />);
    fireEvent.change(screen.getByPlaceholderText(/set the scene/i), { target: { value: SIT } });
    fireEvent.change(screen.getByPlaceholderText(/what did you do/i), { target: { value: ACT } });
    fireEvent.click(screen.getByRole("button", { name: /build my story/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ rawStory: expect.objectContaining({ situation: SIT, action: ACT }), category: expect.any(String) })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "interview", expect.stringContaining("STAR story")));
  });

  it("renders the tightened story and the questions it answers", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: {
      data: { situation: "One sharp sentence.", result: "Build breakages hit zero.", mappedQuestions: ["Tell me about a conflict."] },
      inputQuality: "strong",
    } as never }));
    render(<StarTab />);
    expect(screen.getByText("One sharp sentence.")).toBeTruthy();
    expect(screen.getByText("Build breakages hit zero.")).toBeTruthy();
    expect(screen.getByText("Tell me about a conflict.")).toBeTruthy();
  });
});
