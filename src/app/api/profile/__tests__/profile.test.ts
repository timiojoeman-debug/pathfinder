// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createAdminClient: vi.fn(),
}));

import { POST, GET } from "../route";
import { getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured, createAdminClient } from "@/lib/supabase/client";

const USER = { userId: "u1", email: "a@b.c", role: "student" };

function post(body: unknown, raw?: string): Request {
  return new Request("http://test/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

describe("/api/profile", () => {
  beforeEach(() => {
    vi.mocked(getAuthUser).mockReset();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(createAdminClient).mockReset();
  });

  describe("POST", () => {
    it("401s when not authenticated", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(null);
      const res = await POST(post({}));
      expect(res.status).toBe(401);
    });

    it("400s on an invalid JSON body", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(USER);
      const res = await POST(post(null, "not json"));
      expect(res.status).toBe(400);
    });

    it("reports persisted:false when storage is not configured", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(USER);
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      const res = await POST(post({ userPhase: "direction_set" }));
      const json = await res.json();
      expect(json.persisted).toBe(false);
      expect(json.reason).toBe("storage-not-configured");
    });

    it("upserts the snapshot and reports persisted:true", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(USER);
      vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ profiles: { error: null } }).db as never);
      const res = await POST(post({ userPhase: "cv_analyzed", strengths: ["Go"] }));
      const json = await res.json();
      expect(json.persisted).toBe(true);
    });

    it("dedupes and appends fresh events", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(USER);
      vi.mocked(createAdminClient).mockReturnValue(
        makeSupabaseMock({
          profiles: { error: null },
          // first read: existing events; second call: the insert
          career_events: [{ data: [] }, { error: null }],
        }).db as never,
      );
      const res = await POST(post({
        userPhase: "networking",
        events: [{ type: "AiConsulted", phase: "networking", label: "outreach-1", ts: Date.now() }],
      }));
      expect((await res.json()).persisted).toBe(true);
    });

    it("reports persisted:false (not a 500) when the upsert throws", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(USER);
      vi.mocked(createAdminClient).mockImplementation(() => { throw new Error("db down"); });
      const res = await POST(post({ userPhase: "new" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.persisted).toBe(false);
      expect(json.reason).toBe("db down");
    });
  });

  describe("GET", () => {
    it("401s when not authenticated", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns null profile when storage is not configured", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(USER);
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      const json = await (await GET()).json();
      expect(json.profile).toBeNull();
      expect(json.reason).toBe("storage-not-configured");
    });

    it("returns the stored profile and events", async () => {
      vi.mocked(getAuthUser).mockResolvedValue(USER);
      const profileRow = { direction_statement: "Backend", user_phase: "cv_analyzed", client_state: { a: 1 } };
      vi.mocked(createAdminClient).mockReturnValue(
        makeSupabaseMock({
          profiles: { data: profileRow },
          career_events: { data: [{ event_type: "AiConsulted", phase: "cv", label: "x", meta: {}, created_at: "2026-07-25" }] },
        }).db as never,
      );
      const json = await (await GET()).json();
      expect(json.profile.direction_statement).toBe("Backend");
      expect(json.clientState).toEqual({ a: 1 });
      expect(json.events).toHaveLength(1);
    });
  });
});
