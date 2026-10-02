// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getServerDb: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { GET } from "../route";
import { getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured, getServerDb } from "@/lib/supabase/client";

const USER = { userId: "u1", email: "user@example.com", role: "student" };

describe("GET /api/account/export", () => {
  beforeEach(() => {
    vi.mocked(getAuthUser).mockReset();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getServerDb).mockReset();
  });

  it("401s when not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns a local-only note when storage is not configured", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const json = await (await GET()).json();
    expect(json.note).toMatch(/stored locally/i);
    expect(json.user.id).toBe("u1");
  });

  it("exports every user table as a downloadable JSON attachment", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    vi.mocked(getServerDb).mockReturnValue(makeSupabaseMock({ profiles: { data: [{ id: "p1" }] } }).db as never);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("pathfinder-data-u1.json");
    const json = JSON.parse(await res.text());
    expect(json.user.id).toBe("u1");
    expect(json.profiles).toEqual([{ id: "p1" }]);
    // A table with no rows still appears, as an empty array.
    expect(json.applications).toEqual([]);
  });

  it("includes the contacts board: it lives in profiles.client_state, which is exported whole", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    const clientState = { contacts: [{ id: "ct-1", name: "Sam Lee", company: "Monzo", stage: "messaged" }] };
    vi.mocked(getServerDb).mockReturnValue(makeSupabaseMock({ profiles: { data: [{ id: "p1", client_state: clientState }] } }).db as never);
    const json = JSON.parse(await (await GET()).text());
    expect(json.profiles[0].client_state.contacts[0].name).toBe("Sam Lee");
  });

  it("500s when the export query throws", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(USER);
    // isSupabaseConfigured is true but getServerDb yields null → db.from throws.
    vi.mocked(getServerDb).mockReturnValue(null);
    expect((await GET()).status).toBe(500);
  });
});
