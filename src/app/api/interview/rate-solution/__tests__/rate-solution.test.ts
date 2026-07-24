// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

/**
 * The rating route used to serve a fixed `rating: 8, "Solid approach"` whenever
 * the model was unreachable — a fabricated score over a solution nobody read.
 * These tests hold the honest replacement: a real rating passes through, and an
 * AI failure surfaces as an error rather than an invented 8/10.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/interview/rate-solution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockOpenAI(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        status === 200 ? JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }) : "err",
        { status, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
}

describe("POST /api/interview/rate-solution", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects an empty solution before spending a call", async () => {
    const res = await POST(req({ problemTitle: "Two Sum", userSolution: "  " }));
    expect(res.status).toBe(400);
  });

  it("returns the model's rating when it answers with a valid shape", async () => {
    mockOpenAI({ rating: 3, feedback: "Brute force — O(n^2). Use a hash map.", timeComplexity: "O(n^2)", topTwoApproaches: ["Hash map: O(n)"] });
    const res = await POST(req({ problemTitle: "Two Sum", userSolution: "nested loops over the array" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rating).toBe(3);
    expect(json.feedback).toContain("hash map");
  });

  it("errors rather than inventing a rating when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ problemTitle: "Two Sum", userSolution: "nested loops over the array" }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    // The old fabricated fallback must not resurface.
    expect(json.rating).toBeUndefined();
  });

  it("errors instead of accepting an out-of-range rating from the model", async () => {
    mockOpenAI({ rating: 99, feedback: "great" });
    const res = await POST(req({ problemTitle: "Two Sum", userSolution: "some real approach text" }));

    expect(res.status).toBe(500);
    expect((await res.json()).rating).toBeUndefined();
  });
});
