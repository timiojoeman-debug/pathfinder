import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import SettingsPage from "../page";
import { usePfStore } from "@/lib/pf/store";

const PRISTINE = usePfStore.getState();
beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
});

describe("Settings — university", () => {
  it("writes the trimmed value to the store while keeping typed spaces on screen", () => {
    render(<SettingsPage />);
    const input = screen.getByLabelText("University") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  University of " } });
    expect(usePfStore.getState().university).toBe("University of");
    expect(input.value).toBe("  University of ");
  });

  it("shows the stored value and says what it is used for", () => {
    usePfStore.setState({ university: "Durham" });
    render(<SettingsPage />);
    expect((screen.getByLabelText("University") as HTMLInputElement).value).toBe("Durham");
    expect(screen.getByText(/only to build LinkedIn alumni-search links/i)).toBeTruthy();
  });
});
