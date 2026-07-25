// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/tokens", () => ({
  generateToken: vi.fn(() => "reset-token"),
  hashToken: vi.fn(async () => "token-hash"),
  TOKEN_TTL_MS: { passwordReset: 3_600_000 },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => undefined),
  passwordResetEmail: vi.fn(() => ({ subject: "Reset your password", html: "<a>reset</a>" })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/client";
import { sendEmail } from "@/lib/email";

function req(body: unknown): Request {
  return new Request("http://test/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/password-reset/request", () => {
  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(sendEmail).mockClear();
    vi.mocked(createAdminClient).mockReset();
  });

  it("returns ok without touching the DB when storage is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const res = await POST(req({ email: "user@example.com" }));
    expect((await res.json()).ok).toBe(true);
  });

  it("400s on an invalid email", async () => {
    const res = await POST(req({ email: "nope" }));
    expect(res.status).toBe(400);
  });

  it("sends a reset link when the address is registered", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({ users: { data: { id: "u1" } }, password_reset_tokens: { error: null } }).db as never,
    );
    const res = await POST(req({ email: "User@Example.com" }));
    expect((await res.json()).ok).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("still returns ok and sends nothing for an unknown address (no enumeration)", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ users: { data: null } }).db as never);
    const res = await POST(req({ email: "ghost@example.com" }));
    expect((await res.json()).ok).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
