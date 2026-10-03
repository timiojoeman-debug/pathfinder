import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/jobs" }));

import JobsPage from "../page";
import { usePfStore } from "@/lib/pf/store";

const PRISTINE = usePfStore.getState();

const row = (title: string, over: Record<string, unknown> = {}) => ({
  id: title, title, company: `Co ${title}`, location: "London", source: "Adzuna", description: "",
  url: `https://x/${encodeURIComponent(title)}`, matchScore: null, atsKeywords: [], ...over,
});

async function searchWith(jobs: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ jobs, configured: true }) }) as unknown as Response));
  render(<JobsPage />);
  fireEvent.change(screen.getByPlaceholderText(/SWE intern/), { target: { value: "intern" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await screen.findByText(/live results/);
}

beforeEach(() => usePfStore.setState(PRISTINE, true));
afterEach(() => vi.unstubAllGlobals());

describe("Jobs feed quality", () => {
  it("tags role types and hides non-internships when Internships & placements is on", async () => {
    await searchWith([row("Software Engineer Intern"), row("Graduate Scheme"), row("Software Engineer Apprentice"), row("Industrial Placement"), row("Spring Insight Week")]);
    expect(screen.getByText("Graduate")).toBeInTheDocument();
    expect(screen.getByText("Apprenticeship")).toBeInTheDocument();
    expect(screen.getByLabelText(/Save and open Graduate Scheme/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Internships & placements" }));
    await waitFor(() => expect(screen.queryByLabelText(/Save and open Graduate Scheme/)).toBeNull());
    expect(screen.queryByLabelText(/Save and open Software Engineer Apprentice/)).toBeNull();
    expect(screen.getByLabelText(/Save and open Software Engineer Intern/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Save and open Industrial Placement/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Save and open Spring Insight Week/)).toBeNull();
  });

  it("disables the fit chips with a CV hint when fewer than 3 results are scored", async () => {
    await searchWith([row("A Intern", { matchScore: 70 }), row("B Intern"), row("C Intern")]);
    expect(screen.getByRole("button", { name: "Fit ≥ 60" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Fit ≥ 60" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "Fit ≥ 60" })).toHaveAttribute("aria-describedby", "fit-hint");
    expect(screen.getByRole("button", { name: "Fit ≥ 80" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Add your CV to score fit" })).toHaveAttribute("href", "/cv");
  });

  it("enables the fit chips once 3 results carry a score", async () => {
    await searchWith([row("A Intern", { matchScore: 70 }), row("B Intern", { matchScore: 50 }), row("C Intern", { matchScore: 90 })]);
    expect(screen.getByRole("button", { name: "Fit ≥ 60" })).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByRole("link", { name: "Add your CV to score fit" })).toBeNull();
  });
});
