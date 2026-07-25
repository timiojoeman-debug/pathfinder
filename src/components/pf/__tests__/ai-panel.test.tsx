import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GenerateButton, AiError, AiSection, AiList, AiTag, AiCaveat } from "../ai-panel";

/**
 * The shared chrome every AI panel is built from. These pin the behaviour that
 * matters across all generate surfaces: the button shows its own pending state
 * and can't be double-fired, errors are shown (never swallowed), "not signed
 * in" is guidance with a link rather than a fault, and the list/section
 * primitives render nothing when empty.
 */

describe("GenerateButton", () => {
  it("renders its label and fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<GenerateButton onClick={onClick} loading={false}>Run ATS audit</GenerateButton>);
    const btn = screen.getByRole("button", { name: "Run ATS audit" });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows the loading label, marks itself busy, and disables while loading", () => {
    const onClick = vi.fn();
    render(<GenerateButton onClick={onClick} loading loadingLabel="Auditing…">Run ATS audit</GenerateButton>);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("Auditing…");
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is disabled and inert when the disabled prop is set", () => {
    const onClick = vi.fn();
    render(<GenerateButton onClick={onClick} loading={false} disabled>Score the match</GenerateButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("AiError", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<AiError message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a failure as an alert, with no sign-in link", () => {
    render(<AiError message="Something went wrong" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Something went wrong");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("frames a not-signed-in state as status guidance with a sign-in link", () => {
    render(<AiError message="Sign in to generate this." needsAuth />);
    expect(screen.getByRole("status")).toBeTruthy();
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
  });
});

describe("AiSection / AiList / AiTag / AiCaveat", () => {
  it("AiSection renders its title and children", () => {
    render(<AiSection title="Strengths"><p>Ships real projects</p></AiSection>);
    expect(screen.getByText("Strengths")).toBeTruthy();
    expect(screen.getByText("Ships real projects")).toBeTruthy();
  });

  it("AiList renders nothing when empty or undefined", () => {
    const { container: empty } = render(<AiList items={[]} />);
    expect(empty).toBeEmptyDOMElement();
    const { container: undef } = render(<AiList items={undefined} />);
    expect(undef).toBeEmptyDOMElement();
  });

  it("AiList renders one item per string", () => {
    render(<AiList items={["Quantify your bullets", "Add a project"]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Quantify your bullets")).toBeTruthy();
  });

  it("AiTag and AiCaveat render their children", () => {
    render(<><AiTag>Behavioral</AiTag><AiCaveat>First draft — check before sending.</AiCaveat></>);
    expect(screen.getByText("Behavioral")).toBeTruthy();
    expect(screen.getByText(/First draft/)).toBeTruthy();
  });
});
