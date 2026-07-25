// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ verifyPassword: vi.fn(), setAuthCookies: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/client";
import { verifyPassword, setAuthCookies } from "@/lib/auth";

function req(body: unknown): Request {
  return new Request("http://test/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const USER = { id: "u1", email: "user@example.com", password_hash: "salt:hash", role: "student" };

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(verifyPassword).mockReset();
    vi.mocked(setAuthCookies).mockReset();
  });

  it("503s when the database is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const res = await POST(req({ email: "user@example.com", password: "secret123" }));
    expect(res.status).toBe(503);
  });

  it("400s on an invalid email", async () => {
    const res = await POST(req({ email: "not-an-email", password: "x" }));
    expect(res.status).toBe(400);
  });

  it("401s when no user matches the email", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ users: { data: null } }).db as never);
    const res = await POST(req({ email: "user@example.com", password: "secret123" }));
    expect(res.status).toBe(401);
  });

  it("401s when the password does not verify", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ users: { data: USER } }).db as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const res = await POST(req({ email: "user@example.com", password: "wrong" }));
    expect(res.status).toBe(401);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it("sets cookies and returns the user on a valid login", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ users: { data: USER } }).db as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const res = await POST(req({ email: "User@Example.com", password: "secret123" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toEqual({ id: "u1", email: "user@example.com", role: "student" });
    expect(setAuthCookies).toHaveBeenCalledWith({ userId: "u1", email: "user@example.com", role: "student" });
  });
});
