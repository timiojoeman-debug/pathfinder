/**
 * Shared job-listing types and pure helpers for the Opportunity Discovery phase.
 *
 * A `JobListing` is the normalized shape every source (Adzuna, GitHub internship
 * repos, …) maps into, so the search route can merge them without caring where
 * each came from. Everything here is deterministic and side-effect free.
 */

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  /** Human-readable provenance, e.g. "Adzuna" or "via vanshb03". Shown to the user. */
  source: string;
  description: string;
  url: string;
  /** null when the listing gave us nothing to score against — never a guess. */
  matchScore: number | null;
  atsKeywords: string[];
}

export const KEYWORD_CANDIDATES = [
  "react", "node", "typescript", "python", "java", "sql", "aws", "gcp",
  "docker", "kubernetes", "api", "microservices", "tailwind", "postgresql",
];

/**
 * Deterministic overlap between the CV and the job description. Only keywords
 * the job actually asks for are counted, so the score reads as "how much of what
 * they want can you evidence" rather than "how many buzzwords do you own".
 *
 * When the listing carries no description (many curated lists give only
 * company/role/link), there is nothing to score — return null, never a guess.
 */
export function computeMatchScore(cv: string, jobDescription: string): { score: number | null; keywords: string[] } {
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

  const score = keywords.length ? Math.round((hits / keywords.length) * 100) : null;
  return { score, keywords: keywords.slice(0, 5) };
}

/** Drop duplicate listings that appear in more than one source. */
export function dedupeListings(listings: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  const out: JobListing[] = [];
  for (const j of listings) {
    const key = `${j.company.toLowerCase()}|${j.title.toLowerCase()}|${j.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

/**
 * Client-side narrowing for sources that aren't pre-filtered by an API (e.g. the
 * GitHub lists). A role token matches if it appears in the title; a location
 * matches as a substring. Empty filters pass everything.
 */
export function filterListings(
  listings: JobListing[],
  opts: { roleType?: string; location?: string },
): JobListing[] {
  const roleTokens = (opts.roleType ?? "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 2 && t !== "intern" && t !== "internship");
  const loc = (opts.location ?? "").trim().toLowerCase();

  return listings.filter((j) => {
    const title = j.title.toLowerCase();
    const roleOk = roleTokens.length === 0 || roleTokens.some((t) => title.includes(t));
    const locOk = !loc || j.location.toLowerCase().includes(loc);
    return roleOk && locOk;
  });
}

/** Highest known fit first; unscored listings sink below scored ones. */
export function sortByFit(listings: JobListing[]): JobListing[] {
  return [...listings].sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
}
