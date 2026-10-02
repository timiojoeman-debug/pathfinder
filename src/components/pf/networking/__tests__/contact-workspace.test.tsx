import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const emit = vi.fn();
const completeCoffeeChat = vi.fn((c: { contact: string }) => c.contact.trim().length > 0);
let events: { type: string; ts: number; meta?: Record<string, string> }[] = [];
vi.mock("@/lib/pf/store", async (importOriginal) => ({
  // The real "already logged" rule, so the button and the store agree.
  recentCoffeeChat: (await importOriginal<typeof import("@/lib/pf/store")>()).recentCoffeeChat,
  usePfStore: (sel: (s: { emit: typeof emit; completeCoffeeChat: typeof completeCoffeeChat }) => unknown) =>
    sel({ emit, completeCoffeeChat }),
  useProfile: () => ({ events, coffeeChatsDone: events.length }),
}));
vi.mock("@/lib/pf/ai-context", () => ({
  networkingProfileLine: () => "A CS student targeting backend internships.",
  cvStrengthLines: () => ["Shipped a Go service"],
}));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import { ContactWorkspace } from "../contact-workspace";
import { useAiTask } from "@/lib/pf/use-ai";

/**
 * One contact through the arc: prep -> follow-up -> referral. Each stage unlocks
 * from the input the previous one produced, mirroring what the routes require
 * (follow-up refuses step 1 without notes; a referral needs a role). These pin
 * the three gates and the three run payloads.
 */

type Task = ReturnType<typeof useAiTask>;
function aiTask(over: Partial<Task> = {}): Task {
  return { data: null, loading: false, error: null, needsAuth: false, run: vi.fn(), reset: vi.fn(), ...over } as unknown as Task;
}

let prepTask: Task;
let followTask: Task;
let referralTask: Task;

beforeEach(() => {
  emit.mockClear();
  completeCoffeeChat.mockClear();
  events = [];
  prepTask = aiTask();
  followTask = aiTask();
  referralTask = aiTask();
  vi.mocked(useAiTask).mockImplementation((endpoint: string) =>
    endpoint.includes("coffee-chat-prep") ? prepTask : endpoint.includes("follow-up") ? followTask : referralTask,
  );
});

function fill(placeholder: RegExp, value: string) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
}

describe("ContactWorkspace — coffee chat prep", () => {
  it("needs a name and company, then runs and logs", async () => {
    prepTask = aiTask({ run: vi.fn(async () => ({ data: { openingScript: "Thanks for the time." } })) as never });
    render(<ContactWorkspace />);
    expect(screen.getByRole("button", { name: /prep the chat/i })).toBeDisabled();
    fill(/contact name/i, "Dana");
    fill(/^company$/i, "Stripe");
    const btn = screen.getByRole("button", { name: /prep the chat/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    await waitFor(() => expect(prepTask.run).toHaveBeenCalledWith(expect.objectContaining({ contactName: "Dana", contactCompany: "Stripe" })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "networking", expect.stringContaining("Dana"), { kind: "coffee-chat-prep" }));
  });
});

describe("ContactWorkspace — follow-up", () => {
  it("refuses a step-1 follow-up without notes, then unlocks once notes are added", async () => {
    followTask = aiTask({ run: vi.fn(async () => ({ data: { message: "Thanks again, Dana." } })) as never });
    render(<ContactWorkspace />);
    fill(/contact name/i, "Dana");
    expect(screen.getByRole("button", { name: /write the follow-up/i })).toBeDisabled();
    expect(screen.getByText(/a thank-you needs your notes/i)).toBeTruthy();

    fill(/what did you actually talk about/i, "Talked about their testing culture.");
    const btn = screen.getByRole("button", { name: /write the follow-up/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    await waitFor(() => expect(followTask.run).toHaveBeenCalledWith(expect.objectContaining({ contactName: "Dana", cadenceStep: 1, chatNotes: expect.stringContaining("testing culture") })));
  });
});

describe("ContactWorkspace — referral", () => {
  it("needs the name and role, then runs with the CV strengths", async () => {
    referralTask = aiTask({ run: vi.fn(async () => ({ data: { referralMessage: "Would you refer me?" } })) as never });
    render(<ContactWorkspace />);
    fill(/contact name/i, "Dana");
    expect(screen.getByRole("button", { name: /build referral package/i })).toBeDisabled();
    fill(/their role/i, "Backend Intern");
    const btn = screen.getByRole("button", { name: /build referral package/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    await waitFor(() => expect(referralTask.run).toHaveBeenCalledWith(expect.objectContaining({ contactName: "Dana", roleName: "Backend Intern", cvStrengths: ["Shipped a Go service"] })));
    await waitFor(() => expect(emit).toHaveBeenCalledWith("AiConsulted", "networking", expect.stringContaining("referral package"), { kind: "referral-package" }));
  });
});

describe("ContactWorkspace — who the contact is", () => {
  it("offers the referral only for a peer, and tells the prep and follow-up routes who they are", async () => {
    prepTask = aiTask({ run: vi.fn(async () => ({ data: {} })) as never });
    followTask = aiTask({ run: vi.fn(async () => ({ data: {} })) as never });
    render(<ContactWorkspace />);
    expect(screen.getByRole("button", { name: /build referral package/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Recruiter" }));
    expect(screen.queryByRole("button", { name: /build referral package/i })).toBeNull();
    expect(screen.getByText(/only people on the team can refer you/i)).toBeTruthy();

    fill(/contact name/i, "Dana");
    fill(/^company$/i, "Stripe");
    fireEvent.click(screen.getByRole("button", { name: /prep the chat/i }));
    await waitFor(() => expect(prepTask.run).toHaveBeenCalledWith(expect.objectContaining({ contactType: "recruiter" })));
    fill(/what did you actually talk about/i, "Their grad scheme.");
    fireEvent.click(screen.getByRole("button", { name: /write the follow-up/i }));
    await waitFor(() => expect(followTask.run).toHaveBeenCalledWith(expect.objectContaining({ contactType: "recruiter" })));

    fireEvent.click(screen.getByRole("button", { name: "Peer" }));
    expect(screen.getByRole("button", { name: /build referral package/i })).toBeTruthy();
  });
});

describe("ContactWorkspace — shared contact + chat done", () => {
  it("prefills from the page's shared contact and reports edits back", () => {
    const onContactChange = vi.fn();
    render(<ContactWorkspace contact={{ name: "Dana", company: "Stripe" }} onContactChange={onContactChange} />);
    expect(screen.getByPlaceholderText(/contact name/i)).toHaveValue("Dana");
    expect(screen.getByPlaceholderText(/^company$/i)).toHaveValue("Stripe");
    fill(/contact name/i, "Dana Kim");
    expect(onContactChange).toHaveBeenCalledWith({ name: "Dana Kim" });
  });

  it("marks a chat done only with a named contact", () => {
    render(<ContactWorkspace />);
    expect(screen.getByRole("button", { name: /mark chat done/i })).toBeDisabled();
    fill(/contact name/i, "Dana");
    fill(/^company$/i, "Stripe");
    fireEvent.click(screen.getByRole("button", { name: /mark chat done/i }));
    expect(completeCoffeeChat).toHaveBeenCalledWith({ contact: "Dana", company: "Stripe" });
  });

  it("reads 'already logged' from the event log, so it survives navigation", () => {
    events = [{ type: "CoffeeChatCompleted", ts: Date.now() - 60_000, meta: { contact: "Dana", company: "Stripe" } }];
    render(<ContactWorkspace contact={{ name: "dana ", company: "STRIPE" }} />);
    expect(screen.getByRole("button", { name: /chat with dana logged/i })).toBeDisabled();
  });

  it("allows a genuine later chat once the last one is over a day old", () => {
    events = [{ type: "CoffeeChatCompleted", ts: Date.now() - 25 * 3600_000, meta: { contact: "Dana", company: "Stripe" } }];
    render(<ContactWorkspace contact={{ name: "Dana", company: "Stripe" }} />);
    expect(screen.getByRole("button", { name: /mark chat done/i })).not.toBeDisabled();
  });
});
