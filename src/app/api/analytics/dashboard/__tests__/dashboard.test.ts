// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "../route";

/**
 * A deliberate stub (see CLAUDE.md → Known Issues): analytics are derived
 * client-side by `progress.ts`, so this route only returns a notice until it
 * actually queries Supabase. The test pins that contract so the stub isn't
 * mistaken for a live endpoint.
 */
describe("GET /api/analytics/dashboard", () => {
  it("returns the client-side-analytics notice as JSON 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/client-side/i);
  });
});
