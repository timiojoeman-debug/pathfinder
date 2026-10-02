import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/pf/use-ai", () => ({
  useAiTask: () => ({ data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn() }),
}));

import { ContactsBoard } from "../contacts-board";
import { usePfStore } from "@/lib/pf/store";
import { isStaleContact } from "@/lib/pf/contacts";

const PRISTINE = usePfStore.getState();
const s = () => usePfStore.getState();
const NOW = new Date("2027-10-02T09:00:00Z");

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-01T09:00:00Z"));
  s().addContact({ name: "Sam Lee", company: "Monzo", howWeMet: "linkedin" });
  vi.setSystemTime(new Date("2027-09-01T09:00:00Z"));
  s().addContact({ name: "Ana Fresh", company: "Wise", howWeMet: "event" });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("isStaleContact", () => {
  it("is true only beyond 12 calendar months", () => {
    const now = NOW.getTime();
    expect(isStaleContact({ updatedAt: new Date("2026-10-03T00:00:00Z").getTime() }, now)).toBe(false);
    expect(isStaleContact({ updatedAt: new Date("2026-10-01T00:00:00Z").getTime() }, now)).toBe(true);
  });
});

describe("Still relevant? card", () => {
  it("lists only contacts untouched for over 12 months", () => {
    render(<ContactsBoard />);
    const card = screen.getByRole("region", { name: "Still relevant?" });
    expect(card).toHaveTextContent("Sam Lee");
    expect(card).not.toHaveTextContent("Ana Fresh");
  });

  it("is absent when nobody is stale", () => {
    vi.setSystemTime(new Date("2026-07-01T09:00:00Z"));
    render(<ContactsBoard />);
    expect(screen.queryByRole("region", { name: "Still relevant?" })).toBeNull();
  });

  it("Delete removes the contact in one click and scrubs the name from events", () => {
    const id = s().contacts.find((c) => c.name === "Sam Lee")!.id;
    vi.setSystemTime(new Date("2026-06-02T09:00:00Z"));
    s().moveContact(id, "referred");
    vi.setSystemTime(NOW);
    expect(JSON.stringify(s().events)).toContain("Sam Lee");
    render(<ContactsBoard />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Sam Lee" }));
    expect(s().contacts).toHaveLength(2); // the first click only asks
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete Sam Lee" }));
    expect(s().contacts.map((c) => c.name)).toEqual(["Ana Fresh"]);
    expect(JSON.stringify(s().events)).not.toContain("Sam Lee");
    expect(screen.queryByRole("region", { name: "Still relevant?" })).toBeNull();
  });

  it("Keep bumps updatedAt, changes nothing else, and dismisses the card", () => {
    const before = s().contacts.find((c) => c.name === "Sam Lee")!;
    render(<ContactsBoard />);
    fireEvent.click(screen.getByRole("button", { name: "Keep Sam Lee" }));
    const after = s().contacts.find((c) => c.name === "Sam Lee")!;
    expect(after.updatedAt).toBe(NOW.getTime());
    expect({ ...after, updatedAt: 0 }).toEqual({ ...before, updatedAt: 0 });
    expect(screen.queryByRole("region", { name: "Still relevant?" })).toBeNull();
    // A year on, it asks again.
    vi.setSystemTime(new Date("2028-10-03T09:00:00Z"));
    expect(isStaleContact(after, Date.now())).toBe(true);
  });

  it("Cancel backs out of a delete without removing anyone", () => {
    render(<ContactsBoard />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Sam Lee" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel deleting Sam Lee" }));
    expect(s().contacts).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Delete Sam Lee" })).toBeInTheDocument();
  });

  it("moves focus to the next row after a delete, and to the contacts heading when none are left", () => {
    // A second stale contact, older than Sam so the order is stable.
    vi.setSystemTime(new Date("2026-05-01T09:00:00Z"));
    s().addContact({ name: "Bo Old", company: "Stripe", howWeMet: "other" });
    vi.setSystemTime(NOW);
    render(<ContactsBoard />);
    const first = s().contacts.filter((c) => c.name !== "Ana Fresh").map((c) => c.name)[0];
    const other = first === "Sam Lee" ? "Bo Old" : "Sam Lee";
    fireEvent.click(screen.getByRole("button", { name: `Delete ${first}` }));
    fireEvent.click(screen.getByRole("button", { name: `Confirm delete ${first}` }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: `Keep ${other}` }));
    fireEvent.click(screen.getByRole("button", { name: `Delete ${other}` }));
    fireEvent.click(screen.getByRole("button", { name: `Confirm delete ${other}` }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your contacts" }));
  });
});

