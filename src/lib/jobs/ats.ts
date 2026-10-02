/**
 * Employer job-board sources: Greenhouse, Lever and Ashby.
 *
 * Each exposes a public, keyless JSON feed of an employer's live postings. One
 * fetcher per ATS maps it into `JobListing`, keeping only early-career roles
 * (internships, graduate schemes, placements). The feeds carry no per-student
 * data, and we store only what the public board already shows.
 *
 * A fetcher THROWS when the board could not be read and returns [] when it was
 * read and held nothing relevant. The refresh job relies on that difference: it
 * closes roles that vanished from a board only if the board was actually read.
 */

import type { Employer } from "./employers";
import { safeHttpUrl, type JobListing } from "./types";

const FETCH_TIMEOUT_MS = 10_000;
const RETRY_BACKOFF_MS = 1_000;

/**
 * Early-career title rule: whole words only, case-insensitive. "internal" and
 * "International" do not contain the word "intern"; "Graduate-level" describes a
 * required degree, not a graduate role, so it is excluded; and seniority words
 * rule a title out ("Senior Placement Manager" is not a placement scheme).
 */
const EARLY_CAREER = new RegExp(
  "(^|[^a-z0-9])(" +
    [
      "interns?", "internships?", "graduates?(?![ -]level)", "placements?", "early[ -]careers?",
      "summer analysts?", "new[ -]grads?", "insight (?:weeks?|programmes?|programs?|days?)",
      "spring weeks?", "year in industry", "industrial year", "apprentice(?:ship)?s?", "trainees?",
    ].join("|") +
    ")($|[^a-z0-9])",
);
const INTERN = /(^|[^a-z0-9])(interns?|internships?)($|[^a-z0-9])/;
const SENIOR = /(^|[^a-z0-9])(senior|sr|staff|principal|director|vp|head of)($|[^a-z0-9])/;
/** Roles ABOUT graduates (hiring them, running the scheme) rather than FOR them. */
const NOT_A_PLACE = /(^|[^a-z0-9])(recruiter|recruiting|coordinator|manager|partnerships|sourcer|talent)($|[^a-z0-9])/;

/**
 * A title that leads with "Graduate" (optionally "Graduate Scheme"/"Programme") is a graduate role even when
 * the job itself is a manager one ("Graduate Product Manager"). It does not rescue the scheme's own
 * staff: "Graduate Programme Manager" leaves "Manager" bare after the scheme words.
 */
const LEADING_GRADUATE = /^graduates?(?:\s+(?:scheme|programme|program))?\s*[:,|–—-]?\s*(.*)$/;
const BARE_ADMIN_ROLE = /^(recruiter|recruiting|coordinator|manager|partnerships|sourcer|talent)($|[^a-z0-9])/;

function leadsWithGraduateRole(t: string): boolean {
  const rest = LEADING_GRADUATE.exec(t)?.[1];
  return !!rest && !BARE_ADMIN_ROLE.test(rest);
}

export function isEarlyCareerTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (!EARLY_CAREER.test(t) || SENIOR.test(t)) return false;
  // An explicit intern or leading-Graduate role stays even if the team is "Talent" ("Product Manager Intern").
  return INTERN.test(t) || leadsWithGraduateRole(t) || !NOT_A_PLACE.test(t);
}

/** GET JSON with a timeout and one retry on network errors, 429 and 5xx. Throws otherwise. */
async function getJson(url: string): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
      if (res.ok) return await res.json();
      lastErr = new Error(`HTTP ${res.status}`);
      if (res.status !== 429 && res.status < 500) break; // 404 and the like will not improve
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function listing(
  e: Employer,
  r: { id: unknown; title: unknown; url: unknown; location: string; workMode?: string; postedAt?: string | null },
): JobListing | null {
  const title = typeof r.title === "string" ? r.title.trim() : "";
  const url = safeHttpUrl(r.url);
  if (!title || !url || !isEarlyCareerTitle(title)) return null;
  const postedAt = r.postedAt && !Number.isNaN(Date.parse(r.postedAt)) ? new Date(r.postedAt).toISOString() : null;
  return {
    id: `${e.ats}:${e.slug}:${String(r.id ?? url)}`,
    title,
    company: e.name,
    location: r.location.trim() || "Location not stated",
    workMode: r.workMode?.trim() || "Not stated",
    source: `${e.name} careers`,
    description: "",
    url,
    matchScore: null,
    atsKeywords: [],
    postedAt,
  };
}

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function fetchGreenhouse(e: Employer): Promise<JobListing[]> {
  const data = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${e.slug}/jobs`)) as Rec;
  if (!Array.isArray(data?.jobs)) throw new Error("unexpected Greenhouse payload");
  return asArray(data.jobs)
    .map((j: unknown) => {
      const r = j as Rec;
      return listing(e, {
        id: r.id,
        title: r.title,
        url: r.absolute_url,
        location: str((r.location as Rec | undefined)?.name),
        postedAt: str(r.first_published) || str(r.updated_at),
      });
    })
    .filter((j): j is JobListing => j !== null);
}

export async function fetchLever(e: Employer): Promise<JobListing[]> {
  const data = await getJson(`https://api.lever.co/v0/postings/${e.slug}?mode=json`);
  if (!Array.isArray(data)) throw new Error("unexpected Lever payload");
  return data
    .map((j: unknown) => {
      const r = j as Rec;
      const cat = (r.categories ?? {}) as Rec;
      const places = [str(cat.location), ...asArray(cat.allLocations).map(str)].filter(Boolean);
      return listing(e, {
        id: r.id,
        title: r.text,
        url: r.hostedUrl,
        location: [...new Set(places)].join(" · "),
        workMode: str(r.workplaceType),
        postedAt: typeof r.createdAt === "number" ? new Date(r.createdAt).toISOString() : null,
      });
    })
    .filter((j): j is JobListing => j !== null);
}

export async function fetchAshby(e: Employer): Promise<JobListing[]> {
  const data = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${e.slug}`)) as Rec;
  if (!Array.isArray(data?.jobs)) throw new Error("unexpected Ashby payload");
  return asArray(data.jobs)
    .filter((j) => (j as Rec).isListed !== false)
    .map((j: unknown) => {
      const r = j as Rec;
      const places = [str(r.location), ...asArray(r.secondaryLocations).map((s) => str((s as Rec)?.location))].filter(Boolean);
      return listing(e, {
        id: r.id,
        title: r.title,
        url: r.jobUrl,
        location: [...new Set(places)].join(" · "),
        workMode: str(r.workplaceType),
        postedAt: str(r.publishedAt),
      });
    })
    .filter((j): j is JobListing => j !== null);
}

const FETCHERS = { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby };

/** Early-career roles on one employer's board. Throws if the board could not be read. */
export function fetchEmployerListings(e: Employer): Promise<JobListing[]> {
  return FETCHERS[e.ats](e);
}
