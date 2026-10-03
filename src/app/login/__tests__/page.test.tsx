import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import LoginPage from "../page";

// Screen readers navigate by headings; the login page had none (production sweep, 2026-10-03).
describe("Login page heading", () => {
  it("has exactly one level-1 heading, which follows the sign-in / sign-up mode", () => {
    render(<LoginPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome back");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Create your account");
  });
});
