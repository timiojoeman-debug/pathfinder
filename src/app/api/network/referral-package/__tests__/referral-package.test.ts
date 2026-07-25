// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { POST } from "../route";

function req(body: unknown): Request {
  return new Request("http://test/api/network/referral-package", {
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

const REFERRAL_ENVELOPE = {
  methodologyReference: "TechTalk Referral Playbook",
  data: {
    referralMessage: "Hi Dana, would you be open to referring me for the backend internship?",
    bulletPoints: ["Shipped a Go service", "Edinburgh CS"],
  },
};

describe("POST /api/network/referral-package", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects a request missing the contact name or role", async () => {
    const res = await POST(req({ contactName: "Dana" }));
    expect(res.status).toBe(400);
  });

  it("returns the referral envelope on success", async () => {
    mockOpenAI(REFERRAL_ENVELOPE);
    const res = await POST(req({ contactName: "Dana", roleName: "Backend Intern", cvStrengths: ["Go"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.referralMessage).toContain("Dana");
  });

  it("500s when the model returns an empty payload", async () => {
    mockOpenAI({ data: {} });
    const res = await POST(req({ contactName: "Dana", roleName: "Backend Intern" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
