// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "../route";

/**
 * Fetch-JD pulls the real posting text so students can paste a link. These pin
 * the SSRF guards, the HTML→text extraction, and the honest fallbacks.
 */

function req(body: unknown): Request {
  return new Request("http://test/api/jobs/fetch-jd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockFetch(body: string, opts: { status?: number; contentType?: string } = {}) {
  const { status = 200, contentType = "text/html" } = opts;
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "Content-Type": contentType } })));
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/jobs/fetch-jd", () => {
  it("rejects an invalid URL", async () => {
    expect((await POST(req({ url: "not a url" }))).status).toBe(400);
  });

  it("rejects a non-http scheme", async () => {
    expect((await POST(req({ url: "ftp://example.com/job" }))).status).toBe(400);
  });

  it("rejects a loopback host (SSRF guard)", async () => {
    expect((await POST(req({ url: "http://localhost:3000/admin" }))).status).toBe(400);
    expect((await POST(req({ url: "http://127.0.0.1/internal" }))).status).toBe(400);
  });

  it("extracts readable text from an HTML posting and drops scripts", async () => {
    mockFetch(`<html><body><h1>Software Engineer Intern</h1><p>${"We build payments infrastructure. ".repeat(15)}</p><script>var secret=1</script></body></html>`);
    const res = await POST(req({ url: "https://jobs.example.com/swe-intern" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toContain("Software Engineer Intern");
    expect(json.text).not.toContain("secret");
  });

  it("refuses non-HTML content rather than dumping it", async () => {
    mockFetch("{}", { contentType: "application/json" });
    expect((await POST(req({ url: "https://api.example.com/job.json" }))).status).toBe(415);
  });

  it("errors when too little text is extracted (JS-rendered page)", async () => {
    mockFetch("<html><body>hi</body></html>");
    expect((await POST(req({ url: "https://jobs.example.com/thin" }))).status).toBe(422);
  });
});
