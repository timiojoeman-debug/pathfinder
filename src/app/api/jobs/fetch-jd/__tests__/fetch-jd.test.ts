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

/** Queue of responses returned in order — one per fetch hop, to drive redirects. */
function mockFetchSequence(responses: Response[]) {
  let i = 0;
  const fn = vi.fn(async () => responses[Math.min(i++, responses.length - 1)]);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const redirectTo = (location: string) => new Response(null, { status: 302, headers: { Location: location } });
const htmlOk = (body: string) => new Response(body, { status: 200, headers: { "Content-Type": "text/html" } });
const LONG_POSTING = `<html><body><h1>Software Engineer Intern</h1><p>${"We build payments infrastructure. ".repeat(15)}</p></body></html>`;

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

  it("rejects private / link-local / IPv6 / mapped hosts and embedded credentials", async () => {
    // If the guard ever lets one through, this makes it a fast 502 assertion
    // failure rather than an 8s network hang.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("guard leaked — fetch should not run"); }));
    for (const url of [
      "http://169.254.169.254/latest/meta-data", // cloud metadata (link-local)
      "http://10.0.0.5/internal",
      "http://192.168.1.1/router",
      "http://[::1]/internal", // IPv6 loopback
      "http://[fd00::1]/internal", // IPv6 unique-local
      "http://[::ffff:169.254.169.254]/meta", // IPv4-mapped metadata
      "http://admin.local/panel",
      "http://user:pass@example.com/job", // embedded credentials
    ]) {
      expect((await POST(req({ url }))).status).toBe(400);
    }
  });

  it("blocks a public URL that redirects into a private host (redirect re-validation)", async () => {
    // The core hardening: the initial host is public, but the 302 target is the
    // metadata endpoint. Each hop must be re-checked, not just the first.
    const fn = mockFetchSequence([redirectTo("http://169.254.169.254/latest/meta-data"), htmlOk(LONG_POSTING)]);
    expect((await POST(req({ url: "https://jobs.example.com/redir" }))).status).toBe(400);
    // It must NOT have fetched the metadata endpoint.
    expect(fn).toHaveBeenCalledTimes(1);
    const firstCall = fn.mock.calls[0] as unknown[] | undefined;
    expect(String(firstCall?.[0])).not.toContain("169.254.169.254");
  });

  it("follows a redirect to another public host", async () => {
    mockFetchSequence([redirectTo("https://boards.example.org/canonical"), htmlOk(LONG_POSTING)]);
    const res = await POST(req({ url: "https://jobs.example.com/old" }));
    expect(res.status).toBe(200);
    expect((await res.json()).text).toContain("Software Engineer Intern");
  });

  it("gives up after too many redirects rather than looping", async () => {
    // Always redirect (to a public host) — the hop cap must stop it.
    mockFetchSequence([redirectTo("https://a.example.org/next")]);
    expect((await POST(req({ url: "https://jobs.example.com/loop" }))).status).toBe(400);
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
