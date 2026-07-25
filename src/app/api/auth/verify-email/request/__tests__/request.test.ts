// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createAdminClient: vi.fn(),
}));
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
import { sendEmail } from "@/lib/email";

function req(body: unknown): Request {
  return new Request("http://test/api/auth/verify-email/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/verify-email/request", () => {
  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(sendEmail).mockClear();
    vi.mocked(createAdminClient).mockReset();
  });

  it("returns ok without the DB when storage is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    expect((await (await POST(req({ email: "user@example.com" }))).json()).ok).toBe(true);
  });

  it("400s on an invalid email", async () => {
    expect((await POST(req({ email: "nope" }))).status).toBe(400);
  });

  it("sends a link to a registered, unverified address", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({ users: { data: { id: "u1", email_verified: false } }, email_verification_tokens: { error: null } }).db as never,
    );
    expect((await (await POST(req({ email: "user@example.com" }))).json()).ok).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("sends nothing to an already-verified address", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ users: { data: { id: "u1", email_verified: true } } }).db as never);
    expect((await (await POST(req({ email: "user@example.com" }))).json()).ok).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still returns ok and sends nothing for an unknown address (no enumeration)", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ users: { data: null } }).db as never);
    expect((await (await POST(req({ email: "ghost@example.com" }))).json()).ok).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
