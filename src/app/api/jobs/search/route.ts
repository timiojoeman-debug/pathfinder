import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, zShort, zText } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  computeMatchScore,
  dedupeListings,
  dropStale,
  expandRoleQuery,
  filterListings,
  isUkLocation,
  safeHttpUrl,
  sortByFit,
  type JobListing,
} from "@/lib/jobs/types";
import { fetchGithubListings } from "@/lib/jobs/github";
import { getActiveListings } from "@/lib/db/job-listings";

/**
 * Job search.
 *
 * This route used to return three hardcoded listings — invented companies with
 * apply links pointing at example.com. A product that coaches people not to
 * embellish their CV cannot invent the jobs it sends them to. Now every listing
 * is real, from one of three sources:
 *   - the employer-feed cache (job_listings, refreshed daily from employers' own
 *     ATS boards) — read first; empty or unreachable just means fewer results
 *   - GitHub internship lists (always on, free, curated) — see lib/jobs/github
 *   - Adzuna (UK-native) — only when API credentials are configured
 * Merged, deduped and filtered; every failure path returns fewer real jobs,
 * never fabricated ones.
 */

/**
 * `companySize` used to be accepted here and silently ignored — no source
 * exposes company-size data — so it is gone rather than validated-and-dropped,
 * because a field the schema accepts reads as a field the search honours.
 */
const SearchSchema = z.object({
  location: zShort().optional(),
  roleType: zShort().optional(),
  industry: zShort().optional(),
  workMode: zShort().optional(),
  cvSummary: zText().optional(),
  /** Keep only UK and remote-UK roles from the employer cache and GitHub lists. Adzuna is already the UK board. */
  ukOnly: z.boolean().optional(),
});

/**
 * Work mode is a keyword narrowing, not a hard filter. Adzuna full-text
 * searches the advert, so adding "remote" biases results. On-site is absent:
 * few adverts say "on-site", so searching it would exclude the roles it means.
 */
const WORK_MODE_TERMS: Record<string, string> = {
  remote: "remote",
  hybrid: "hybrid",
};

const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || "gb";
const RESULTS_PER_PAGE = 20;
const ADZUNA_TIMEOUT_MS = 8000;
const MAX_RESULTS = 40;

const UNAVAILABLE_MESSAGE =
  "Live job search is temporarily unavailable. Add roles manually below and PathFinder will score them.";
const NO_MATCHES_MESSAGE =
  "No live matches right now — broaden the search, or paste a role below to score it against your CV.";

function adzunaCredentials(): { appId: string; appKey: string } | null {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  return appId && appKey ? { appId, appKey } : null;
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
  const url = safeHttpUrl(r.redirect_url);
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
    .filter((j): j is JobListing => j !== null);
}

/** One from each source in turn, so a source with many results cannot crowd out the others. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]);
  }
  return out;
}

export async function POST(req: Request) {
  const parsed = await readBody(req, SearchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const cvSummary = body.cvSummary ?? "";
  const creds = adzunaCredentials();
  const workModeTerm = body.workMode ? WORK_MODE_TERMS[body.workMode.trim().toLowerCase()] : undefined;
  const what = [body.roleType && expandRoleQuery(body.roleType), body.industry, workModeTerm].filter(Boolean).join(" ").trim() || "intern";

  // Employer-feed cache and GitHub lists, fetched together. Both are filtered locally by
  // every filter the student set, so the UI's "filters apply" holds for each. An empty or
  // unreachable cache must never fail the search.
  const ukFilter = (rows: JobListing[]) => (body.ukOnly ? rows.filter((j) => isUkLocation(j.location)) : rows);
  const filters = {
    roleType: body.roleType,
    location: body.location,
    industry: body.industry,
    workMode: workModeTerm,
  };
  const [employers, github] = await Promise.all([
    getActiveListings({ location: body.location, ukOnly: body.ukOnly })
      .then((rows) => ukFilter(filterListings(rows, filters)))
      .catch((err: unknown) => {
        logger.error("jobs/search — job cache unreachable", {
          error: err instanceof Error ? err.message : String(err),
        });
        return [] as JobListing[];
      }),
    fetchGithubListings().then((rows) => ukFilter(filterListings(rows, filters))),
  ]);

  // Adzuna is pre-filtered by its own query, so it isn't re-filtered locally.
  let adzuna: JobListing[] = [];
  let adzunaError = false;
  if (creds) {
    try {
      adzuna = await searchAdzuna(creds, what, body.location, cvSummary);
    } catch (err) {
      adzunaError = true;
      logger.error("jobs/search — Adzuna unreachable", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const jobs = sortByFit(dropStale(dedupeListings(interleave([employers, adzuna, github])))).slice(0, MAX_RESULTS);

  const message = jobs.length ? undefined : adzunaError ? UNAVAILABLE_MESSAGE : NO_MATCHES_MESSAGE;

  return NextResponse.json({
    jobs,
    configured: true,
    sources: { employers: employers.length, github: github.length, adzuna: creds ? adzuna.length : null },
    message,
  });
}
