import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, zShort, zText } from "@/lib/api";
import { logger } from "@/lib/logger";

/**
 * Job search.
 *
 * This route used to return three hardcoded listings — invented companies
 * ("NovaTech Labs", "ScaleUp Systems", "CloudFleet") attributed to Adzuna,
 * JSearch and Greenhouse, with apply links pointing at example.com. A student
 * could tailor a CV to a company that does not exist and click through to a
 * placeholder domain. A product that coaches people not to embellish their CV
 * cannot invent the jobs it sends them to.
 *
 * Now: real listings when Adzuna is configured, and an explicit empty result
 * when it is not. Every failure path returns nothing rather than something
 * made up.
 */

const SearchSchema = z.object({
  location: zShort().optional(),
  roleType: zShort().optional(),
  industry: zShort().optional(),
  workMode: zShort().optional(),
  companySize: zShort().optional(),
  cvSummary: zText().optional(),
});

type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  source: string;
  description: string;
  url: string;
  /** null when the listing gave us nothing to score against — never a guess. */
  matchScore: number | null;
  atsKeywords: string[];
};

/** Adzuna is country-scoped; the product targets UK/EU internship season. */
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || "gb";
const RESULTS_PER_PAGE = 20;
const ADZUNA_TIMEOUT_MS = 8000;

const NOT_CONFIGURED_MESSAGE =
  "Live job search isn't connected yet. Add roles manually below and PathFinder will score each one against your profile.";
const UNAVAILABLE_MESSAGE =
  "Live job search is temporarily unavailable. Add roles manually below and PathFinder will score them.";

function adzunaCredentials(): { appId: string; appKey: string } | null {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  return appId && appKey ? { appId, appKey } : null;
}

const KEYWORD_CANDIDATES = [
  "react", "node", "typescript", "python", "java", "sql", "aws", "gcp",
  "docker", "kubernetes", "api", "microservices", "tailwind", "postgresql",
];

/**
 * Deterministic overlap between the CV and the job description. Only keywords
 * the job actually asks for are counted, so the score reads as "how much of
 * what they want can you evidence" rather than "how many buzzwords do you own".
 */
function computeMatchScore(cv: string, jobDescription: string): { score: number | null; keywords: string[] } {
  const normalizedCv = cv.toLowerCase();
  const normalizedDesc = jobDescription.toLowerCase();

  const keywords: string[] = [];
  let hits = 0;
  for (const kw of KEYWORD_CANDIDATES) {
    if (normalizedDesc.includes(kw)) {
      keywords.push(kw);
      if (normalizedCv.includes(kw)) hits += 1;
    }
  }

  // Adzuna returns a ~500-character *snippet*, not the full ad, and it is
  // usually company blurb — so most listings mention none of these keywords.
  // That is not a 50% match, it is no evidence at all, and saying "50" put a
  // confident number on nothing (every real job then rendered as "Long shot").
  // Return null and let the UI say the fit is unknown.
  const score = keywords.length ? Math.round((hits / keywords.length) * 100) : null;
  return { score, keywords: keywords.slice(0, 5) };
}

type AdzunaResult = {
  id?: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  contract_time?: string;
};

function mapAdzunaResult(r: AdzunaResult, cvSummary: string): JobListing | null {
  const title = r.title?.trim();
  const url = r.redirect_url?.trim();
  // Without a title or a real apply link there is nothing worth showing.
  if (!title || !url) return null;

  const description = r.description?.trim() ?? "";
  const { score, keywords } = computeMatchScore(cvSummary, description);

  return {
    id: String(r.id ?? url),
    title,
    company: r.company?.display_name?.trim() || "Company not disclosed",
    location: r.location?.display_name?.trim() || "Location not stated",
    workMode: r.contract_time === "part_time" ? "Part-time" : "Not stated",
    source: "Adzuna",
    description,
    url,
    matchScore: score,
    atsKeywords: keywords,
  };
}

async function searchAdzuna(
  creds: { appId: string; appKey: string },
  what: string,
  where: string | undefined,
  cvSummary: string,
): Promise<JobListing[]> {
  const params = new URLSearchParams({
    app_id: creds.appId,
    app_key: creds.appKey,
    results_per_page: String(RESULTS_PER_PAGE),
    "content-type": "application/json",
  });
  if (what) params.set("what", what);
  if (where) params.set("where", where);

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1?${params.toString()}`,
    { cache: "no-store", signal: AbortSignal.timeout(ADZUNA_TIMEOUT_MS) },
  );

  if (!res.ok) {
    logger.error("jobs/search — Adzuna request failed", { status: res.status });
    return [];
  }

  const data: unknown = await res.json();
  const results = (data as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];

  return results
    .map((r) => mapAdzunaResult(r as AdzunaResult, cvSummary))
    .filter((j): j is JobListing => j !== null)
    .sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
}

export async function POST(req: Request) {
  const parsed = await readBody(req, SearchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const creds = adzunaCredentials();
  if (!creds) {
    return NextResponse.json({ jobs: [], configured: false, message: NOT_CONFIGURED_MESSAGE });
  }

  const what = [body.roleType, body.industry].filter(Boolean).join(" ").trim() || "intern";

  try {
    const jobs = await searchAdzuna(creds, what, body.location, body.cvSummary ?? "");
    return NextResponse.json({ jobs, configured: true });
  } catch (err) {
    // A provider outage returns nothing, never something invented.
    logger.error("jobs/search — Adzuna unreachable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ jobs: [], configured: true, message: UNAVAILABLE_MESSAGE });
  }
}
