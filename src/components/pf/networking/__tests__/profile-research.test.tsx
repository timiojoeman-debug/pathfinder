import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
vi.mock("@/lib/pf/store", () => ({ usePfStore: (sel: (s: { emit: typeof emit }) => unknown) => sel({ emit }) }));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { ProfileResearch } from "../profile-research";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * The contact-research panel: paste a profile, get back grounded angles. These
 * pin the gate (needs pasted content), that a run sends exactly what was typed,
 * that a summary logs an AiConsulted event, and that the result sections render.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

beforeEach(() => {
  emit.mockClear();
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("ProfileResearch", () => {
  it("keeps the button disabled with a hint until something is pasted", () => {
    render(<ProfileResearch />);
    expect(screen.getByRole("button", { name: /find the angles/i })).toBeDisabled();
    expect(screen.getByText(/paste their about or experience first/i)).toBeTruthy();
  });

  it("enables once an About or experience is entered", () => {
    render(<ProfileResearch />);
    fireEvent.change(screen.getByPlaceholderText(/their about/i), { target: { value: "Backend engineer, ex-Edinburgh." } });
    expect(screen.getByRole("button", { name: /find the angles/i })).not.toBeDisabled();
  });

  it("runs with exactly what was pasted and logs a research event on a summary", async () => {
    const run = vi.fn(async () => ({ summary: "Senior backend engineer at Monzo." }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<ProfileResearch />);

    fireEvent.change(screen.getByPlaceholderText(/their name/i), { target: { value: "Dana" } });
    fireEvent.change(screen.getByPlaceholderText(/their about/i), { target: { value: "Backend engineer." } });
    fireEvent.click(screen.getByRole("button", { name: /find the angles/i }));

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ recipientName: "Dana", about: "Backend engineer." })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "networking", expect.stringContaining("Dana")));
  });

  it("renders the summary, common ground and questions when a result is present", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({
      data: {
        summary: "Backend engineer at Monzo.",
        connectionPoints: ["Both studied at Edinburgh"],
        conversationStarters: ["How did you handle idempotency?"],
      } as never,
    }));
    render(<ProfileResearch />);
    expect(screen.getByText("Backend engineer at Monzo.")).toBeTruthy();
    expect(screen.getByText("Both studied at Edinburgh")).toBeTruthy();
    expect(screen.getByText("How did you handle idempotency?")).toBeTruthy();
  });

  it("is controllable — reports contact edits and results up to the parent", async () => {
    const onContactChange = vi.fn();
    const onResult = vi.fn();
    const run = vi.fn(async () => ({ summary: "Backend engineer at Monzo.", connectionPoints: ["Edinburgh"] }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));

    const contact = { name: "Dana", company: "Monzo", about: "Backend engineer.", experience: "" };
    render(<ProfileResearch contact={contact} onContactChange={onContactChange} onResult={onResult} />);

    fireEvent.change(screen.getByPlaceholderText(/their name/i), { target: { value: "Danae" } });
    expect(onContactChange).toHaveBeenCalledWith(expect.objectContaining({ name: "Danae" }));

    fireEvent.click(screen.getByRole("button", { name: /find the angles/i }));
    await waitFor(() =>
      expect(onResult).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ summary: "Backend engineer at Monzo." }) }),
      ),
    );
  });

  it("surfaces a not-signed-in state as guidance with a sign-in link", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ error: "Sign in to research contacts.", needsAuth: true }));
    render(<ProfileResearch />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });
});
