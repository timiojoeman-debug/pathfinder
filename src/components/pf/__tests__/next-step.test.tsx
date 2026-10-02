import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const openApp = vi.fn();
vi.mock("@/lib/pf/store", () => ({
  useRecommendations: vi.fn(),
  usePfStore: (sel: (s: { openApp: typeof openApp }) => unknown) => sel({ openApp }),
}));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

import { NextStep } from "../next-step";
import { useRecommendations } from "@/lib/pf/store";
import { usePathname } from "next/navigation";

/**
 * The connective banner that opens every phase page. It always surfaces the
 * single #1 recommendation; when that action already points at the current page
 * the CTA becomes "you're in the right place" rather than a link away.
 */

const REC = {
  id: "start-networking",
  title: "Get a referral into a target company",
  why: "A referral converts ~4× a cold application.",
  href: "/networking",
  phase: "networking" as const,
  impact: "4× odds",
  impactTone: "var(--strong)",
  priority: 90,
};

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/intel");
  vi.mocked(useRecommendations).mockReturnValue([REC]);
});

describe("NextStep", () => {
  it("renders nothing when there are no recommendations", () => {
    vi.mocked(useRecommendations).mockReturnValue([]);
    const { container } = render(<NextStep />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the top recommendation and a link to act when it's for another page", () => {
    render(<NextStep />);
    expect(screen.getByText(REC.title)).toBeTruthy();
    expect(screen.getByText(REC.why)).toBeTruthy();
    expect(screen.getByText("4× odds")).toBeTruthy();
    const link = screen.getByRole("link", { name: /do it/i });
    expect(link).toHaveAttribute("href", "/networking");
  });

  it("swaps the CTA for reassurance when already on the recommended page", () => {
    vi.mocked(usePathname).mockReturnValue("/networking");
    render(<NextStep />);
    expect(screen.getByText(/right place/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /do it/i })).toBeNull();
  });

  it("opens the card a tracker nudge is about, from the tracker page and from elsewhere", () => {
    openApp.mockClear();
    const nudge = { ...REC, id: "remind-monzo", href: "/tracker", cardKey: "monzo::backend intern" };
    vi.mocked(useRecommendations).mockReturnValue([nudge]);
    vi.mocked(usePathname).mockReturnValue("/tracker");
    const { unmount } = render(<NextStep />);
    fireEvent.click(screen.getByRole("button", { name: /open the card/i }));
    expect(openApp).toHaveBeenCalledWith("monzo::backend intern");
    unmount();

    openApp.mockClear();
    vi.mocked(usePathname).mockReturnValue("/intel");
    render(<NextStep />);
    fireEvent.click(screen.getByRole("link", { name: /do it/i }));
    expect(openApp).toHaveBeenCalledWith("monzo::backend intern");
  });

  it("renders the compact variant as a single link to the recommendation", () => {
    render(<NextStep variant="compact" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/networking");
    expect(screen.getByText(REC.title)).toBeTruthy();
  });
});
