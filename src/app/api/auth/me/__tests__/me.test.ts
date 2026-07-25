// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));

import { GET } from "../route";
import { getAuthUser } from "@/lib/auth";

/** `/auth/me` is called on navigation to hydrate the session. It returns the
 *  token payload when signed in and a 401 otherwise — nothing else. */
describe("GET /api/auth/me", () => {
  it("401s when there is no authenticated user", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBeTruthy();
  });

  it("returns the user when signed in", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ userId: "u1", email: "a@b.c", role: "student" });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toEqual({ userId: "u1", email: "a@b.c", role: "student" });
  });
});
