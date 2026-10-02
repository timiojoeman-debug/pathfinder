import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { Drawers } from "../drawers";
import { usePfStore, type SavedJob } from "@/lib/pf/store";

/**
 * The job drawer renders links and adverts that came from outside: a listing's
 * URL from a community-edited list, and whatever older versions persisted. The
 * mappers now drop non-http(s) links, but saved jobs from before that exist, so
 * the drawer checks again at render.
 */

const PRISTINE = usePfStore.getState();

const job = (over: Partial<SavedJob> = {}): SavedJob => ({
  company: "Monzo", role: "Backend Intern", meta: "London · Adzuna", fit: 0, fitKnown: false,
  dash: 144, tone: "var(--faint)", tags: [], verdict: "", action: "Open", jdText: "", ...over,
});

function open(saved: SavedJob) {
  usePfStore.setState({ savedJobs: [saved], jobDetail: "monzo::backend intern" });
  render(<Drawers />);
}

beforeEach(() => {
  usePfStore.setState(PRISTINE, true);
  push.mockClear();
});

describe("JobDrawer", () => {
  it("links to an https posting in a new tab", () => {
    open(job({ url: "https://careers.example.org/1" }));
    const link = screen.getByRole("link", { name: /open original posting/i });
    expect(link.getAttribute("href")).toBe("https://careers.example.org/1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("renders no link for a persisted javascript: URL", () => {
    open(job({ url: "javascript:alert(document.cookie)" }));
    expect(screen.queryByRole("link", { name: /open original posting/i })).toBeNull();
  });

  it("says where the role came from rather than inventing a fit", () => {
    open(job());
    expect(screen.getByText("Not scored")).toBeTruthy();
    expect(screen.queryByText(/estimated from your baseline/i)).toBeNull();
  });

  it("hands the advert to the CV Tailor panel, and clears it when the posting has none", () => {
    usePfStore.setState({ cvTailorJD: "a previous posting's advert", cvTailorAts: { data: {} } });
    open(job({ jdText: "" }));
    fireEvent.click(screen.getByRole("button", { name: /tailor cv for this role/i }));
    expect(usePfStore.getState().cvTailorJD).toBe("");
    expect(usePfStore.getState().cvTailorAts).toBeNull();
    expect(push).toHaveBeenCalledWith("/cv");
  });
});
