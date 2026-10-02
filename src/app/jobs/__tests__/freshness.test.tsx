import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/jobs" }));

import JobsPage from "../page";
import { expireProbeResults, mergeFreshness } from "@/lib/pf/use-freshness";
import { usePfStore, type SavedJob } from "@/lib/pf/store";

const PRISTINE = usePfStore.getState();
const URL_A = "https://job-boards.greenhouse.io/acme/jobs/1";
const URL_B = "https://careers.example.org/role";

const saved = (over: Partial<SavedJob>): SavedJob => ({
  company: "Acme", role: "Backend Intern", meta: "London · Acme careers", fit: 0, fitKnown: false,
  dash: 144, tone: "var(--faint)", tags: [], verdict: "", action: "Open", jdText: "", ...over,
});

function stubFreshness(statuses: Record<string, string>, probed = false) {
  const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ statuses, probed }) }) as unknown as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("saved role freshness", () => {
  it("a saved role removed from its board shows 'This posting has closed', and is not deleted", async () => {
    usePfStore.setState({ savedJobs: [saved({ url: URL_A }), saved({ role: "Data Intern", url: URL_B })] });
    stubFreshness({ [URL_A]: "closed", [URL_B]: "unknown" });
    render(<JobsPage />);

    expect(await screen.findByText("This posting has closed")).toBeInTheDocument();
    expect(screen.getAllByText("This posting has closed")).toHaveLength(1);
    expect(usePfStore.getState().savedJobs).toHaveLength(2);
    expect(screen.getByLabelText("Open Data Intern at Acme")).toBeInTheDocument();
  });

  it("an unconfirmed closure reads 'may have closed'", async () => {
    usePfStore.setState({ savedJobs: [saved({ url: URL_B })] });
    stubFreshness({ [URL_B]: "may-have-closed" }, true);
    render(<JobsPage />);
    expect(await screen.findByText("This posting may have closed")).toBeInTheDocument();
  });

  it("asks for a probe only once a week", async () => {
    usePfStore.setState({ savedJobs: [saved({ url: URL_B })] });
    const first = stubFreshness({ [URL_B]: "unknown" }, true);
    const { unmount } = render(<JobsPage />);
    await vi.waitFor(() => expect(first).toHaveBeenCalled());
    expect(JSON.parse(String((first.mock.calls[0] as unknown as [string, RequestInit])[1].body)).probe).toBe(true);
    await vi.waitFor(() => expect(localStorage.getItem("pf-role-freshness")).toContain("probedAt"));
    unmount();

    const second = stubFreshness({ [URL_B]: "unknown" });
    render(<JobsPage />);
    await vi.waitFor(() => expect(second).toHaveBeenCalled());
    expect(JSON.parse(String((second.mock.calls[0] as unknown as [string, RequestInit])[1].body)).probe).toBe(false);
  });

  it("signed out (401) shows nothing and changes nothing", async () => {
    usePfStore.setState({ savedJobs: [saved({ url: URL_A })] });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response));
    render(<JobsPage />);
    await screen.findByLabelText("Open Backend Intern at Acme");
    expect(screen.queryByText(/posting/i)).toBeNull();
  });
});

describe("mergeFreshness", () => {
  it("keeps a cached 'may have closed' when the new answer is 'unknown', but lets a real answer replace it", () => {
    expect(mergeFreshness({ a: "may-have-closed" }, { a: "unknown" })).toEqual({ a: "may-have-closed" });
    expect(mergeFreshness({ a: "may-have-closed" }, { a: "ok" })).toEqual({ a: "ok" });
    expect(mergeFreshness({}, { a: "closed" })).toEqual({ a: "closed" });
  });
});

describe("expireProbeResults", () => {
  const WEEKS = (n: number) => n * 7 * 24 * 3600 * 1000;

  it("forgets a probe-derived 'may have closed' after four weeks, keeps feed-backed ones", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T00:00:00Z"));
    const now = Date.now();
    const cache = {
      probedAt: now,
      statuses: { fresh: "may-have-closed", old: "may-have-closed", legacy: "may-have-closed", feed: "closed" } as const,
      closedAt: { fresh: now - WEEKS(3), old: now - WEEKS(5) },
    };
    const out = expireProbeResults({ ...cache, statuses: { ...cache.statuses } }, now);
    expect(out.statuses).toEqual({ fresh: "may-have-closed", feed: "closed" });
    vi.useRealTimers();
  });

  it("a cache restored from localStorage with a stale probe result shows nothing for it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T00:00:00Z"));
    const now = Date.now();
    localStorage.setItem("pf-role-freshness", JSON.stringify({
      probedAt: now, statuses: { [URL_B]: "may-have-closed" }, closedAt: { [URL_B]: now - WEEKS(5) },
    }));
    usePfStore.setState({ savedJobs: [saved({ url: URL_B })] });
    stubFreshness({ [URL_B]: "unknown" });
    render(<JobsPage />);
    await screen.findByLabelText("Open Backend Intern at Acme");
    expect(screen.queryByText("This posting may have closed")).toBeNull();
    vi.useRealTimers();
  });
});
