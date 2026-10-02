import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/jobs" }));

import JobsPage from "../page";
import { usePfStore } from "@/lib/pf/store";

const PRISTINE = usePfStore.getState();

function stubLanguage(lang: string) {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue([lang]);
  vi.spyOn(window.navigator, "language", "get").mockReturnValue(lang);
}

function stubSearch(jobs: unknown[] = []) {
  const fn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ jobs, configured: true }) }) as unknown as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const lastBody = (fn: ReturnType<typeof stubSearch>) =>
  JSON.parse(String((fn.mock.calls.at(-1) as unknown as [string, RequestInit])[1].body));

async function search(text = "software intern") {
  fireEvent.change(screen.getByPlaceholderText(/SWE intern/), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

beforeEach(() => usePfStore.setState(PRISTINE, true));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Jobs search: UK by default", () => {
  it("an en-GB browser with no location sends ukOnly and shows a removable UK pill", async () => {
    stubLanguage("en-GB");
    const fn = stubSearch();
    render(<JobsPage />);
    expect(await screen.findByRole("button", { name: "Remove UK filter" })).toBeInTheDocument();

    await search();
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(lastBody(fn)).toMatchObject({ roleType: "software intern", ukOnly: true });
  });

  it("removing the pill stops the filter", async () => {
    stubLanguage("en-GB");
    const fn = stubSearch();
    render(<JobsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove UK filter" }));
    expect(screen.queryByRole("button", { name: "Remove UK filter" })).toBeNull();

    await search();
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(lastBody(fn).ukOnly).toBeUndefined();
  });

  it("a non-UK locale gets no default filter", async () => {
    stubLanguage("en-US");
    const fn = stubSearch();
    render(<JobsPage />);
    await search();
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Remove UK filter" })).toBeNull();
    expect(lastBody(fn).ukOnly).toBeUndefined();
  });

  it("a typed location takes over from the UK default", async () => {
    stubLanguage("en-GB");
    const fn = stubSearch();
    render(<JobsPage />);
    await screen.findByRole("button", { name: "Remove UK filter" });
    fireEvent.change(screen.getByPlaceholderText(/Location/), { target: { value: "Manchester" } });
    await search();
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(lastBody(fn)).toMatchObject({ location: "Manchester" });
    expect(lastBody(fn).ukOnly).toBeUndefined();
  });

  it("shows the source and age on each result card, and no age when the date is unknown", async () => {
    stubLanguage("en-GB");
    const recent = new Date(Date.now() - 3 * 86_400_000).toISOString();
    stubSearch([
      { title: "Backend Intern", company: "Monzo", location: "London, UK", source: "Monzo careers", url: "https://x.test/1", matchScore: null, atsKeywords: [], postedAt: recent },
      { title: "Data Intern", company: "Skyscanner", location: "Edinburgh", source: "via vanshb03", url: "https://x.test/2", matchScore: null, atsKeywords: [] },
    ]);
    render(<JobsPage />);
    await search();
    expect(await screen.findByText("London, UK · Monzo careers · posted 3 days ago")).toBeInTheDocument();
    expect(screen.getByText("Edinburgh · via vanshb03")).toBeInTheDocument();
  });

  it("a stored UK location turns the UK default on even for a non-UK browser", async () => {
    stubLanguage("en-US");
    usePfStore.setState({ location: "Edinburgh, UK" });
    const fn = stubSearch();
    render(<JobsPage />);
    expect(await screen.findByRole("button", { name: "Remove UK filter" })).toBeInTheDocument();
    await search();
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(lastBody(fn)).toMatchObject({ ukOnly: true });
  });

  it("a stored non-UK location skips the UK default and prefills the location filter", async () => {
    stubLanguage("en-GB");
    usePfStore.setState({ location: "Berlin, Germany" });
    const fn = stubSearch();
    render(<JobsPage />);
    await waitFor(() => expect(screen.getByPlaceholderText(/Location/)).toHaveValue("Berlin, Germany"));
    expect(screen.queryByRole("button", { name: "Remove UK filter" })).toBeNull();
    await search();
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(lastBody(fn)).toMatchObject({ location: "Berlin, Germany" });
    expect(lastBody(fn).ukOnly).toBeUndefined();
  });

  it("with no stored location the browser locale still decides", async () => {
    stubLanguage("en-GB");
    usePfStore.setState({ location: "" });
    render(<JobsPage />);
    expect(await screen.findByRole("button", { name: "Remove UK filter" })).toBeInTheDocument();
  });
});
