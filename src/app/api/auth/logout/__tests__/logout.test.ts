// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ clearAuthCookies: vi.fn(async () => undefined) }));

import { POST } from "../route";
import { clearAuthCookies } from "@/lib/auth";

/** Logout clears the auth cookies and reports success. */
describe("POST /api/auth/logout", () => {
  it("clears the cookies and returns success", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(clearAuthCookies).toHaveBeenCalled();
  });
});
