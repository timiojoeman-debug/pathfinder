import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/networking" }));
vi.mock("@/lib/pf/use-ai", () => ({ useAiTask: vi.fn() }));

import NetworkingPage from "../page";
import { useAiTask } from "@/lib/pf/use-ai";
import { netContactKey, netDraftKey, usePfStore } from "@/lib/pf/store";

/**
 * The page-level honesty rules: research only personalises the person it was run
 * on, and a failure says what is actually left on screen.
 */

type Task = ReturnType<typeof useAiTask>;
const PRISTINE = usePfStore.getState();
let outreach: Task;
const idle = (over: Partial<Task> = {}) =>
  ({ data: null, loading: false, error: null, needsAuth: false, run: vi.fn(async () => null), reset: vi.fn(), ...over }) as unknown as Task;

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
  outreach = idle();
  vi.mocked(useAiTask).mockImplementation((endpoint: string) => (endpoint.includes("networking/outreach") ? outreach : idle()));
});

const sam = { name: "Sam", company: "Monzo", about: "Sam's About text", experience: "" };
const samResearch = { key: netContactKey(sam), name: "Sam", data: { connectionPoints: ["Both at Edinburgh"] } };

describe("NetworkingPage — research belongs to one contact", () => {
  it("uses research for the contact it was run on", async () => {
    usePfStore.setState({ netContact: sam, netResearch: samResearch });
    render(<NetworkingPage />);
    expect(screen.getByText(/Personalising on your research of Sam/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /generate with ai/i }));
    await waitFor(() => expect(outreach.run).toHaveBeenCalled());
    const body = vi.mocked(outreach.run).mock.calls[0][0] as { sharedAttributes: string };
    expect(body.sharedAttributes).toContain("Both at Edinburgh");
    expect(body.sharedAttributes).toContain("Sam's About text");
  });

  it("ignores Sam's research and pasted text once the contact is Ana", async () => {
    usePfStore.setState({ netContact: { ...sam, name: "Ana" }, netResearch: samResearch });
    render(<NetworkingPage />);
    expect(screen.queryByText(/Personalising on your research of Ana/)).toBeNull();
    expect(screen.getByText(/Your research was on Sam/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /generate with ai/i }));
    await waitFor(() => expect(outreach.run).toHaveBeenCalled());
    const body = vi.mocked(outreach.run).mock.calls[0][0] as { sharedAttributes: string };
    expect(body.sharedAttributes).not.toMatch(/Edinburgh|Sam's About/);
  });
});

describe("NetworkingPage — failure copy matches what is shown", () => {
  it("names the template when there is no previous draft", () => {
    outreach = idle({ error: "The AI writer is unavailable right now." });
    render(<NetworkingPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/structural template/);
  });

  it("says the previous draft is kept when one is on screen", () => {
    usePfStore.setState({
      netContact: sam,
      netDraft: { key: netDraftKey("Recruiter", sam), paras: ["Hi Sam, an earlier real draft."], followUp: null, naturalness: null, questions: [], topics: [] },
    });
    outreach = idle({ error: "The AI writer is unavailable right now." });
    render(<NetworkingPage />);
    expect(screen.getByText(/an earlier real draft/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/previous draft is kept/);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/structural template/);
  });

  it("shows an error on a 200 with an empty message instead of doing nothing", async () => {
    outreach = idle({ run: vi.fn(async () => ({ message: "   " })) as never });
    render(<NetworkingPage />);
    fireEvent.click(screen.getByRole("button", { name: /generate with ai/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/empty message/);
    expect(usePfStore.getState().netDraft).toBeNull();
  });
});

describe("NetworkingPage — playbooks", () => {
  it("renders the events playbook, the matrix, the signals and a one-liner from the direction", () => {
    usePfStore.setState({ dirRole: "Backend", dirStack: ["Go"], dirIndustry: "Fintech" });
    render(<NetworkingPage />);
    expect(screen.getByText("Networking at events")).toBeInTheDocument();
    expect(screen.getByText("Who to ask for what")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(9);
    expect(screen.getByText(/aiming for Backend roles in Fintech/)).toBeInTheDocument();
    expect(screen.getByText(/What brought you to this one/)).toBeInTheDocument();
  });
});
