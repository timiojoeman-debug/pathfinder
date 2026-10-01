// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/pilot-interest", () => ({ recordPilotInterest: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ hitDaily: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { POST } from "../route";
import { recordPilotInterest } from "@/lib/db/pilot-interest";
import { hitDaily } from "@/lib/rate-limit";

const VALID = {
  institution: "University of Edinburgh",
  contactName: "A Careers Manager",
  email: "careers@ed.ac.uk",
};

function post(body: unknown, raw?: string): Request {
  return new Request("http://test/api/pilot-interest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

describe("/api/pilot-interest", () => {
  beforeEach(() => {
    vi.mocked(recordPilotInterest).mockReset().mockResolvedValue(true);
    vi.mocked(hitDaily).mockReset().mockResolvedValue({ ok: true, limit: 5, remaining: 4, retryAfter: 0, shared: true });
  });

  it("records a valid enquiry", async () => {
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(recordPilotInterest).toHaveBeenCalledWith(
      expect.objectContaining({ institution: VALID.institution, contact_name: VALID.contactName, email: VALID.email }),
    );
  });

  it("400s on a malformed body", async () => {
    const res = await POST(post(null, "not json"));
    expect(res.status).toBe(400);
    expect(recordPilotInterest).not.toHaveBeenCalled();
  });

  it("400s when required fields are missing", async () => {
    const res = await POST(post({ institution: "Somewhere" }));
    expect(res.status).toBe(400);
    expect(recordPilotInterest).not.toHaveBeenCalled();
  });

  it("400s on an invalid email rather than storing it", async () => {
    const res = await POST(post({ ...VALID, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(recordPilotInterest).not.toHaveBeenCalled();
  });

  /* The behaviour the page exists to guarantee: a failed write is never
     reported as a success. Five CTAs here once looked like they worked and
     went nowhere, and a cheerful 200 over a dropped row rebuilds that. */
  it("500s when the row could not be stored, and never claims success", async () => {
    vi.mocked(recordPilotInterest).mockResolvedValue(false);
    const res = await POST(post(VALID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBeUndefined();
    expect(json.error).toBeTruthy();
  });

  it("429s past the per-IP daily cap without touching the database", async () => {
    vi.mocked(hitDaily).mockResolvedValue({ ok: false, limit: 5, remaining: 0, retryAfter: 3600, shared: true });
    const res = await POST(post(VALID));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(recordPilotInterest).not.toHaveBeenCalled();
  });

  it("passes the optional fields through when given", async () => {
    await POST(post({ ...VALID, role: "Head of Careers", cohortSize: "~400 finalists", note: "Term 2" }));
    expect(recordPilotInterest).toHaveBeenCalledWith(
      expect.objectContaining({ role: "Head of Careers", cohort_size: "~400 finalists", note: "Term 2" }),
    );
  });
});
