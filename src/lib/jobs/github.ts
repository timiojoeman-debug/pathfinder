/**
 * GitHub internship-list source.
 *
 * Community-maintained repos (the Pitt CSC / Simplify bot format) publish a
 * structured `listings.json` — real, current internship postings, free, no API
 * key. We fetch that JSON, keep only active/visible entries, and normalize to
 * `JobListing`. These lists carry no job description, so `matchScore` is always
 * null (the UI then asks the student to paste the JD to score it) — we never
 * invent a fit number.
 *
 * A short in-memory TTL cache avoids re-fetching within a warm serverless
 * instance; the raw files sit behind GitHub's CDN, so cold fetches are cheap.
 * Sources are US/remote-heavy — Adzuna remains the UK-native complement — and
 * the list is config so EU-focused, current-season repos can be added after a
 * one-line check of their schema.
 */

import { computeMatchScore, type JobListing } from "./types";
import { logger } from "@/lib/logger";

interface GithubSource {
  label: string;
  url: string;
}

/** Verified Pitt-CSC-format sources (raw `listings.json`). Add more here. */
export const GITHUB_SOURCES: GithubSource[] = [
  {
    label: "vanshb03/Summer2027",
    url: "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/main/.github/scripts/listings.json",
  },
  {
    label: "SimplifyJobs",
    url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json",
  },
];

interface RawGithubListing {
  company_name?: string;
  title?: string;
  url?: string;
  locations?: string[];
  active?: boolean;
  is_visible?: boolean;
  source?: string;
  id?: string | number;
  date_posted?: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 8000;
const cache = new Map<string, { at: number; listings: JobListing[] }>();

/** Test seam: clear the module cache between cases. */
export function _resetGithubCache(): void {
  cache.clear();
}

function mapRawListing(r: RawGithubListing, label: string): JobListing | null {
  // Community bots flip `active`/`is_visible` to false when a role closes —
  // skip those so a stale repo yields nothing rather than dead links.
  if (r.active === false || r.is_visible === false) return null;
  const title = r.title?.trim();
  const company = r.company_name?.trim();
  const url = r.url?.trim();
  if (!title || !company || !url) return null;

  const location = Array.isArray(r.locations) && r.locations.length
    ? r.locations.join(" · ")
    : "Location not stated";

  // No description in these lists → nothing to score → null, never a guess.
  const { score, keywords } = computeMatchScore("", "");

  return {
    id: String(r.id ?? url),
    title,
    company,
    location,
    workMode: "Not stated",
    source: `via ${r.source?.trim() || label}`,
    description: "",
    url,
    matchScore: score,
    atsKeywords: keywords,
  };
}

async function fetchSource(src: GithubSource): Promise<JobListing[]> {
  const cached = cache.get(src.url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.listings;

  try {
    const res = await fetch(src.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) {
      logger.error("jobs/github — fetch failed", { url: src.url, status: res.status });
      return cached?.listings ?? [];
    }
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return cached?.listings ?? [];
    const listings = (data as RawGithubListing[])
      .map((r) => mapRawListing(r, src.label))
      .filter((j): j is JobListing => j !== null);
    cache.set(src.url, { at: Date.now(), listings });
    return listings;
  } catch (err) {
    // A source outage returns cached-or-nothing, never something invented.
    logger.error("jobs/github — unreachable", {
      url: src.url,
      error: err instanceof Error ? err.message : String(err),
    });
    return cached?.listings ?? [];
  }
}

/** All active listings across the configured GitHub sources (best-effort). */
export async function fetchGithubListings(): Promise<JobListing[]> {
  const perSource = await Promise.all(GITHUB_SOURCES.map((s) => fetchSource(s)));
  return perSource.flat();
}
