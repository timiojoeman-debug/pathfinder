import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/pf/use-ai", () => ({
  useAiTask: () => ({ data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn() }),
}));

import { ContactsBoard } from "../contacts-board";
import { Drawers } from "../../drawers";
import { usePfStore } from "@/lib/pf/store";

/**
 * The board's add and move flow, plus the drawer that opens from a card and the
 * links between a contact and the applications at their company.
 */

const PRISTINE = usePfStore.getState();
const s = () => usePfStore.getState();
const addStatus = () => within(screen.getByRole("form", { name: "Add a contact" })).getByRole("status");
const stage = (name: string) => screen.getByRole("region", { name });

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
  push.mockClear();
});

function addViaForm(name: string, company: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Company"), { target: { value: company } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("ContactsBoard — add and move", () => {
  it("adds a contact into Researched, and says what the form is for", () => {
    render(<ContactsBoard />);
    expect(screen.getByText(/No personal phone numbers or home addresses/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    addViaForm("Sam Lee", "Monzo");
    expect(within(stage("Researched")).getByText("Sam Lee")).toBeInTheDocument();
    expect(s().contacts).toHaveLength(1);
    expect(addStatus()).toHaveTextContent(/Added Sam Lee/);
  });

  it("refuses a duplicate and an unsafe link", () => {
    render(<ContactsBoard />);
    addViaForm("Sam Lee", "Monzo");
    addViaForm("sam lee", "MONZO");
    expect(addStatus()).toHaveTextContent(/already have a contact/);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Wise" } });
    fireEvent.change(screen.getByLabelText("Link"), { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(addStatus()).toHaveTextContent(/http:\/\/ or https:\/\//);
    expect(s().contacts).toHaveLength(1);
  });

  it("moves a contact between stages without counting it as outreach", () => {
    render(<ContactsBoard />);
    addViaForm("Sam Lee", "Monzo");
    fireEvent.change(screen.getByLabelText("Move Sam Lee to"), { target: { value: "messaged" } });
    expect(within(stage("Messaged")).getByText("Sam Lee")).toBeInTheDocument();
    expect(within(stage("Researched")).queryByText("Sam Lee")).toBeNull();
    expect(s().netSent).toBe(0);
    fireEvent.change(screen.getByLabelText("Move Sam Lee to"), { target: { value: "referred" } });
    expect(within(stage("Referred")).getByText("Sam Lee")).toBeInTheDocument();
    expect(s().events.some((e) => e.type === "ReferralReceived")).toBe(true);
  });

  it("deletes all contacts only after a confirmation", () => {
    render(<ContactsBoard />);
    addViaForm("Sam Lee", "Monzo");
    fireEvent.click(screen.getByRole("button", { name: /delete all contacts/i }));
    expect(s().contacts).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /keep them/i }));
    expect(s().contacts).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /delete all contacts/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, delete all/i }));
    expect(s().contacts).toEqual([]);
  });
});

describe("contact drawer", () => {
  beforeEach(() => {
    s().addContact({ name: "Sam Lee", company: "Monzo", howWeMet: "alumni" });
    s().addCard({ company: "monzo", role: "Backend Intern", column: "applied" });
  });
  const id = () => s().contacts[0].id;

  it("opens from a card, saves notes on a pause and when closed early", () => {
    vi.useFakeTimers();
    try {
      render(<><ContactsBoard /><Drawers /></>);
      fireEvent.click(screen.getByRole("button", { name: "Open Sam Lee" }));
      fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Spoke at the fair." } });
      expect(s().contacts[0].notes).toBe("");
      act(() => { vi.advanceTimersByTime(700); });
      expect(s().contacts[0].notes).toBe("Spoke at the fair.");
      fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Closed fast." } });
      act(() => { s().closeDrawers(); });
      expect(s().contacts[0].notes).toBe("Closed fast.");
    } finally {
      vi.useRealTimers();
    }
  });

  it("lists the applications at their company and opens the tracker card", () => {
    s().openContact(id());
    render(<Drawers />);
    fireEvent.click(screen.getByRole("button", { name: /Backend Intern/ }));
    expect(s().contactDetail).toBeNull();
    expect(s().appDetail).toBe("monzo::backend intern");
  });

  it("the application drawer lists people at that company, case-insensitively, and opens them", () => {
    s().openApp("monzo::backend intern");
    render(<Drawers />);
    expect(screen.getByText(/People you know at monzo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sam Lee/ }));
    expect(s().appDetail).toBeNull();
    expect(s().contactDetail).toBe(id());
  });

  it("both drawers offer a plain new-tab alumni search for the company", () => {
    const expected = "https://www.linkedin.com/search/results/people/?keywords=Monzo";
    s().openContact(id());
    const { unmount } = render(<Drawers />);
    let link = screen.getByRole("link", { name: /Find alumni at Monzo/ });
    expect(link).toHaveAttribute("href", expected);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    unmount();
    act(() => { s().openApp("monzo::backend intern"); });
    render(<Drawers />);
    link = screen.getByRole("link", { name: /Find alumni at monzo/i });
    expect(link).toHaveAttribute("href", "https://www.linkedin.com/search/results/people/?keywords=monzo");
  });

  it("Work on this contact selects them and goes to research and outreach", () => {
    s().openContact(id());
    render(<Drawers />);
    fireEvent.click(screen.getByRole("button", { name: /work on this contact/i }));
    expect(s().netContact).toMatchObject({ name: "Sam Lee", company: "Monzo" });
    expect(s().contactDetail).toBeNull();
    expect(push).toHaveBeenCalledWith("/networking#net-research");
  });

  it("removes only after a confirm step", () => {
    s().openContact(id());
    render(<Drawers />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(s().contacts).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /yes, remove/i }));
    expect(s().contacts).toHaveLength(0);
    expect(s().contactDetail).toBeNull();
  });

  it("reverts a rejected rename to the stored name and keeps the warning until the next edit", () => {
    vi.useFakeTimers();
    try {
      s().addContact({ name: "Ana", company: "Monzo", howWeMet: "event" });
      s().openContact(s().contacts.find((c) => c.name === "Sam Lee")!.id);
      render(<Drawers />);
      const name = screen.getByLabelText("Name") as HTMLInputElement;
      fireEvent.change(name, { target: { value: "ana" } });
      act(() => { vi.advanceTimersByTime(700); });
      expect(name.value).toBe("Sam Lee");
      expect(screen.getByRole("status")).toHaveTextContent(/can.t be saved/);
      fireEvent.change(name, { target: { value: "Sam L" } });
      expect(screen.queryByText(/can.t be saved/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("sets a follow-up date and the stage from the drawer", () => {
    s().openContact(id());
    render(<Drawers />);
    fireEvent.change(screen.getByLabelText("Follow up on"), { target: { value: "2026-10-09" } });
    expect(s().contacts[0].followUpOn).toBe("2026-10-09");
    fireEvent.change(screen.getByLabelText("Stage"), { target: { value: "replied" } });
    expect(s().contacts[0].stage).toBe("replied");
  });
});

afterEach(() => vi.useRealTimers());
