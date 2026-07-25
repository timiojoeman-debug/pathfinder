import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
vi.mock("@/lib/pf/store", () => ({
  usePfStore: (sel: (s: { emit: typeof emit }) => unknown) => sel({ emit }),
  useProfile: () => ({}),
}));
vi.mock("@/lib/pf/ai-context", () => ({ networkingProfileLine: () => "A CS student targeting backend internships." }));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { StartupPanel } from "../startup-panel";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * Startup outreach enforces the route's own rule client-side: no email without
 * a specific ≥20-char company detail. These pin that gate (and its two hint
 * states), the run payload, and the rendered message.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

const DETAIL = "I read your blog post on cutting cold-start latency with a warm pool.";

beforeEach(() => {
  emit.mockClear();
  vi.mocked(useAiTask).mockReturnValue(aiTask());
});

describe("StartupPanel", () => {
  it("asks for the company name first when nothing is entered", () => {
    render(<StartupPanel />);
    expect(screen.getByRole("button", { name: /write the email/i })).toBeDisabled();
    expect(screen.getByText(/company name first/i)).toBeTruthy();
  });

  it("refuses a too-short detail with the 'not optional' warning", () => {
    render(<StartupPanel />);
    fireEvent.change(screen.getByPlaceholderText(/company name/i), { target: { value: "Acme" } });
    fireEvent.change(screen.getByPlaceholderText(/one specific thing/i), { target: { value: "cool startup" } });
    expect(screen.getByRole("button", { name: /write the email/i })).toBeDisabled();
    expect(screen.getByText(/not optional/i)).toBeTruthy();
  });

  it("enables and runs with the profile line, company and detail once the detail is substantial", async () => {
    const run = vi.fn(async () => ({ data: { message: "Hi — your latency post landed with me..." } }));
    vi.mocked(useAiTask).mockReturnValue(aiTask({ run: run as never }));
    render(<StartupPanel />);

    fireEvent.change(screen.getByPlaceholderText(/company name/i), { target: { value: "Acme" } });
    fireEvent.change(screen.getByPlaceholderText(/one specific thing/i), { target: { value: DETAIL } });
    const btn = screen.getByRole("button", { name: /write the email/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.objectContaining({ companyName: "Acme", companyDetail: DETAIL, studentProfile: expect.any(String) })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "networking", expect.stringContaining("Acme")));
  });

  it("renders the generated message when present", () => {
    vi.mocked(useAiTask).mockReturnValue(aiTask({ data: { data: { message: "Hi — your latency post landed with me..." } } as never }));
    render(<StartupPanel />);
    expect(screen.getByText(/latency post landed/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /rewrite outreach/i })).toBeTruthy();
  });
});
