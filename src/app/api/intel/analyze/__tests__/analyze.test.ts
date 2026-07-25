// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// callAI() logs OpenAI error responses through logger.error, which otherwise
// tries to persist. Mock it so the failure-path tests stay quiet and offline.
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/**
 * `/intel/analyze` uses `aiShape` (answers at the root OR nested under `data`)
 * and degrades to `{source:"heuristic", roles:[], priorityMoves:[]}` on any
 * failure — a 200 the client reads as success. These tests hold both: a real
 * analysis is tagged `source:"ai"`, and every failure path is tagged
 * `source:"heuristic"` so the panel can say the analysis degraded.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/intel/analyze", {
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

const ROLE = { company: "Monzo", role: "Backend Intern", jobDescription: "Go, Postgres, distributed systems." };
const AI_RESULT = {
  roles: [{ company: "Monzo", fitReason: "Go matches your backend focus", recommendedMove: "Apply now", requiredSkills: ["Go", "Postgres"] }],
  priorityMoves: [{ action: "Ship a Go service", why: "closes your only backend gap", impact: "+20% fit", kind: "cv" }],
};

describe("POST /api/intel/analyze", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("degrades to the heuristic source when there are no roles to analyse", async () => {
    const res = await POST(req({ roles: [] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe("heuristic");
    expect(json.roles).toEqual([]);
    expect(json.priorityMoves).toEqual([]);
  });

  it("tags a real model answer at the root as source:ai", async () => {
    mockOpenAI(AI_RESULT);
    const res = await POST(req({ roles: [ROLE], direction: "Backend engineering", cvSummary: "Java, some Go" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe("ai");
    expect(json.roles[0].company).toBe("Monzo");
    expect(json.priorityMoves).toHaveLength(1);
  });

  it("unwraps a payload the model nested under `data` (aiShape)", async () => {
    mockOpenAI({ data: AI_RESULT });
    const res = await POST(req({ roles: [ROLE] }));
    const json = await res.json();
    expect(json.source).toBe("ai");
    expect(json.priorityMoves[0].kind).toBe("cv");
  });

  it("degrades to the heuristic source rather than 500-ing when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ roles: [ROLE] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe("heuristic");
    expect(json.roles).toEqual([]);
  });

  it("degrades when the model answers with no priority moves (schema requires at least one)", async () => {
    mockOpenAI({ roles: [], priorityMoves: [] });
    const res = await POST(req({ roles: [ROLE] }));
    const json = await res.json();
    expect(json.source).toBe("heuristic");
  });
});
