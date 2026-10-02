// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));
// mammoth is used for the .docx branch; return enough text to clear the 50-char floor.
vi.mock("mammoth", () => ({
  default: { extractRawText: vi.fn(async () => ({ value: "Extracted DOCX CV text ".repeat(4) })) },
}));

import { POST } from "../route";

function form(fields: Record<string, string>, file?: File): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append("file", file);
  return new Request("http://test/api/cv/analyze", { method: "POST", body: fd });
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

const CV_TEXT = "Experienced backend engineer with five years building Go and Postgres services in fintech.";
// The envelope buildCVAnalysisPrompt asks for: feedback at the root, the parsed CV under `data`.
const ANALYSIS = {
  inputQuality: "decent_attempt",
  feedback: [{ issue: "Bullets lack numbers", severity: "important", suggestedFix: "Quantify the Go service work" }],
  strengths: ["Clear backend focus"],
  nextSteps: ["Add one measurable outcome per role"],
  data: {
    education: [{ institution: "Edinburgh", degree: "BSc CS", period: "2023-2026" }],
    experience: [],
    projects: [],
    skills: ["Go", "Postgres"],
  },
};

describe("POST /api/cv/analyze", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("400s when neither a file nor text is provided", async () => {
    const res = await POST(form({}));
    expect(res.status).toBe(400);
  });

  it("422s when the extracted text is too short to analyse", async () => {
    const res = await POST(form({ text: "too short" }));
    expect(res.status).toBe(422);
    expect((await res.json()).extractionFailed).toBe(true);
  });

  it("413s when the uploaded file exceeds the size cap", async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" });
    const res = await POST(form({}, big));
    expect(res.status).toBe(413);
  });

  it("analyses pasted CV text on success", async () => {
    mockOpenAI(ANALYSIS);
    const res = await POST(form({ text: CV_TEXT }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fileName).toBe("pasted-cv.txt");
    expect(json.data.skills).toContain("Go");
    expect(json.feedback[0].issue).toContain("numbers");
    expect(json.rawText).toContain("backend engineer");
    expect(json.aiUnavailable).toBeUndefined();
  });

  it("reads text from an uploaded .txt file", async () => {
    mockOpenAI(ANALYSIS);
    const file = new File([CV_TEXT], "resume.txt", { type: "text/plain" });
    const res = await POST(form({}, file));
    expect(res.status).toBe(200);
    expect((await res.json()).fileName).toBe("resume.txt");
  });

  it("extracts a .docx via mammoth", async () => {
    mockOpenAI(ANALYSIS);
    const file = new File(["binary-docx-bytes"], "resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const res = await POST(form({}, file));
    expect(res.status).toBe(200);
    expect((await res.json()).fileName).toBe("resume.docx");
  });

  it("flags the AI read as unavailable on failure, never a canned read", async () => {
    mockOpenAI(null, 500);
    const res = await POST(form({ text: CV_TEXT }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.aiUnavailable).toBe(true);
    expect(typeof json.aiMessage).toBe("string");
    // The extracted text survives, so an upload is not lost with the AI read.
    expect(json.rawText).toContain("backend engineer");
    expect(json.data).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain("Your University");
  });

  it("flags an empty read as unavailable rather than showing nothing as a result", async () => {
    mockOpenAI({ feedback: [], strengths: [], nextSteps: [], data: { skills: [] } });
    const json = await (await POST(form({ text: CV_TEXT }))).json();
    expect(json.aiUnavailable).toBe(true);
  });

  it("says when no API key is configured instead of hiding the misconfig", async () => {
    delete process.env.OPENAI_API_KEY;
    const json = await (await POST(form({ text: CV_TEXT }))).json();
    expect(json.aiUnavailable).toBe(true);
    expect(json.aiMessage).toMatch(/isn't set up/);
  });
});
