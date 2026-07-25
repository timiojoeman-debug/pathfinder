// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn(), clearAuthCookies: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getServerDb: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";
import { getAuthUser, clearAuthCookies } from "@/lib/auth";
import { isSupabaseConfigured, getServerDb } from "@/lib/supabase/client";

const USER = { userId: "u1", email: "user@example.com", role: "student" };

function req(body: unknown): Request {
  return new Request("http://test/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    vi.mocked(getAuthUser).mockReset();
    vi.mocked(clearAuthCookies).mockClear();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getServerDb).mockReset();
  });

  it("401s when not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    expect((await POST(req({ confirm: "DELETE" }))).status).toBe(401);
  });

  it("400s without the exact typed confirmation", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    expect((await POST(req({ confirm: "delete" }))).status).toBe(400);
  });

  it("clears cookies and reports no server account when storage is not configured", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const json = await (await POST(req({ confirm: "DELETE" }))).json();
    expect(json.deleted).toBe(false);
    expect(json.reason).toBe("no-server-account");
    expect(clearAuthCookies).toHaveBeenCalled();
  });

  it("deletes the user and signs them out on success", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    vi.mocked(getServerDb).mockReturnValue(makeSupabaseMock({ users: { error: null } }).db as never);
    const res = await POST(req({ confirm: "DELETE" }));
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(true);
    expect(clearAuthCookies).toHaveBeenCalled();
  });

  it("500s and does not sign out when the delete errors", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    vi.mocked(getServerDb).mockReturnValue(makeSupabaseMock({ users: { error: { message: "boom" } } }).db as never);
    const res = await POST(req({ confirm: "DELETE" }));
    expect(res.status).toBe(500);
    expect(clearAuthCookies).not.toHaveBeenCalled();
  });
});
