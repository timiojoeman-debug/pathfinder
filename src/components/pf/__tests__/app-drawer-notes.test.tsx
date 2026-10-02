import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const run = vi.fn<(body: unknown) => Promise<unknown>>(async () => null);
vi.mock("@/lib/pf/use-ai", () => ({
  useAiTask: () => ({ data: null, loading: false, error: null, needsAuth: false, run, reset: vi.fn() }),
}));

import { Drawers } from "../drawers";
import { usePfStore } from "@/lib/pf/store";

/**
 * The application drawer's notes are controlled and saved on a debounce and on
 * unmount, so closing the drawer mid-edit keeps the text, and the follow-up
 * draft uses the live text rather than the last saved copy.
 */

const PRISTINE = usePfStore.getState();
const KEY = "monzo::backend intern";
const note = () => usePfStore.getState().board.flatMap((c) => c.cards).find((c) => c.key === KEY)?.note;

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  usePfStore.getState().addCard({ company: "Monzo", role: "Backend Intern", column: "applied" });
  usePfStore.getState().openApp(KEY);
  run.mockClear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("AppDrawer notes", () => {
  it("saves after a short pause while typing", () => {
    render(<Drawers />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Spoke to Sam." } });
    expect(note()).toBe("");
    act(() => { vi.advanceTimersByTime(700); });
    expect(note()).toBe("Spoke to Sam.");
  });

  it("keeps an unsaved edit when the drawer closes before the debounce", () => {
    render(<Drawers />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Closed fast." } });
    act(() => { usePfStore.getState().closeDrawers(); });
    expect(note()).toBe("Closed fast.");
  });

  it("drafts the follow-up from the live note and as an application follow-up", async () => {
    render(<Drawers />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Referred by Sam." } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /draft follow-up/i })); });
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ kind: "application", company: "Monzo", role: "Backend Intern", chatNotes: "Referred by Sam." }));
    expect(run.mock.calls[0][0]).not.toHaveProperty("contactName");
  });
});
