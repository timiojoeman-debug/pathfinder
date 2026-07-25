// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

/** Body field names are not guessable: this route wants `skillGaps`, not
 *  `missingSkills` (CLAUDE.md trap). A real generation passes through; an empty
 *  payload 500s. */

function req(body: unknown): Request {
  return new Request("http://test/api/project-builder/generate", {
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

const PROJECT_ENVELOPE = {
  methodologyReference: "TechTalk Project Builder - 7 Qualities",
  data: {
    projects: [{ title: "Rate-limited URL shortener in Go", closesGap: "Go", qualities: ["Deployed", "Tested"] }],
  },
};

describe("POST /api/project-builder/generate", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns project ideas keyed off the given skill gaps", async () => {
    mockOpenAI(PROJECT_ENVELOPE);
    const res = await POST(req({ skillGaps: ["Go"], existingSkills: ["JavaScript"], targetRole: "Backend Intern" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.projects[0].closesGap).toBe("Go");
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ skillGaps: ["Go"] }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });

  it("500s when the model is unreachable", async () => {
    mockOpenAI(null, 500);
    const res = await POST(req({ skillGaps: ["Go"] }));
    expect(res.status).toBe(500);
  });
});
