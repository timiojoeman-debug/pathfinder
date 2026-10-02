// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

// In-memory stand-in for the ai_response_cache table.
type Row = { user_id: string; route: string; key_hash: string; response: unknown; created_at: string };
const store: Row[] = [];
let failReads = false;

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  getServerDb: () => ({
    from: () => ({
      select: () => {
        const f: Record<string, string> = {};
        const q = {
          eq: (k: string, v: string) => ((f[k] = v), q),
          maybeSingle: async () => {
            if (failReads) return { data: null, error: { message: "db down" } };
            const row = store.find((r) => Object.entries(f).every(([k, v]) => (r as Record<string, unknown>)[k] === v));
            return { data: row ?? null, error: null };
          },
        };
        return q;
      },
      upsert: async (row: Row) => {
        const i = store.findIndex((r) => r.user_id === row.user_id && r.route === row.route && r.key_hash === row.key_hash);
        if (i >= 0) store[i] = row; else store.push(row);
        return { error: null };
      },
    }),
  }),
}));

import { POST as titleVariants } from "@/app/api/direction/title-variants/route";
import { POST as companyBriefing } from "@/app/api/interview/company-briefing/route";
import { getCachedAi, hashBody } from "../ai-cache";

function req(url: string, body: unknown, userId: string | null = "u1"): Request {
  return new Request(`http://test/api/${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "x-user-id": userId } : {}) },
    body: JSON.stringify(body),
  });
}

const VARIANTS = { variants: [{ title: "Backend Engineer", note: "Broadest" }] };
const BRIEFING = { data: { companyOverview: "Acme builds widgets." } };

function mockOpenAI(payload: unknown, status = 200) {
  const fn = vi.fn(async () =>
    new Response(
      status === 200 ? JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }) : "err",
      { status, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("AI response cache", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    store.length = 0;
    failReads = false;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("a hit skips the OpenAI call and returns the same shape", async () => {
    const fetchMock = mockOpenAI(VARIANTS);
    const first = await (await titleVariants(req("direction/title-variants", { role: "Backend" }))).json();
    const second = await (await titleVariants(req("direction/title-variants", { role: " backend " }))).json();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(second).toEqual(VARIANTS);
  });

  it("caches the company briefing too", async () => {
    const fetchMock = mockOpenAI(BRIEFING);
    const body = { companyName: "Acme", roleName: "SWE", studentProfile: "CS student" };
    const first = await (await companyBriefing(req("interview/company-briefing", body))).json();
    const second = await (await companyBriefing(req("interview/company-briefing", body))).json();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("a different body misses", async () => {
    const fetchMock = mockOpenAI(VARIANTS);
    await titleVariants(req("direction/title-variants", { role: "Backend" }));
    await titleVariants(req("direction/title-variants", { role: "Frontend" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("an entry older than 24h misses", async () => {
    const fetchMock = mockOpenAI(VARIANTS);
    await titleVariants(req("direction/title-variants", { role: "Backend" }));
    store[0].created_at = new Date(Date.now() - 25 * 3600_000).toISOString();
    await titleVariants(req("direction/title-variants", { role: "Backend" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store).toHaveLength(1); // refreshed in place, not duplicated
  });

  it("a failed cache read still calls the AI", async () => {
    failReads = true;
    const fetchMock = mockOpenAI(VARIANTS);
    const res = await titleVariants(req("direction/title-variants", { role: "Backend" }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed or invalid AI response", async () => {
    mockOpenAI({}, 500);
    expect((await titleVariants(req("direction/title-variants", { role: "Backend" }))).status).not.toBe(200);
    mockOpenAI({ nonsense: true });
    expect((await titleVariants(req("direction/title-variants", { role: "Backend" }))).status).not.toBe(200);
    expect(store).toHaveLength(0);
  });

  it("different users do not share entries", async () => {
    const fetchMock = mockOpenAI(VARIANTS);
    await titleVariants(req("direction/title-variants", { role: "Backend" }, "u1"));
    await titleVariants(req("direction/title-variants", { role: "Backend" }, "u2"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.map((r) => r.user_id).sort()).toEqual(["u1", "u2"]);
  });

  it("without a user id nothing is read or written", async () => {
    mockOpenAI(VARIANTS);
    await titleVariants(req("direction/title-variants", { role: "Backend" }, null));
    expect(store).toHaveLength(0);
  });

  it("canonicalisation ignores key order, case and padding", async () => {
    store.push({ user_id: "u1", route: "r", key_hash: hashBody({ a: 1, b: "X" }), response: { ok: 1 }, created_at: new Date().toISOString() });
    expect(await getCachedAi("u1", "r", { b: " x", a: 1 })).toEqual({ ok: 1 });
  });
});
