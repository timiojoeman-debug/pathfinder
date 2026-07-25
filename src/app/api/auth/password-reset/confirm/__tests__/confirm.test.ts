// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ hashPassword: vi.fn(async () => "salt:hash") }));
vi.mock("@/lib/tokens", () => ({ hashToken: vi.fn(async () => "token-hash") }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/client";

const TOKEN = "reset-token-1234";
const future = () => new Date(Date.now() + 3_600_000).toISOString();
const past = () => new Date(Date.now() - 3_600_000).toISOString();

function req(body: unknown): Request {
  return new Request("http://test/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/password-reset/confirm", () => {
  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(createAdminClient).mockReset();
  });

  it("503s when storage is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    expect((await POST(req({ token: TOKEN, password: "longenough" }))).status).toBe(503);
  });

  it("400s on a short password", async () => {
    expect((await POST(req({ token: TOKEN, password: "short" }))).status).toBe(400);
  });

  it("400s when the token matches no row", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ password_reset_tokens: { data: null } }).db as never);
    const res = await POST(req({ token: TOKEN, password: "longenough" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid or has expired/i);
  });

  it("400s on an already-used token", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({ password_reset_tokens: { data: { id: "t1", user_id: "u1", expires_at: future(), used: true } } }).db as never,
    );
    expect((await POST(req({ token: TOKEN, password: "longenough" }))).status).toBe(400);
  });

  it("400s on an expired token", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({ password_reset_tokens: { data: { id: "t1", user_id: "u1", expires_at: past(), used: false } } }).db as never,
    );
    expect((await POST(req({ token: TOKEN, password: "longenough" }))).status).toBe(400);
  });

  it("resets the password on a valid, unused, unexpired token", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({
        password_reset_tokens: { data: { id: "t1", user_id: "u1", expires_at: future(), used: false } },
        users: { error: null },
      }).db as never,
    );
    const res = await POST(req({ token: TOKEN, password: "longenough" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
