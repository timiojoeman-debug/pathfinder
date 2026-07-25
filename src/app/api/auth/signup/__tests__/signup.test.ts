// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ hashPassword: vi.fn(async () => "salt:hash"), setAuthCookies: vi.fn() }));
vi.mock("@/lib/tokens", () => ({
  generateToken: vi.fn(() => "verify-token"),
  hashToken: vi.fn(async () => "token-hash"),
  TOKEN_TTL_MS: { verifyEmail: 3_600_000 },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => undefined),
  verificationEmail: vi.fn(() => ({ subject: "Verify your email", html: "<a>verify</a>" })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/client";
import { setAuthCookies } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

function req(body: unknown): Request {
  return new Request("http://test/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const NEW_USER = { id: "u1", email: "user@example.com", role: "student" };

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(setAuthCookies).mockReset();
    vi.mocked(sendEmail).mockClear();
  });

  it("503s when the database is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const res = await POST(req({ email: "user@example.com", password: "longenough" }));
    expect(res.status).toBe(503);
  });

  it("400s on a short password", async () => {
    const res = await POST(req({ email: "user@example.com", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("409s when an account already exists", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ users: { data: { id: "existing" } } }).db as never);
    const res = await POST(req({ email: "user@example.com", password: "longenough" }));
    expect(res.status).toBe(409);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it("500s when the insert fails", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({ users: [{ data: null }, { data: null, error: { message: "boom" } }] }).db as never,
    );
    const res = await POST(req({ email: "user@example.com", password: "longenough" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to create account");
  });

  it("creates the account, sends verification, and sets cookies", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({
        users: [{ data: null }, { data: NEW_USER, error: null }],
        profiles: { error: null },
        email_verification_tokens: { error: null },
      }).db as never,
    );
    const res = await POST(req({ email: "User@Example.com", password: "longenough", name: "Sam" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toEqual(NEW_USER);
    expect(setAuthCookies).toHaveBeenCalledWith({ userId: "u1", email: "user@example.com", role: "student" });
    expect(sendEmail).toHaveBeenCalled();
  });

  it("still creates the account when the verification email fails", async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("smtp down"));
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({
        users: [{ data: null }, { data: NEW_USER, error: null }],
        profiles: { error: null },
        email_verification_tokens: { error: null },
      }).db as never,
    );
    const res = await POST(req({ email: "user@example.com", password: "longenough" }));
    expect(res.status).toBe(200);
    expect((await res.json()).user).toEqual(NEW_USER);
  });
});
