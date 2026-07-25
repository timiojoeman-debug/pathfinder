import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Chip, PageHeader, Kicker, Panel, Ring, MarkDot, Bar, Scanning } from "../ui";

/**
 * The shared presentational primitives. Chip carries real interaction (it's a
 * span acting as a button, so it must respond to both click and keyboard); the
 * rest are rendering contracts — labels, children, and the reveal-vs-plain
 * Panel branch.
 */

describe("Chip", () => {
  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Chip label="Backend" on={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Backend" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard-operable via Enter and Space", () => {
    const onClick = vi.fn();
    render(<Chip label="Frontend" on={false} onClick={onClick} />);
    const chip = screen.getByRole("button", { name: "Frontend" });
    fireEvent.keyDown(chip, { key: "Enter" });
    fireEvent.keyDown(chip, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("ignores other keys", () => {
    const onClick = vi.fn();
    render(<Chip label="Data" on onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Data" }), { key: "a" });
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("layout primitives", () => {
  it("PageHeader renders the label, title, and lede", () => {
    render(<PageHeader label="PHASE 02" title="CV Optimisation"><p>Sharpen your CV.</p></PageHeader>);
    expect(screen.getByText("PHASE 02")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "CV Optimisation" })).toBeTruthy();
    expect(screen.getByText("Sharpen your CV.")).toBeTruthy();
  });

  it("Kicker renders its children", () => {
    render(<Kicker>Command Centre</Kicker>);
    expect(screen.getByText("Command Centre")).toBeTruthy();
  });

  it("Panel renders a plain div when reveal is off, keeping the panel class", () => {
    const { container } = render(<Panel reveal={false} className="extra">content</Panel>);
    const panel = container.querySelector(".pf-panel");
    expect(panel).toBeTruthy();
    expect(panel!.className).toContain("extra");
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("Panel still renders its children when reveal is on", () => {
    render(<Panel>revealed content</Panel>);
    expect(screen.getByText("revealed content")).toBeTruthy();
  });
});

describe("visual atoms", () => {
  it("Ring renders an svg and its centred children", () => {
    const { container } = render(<Ring size={56} value={75} tone="var(--accent)" stroke={6}><span>75</span></Ring>);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("75")).toBeTruthy();
  });

  it("MarkDot shows its mark", () => {
    render(<MarkDot mark="✓" bg="var(--strong)" />);
    expect(screen.getByText("✓")).toBeTruthy();
  });

  it("Bar renders without throwing", () => {
    const { container } = render(<Bar pct="60%" color="var(--accent)" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("Scanning shows its title and subtitle", () => {
    render(<Scanning title="Analyzing your CV" sub="Scoring against your direction" bar />);
    expect(screen.getByText("Analyzing your CV")).toBeTruthy();
    expect(screen.getByText("Scoring against your direction")).toBeTruthy();
  });
});
