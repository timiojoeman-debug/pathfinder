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

/**
 * A posting link, only if it is http(s). Listing URLs come from community-edited
 * lists and third-party APIs and end up in an `<a href>`, so a `javascript:` or
 * `data:` URL must never get through. Returns the normalised URL or null.
 */
export function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
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
 * Common role abbreviations → the words that actually appear in job titles.
 * The GitHub lists title roles in full ("Software Engineer Intern"), but
 * students search in shorthand ("SWE"), which matched nothing. Each abbreviation
 * expands to the title words it implies; the raw token is kept too, in case a
 * posting spells the abbreviation out. Two-letter entries matter especially —
 * the tokenizer drops sub-3-char tokens as noise, so without expansion "ML" or
 * "PM" would vanish before matching.
 *
 * The first entry is the phrase a job board's full-text search should get
 * (`expandRoleQuery`); it is also a title token, which only ever adds matches.
 */
const ROLE_ABBREVIATIONS: Record<string, string[]> = {
  swe: ["software engineer", "software", "engineer"],
  sde: ["software engineer", "software", "engineer"],
  se: ["software engineer", "software", "engineer"],
  sre: ["site reliability engineer", "site", "reliability", "engineer"],
  ml: ["machine learning", "machine", "learning"],
  ai: ["ai", "artificial", "intelligence"],
  nlp: ["nlp", "natural", "language"],
  ds: ["data scientist", "data", "science", "scientist"],
  da: ["data analyst", "data", "analyst", "analytics"],
  de: ["data engineer", "data", "engineer"],
  pm: ["product manager", "product", "manager", "management"],
  po: ["product owner", "product", "owner"],
  qa: ["qa", "quality", "assurance", "test"],
  ux: ["ux", "designer", "design", "experience"],
  ui: ["ui", "designer", "design", "interface"],
  fe: ["frontend", "front-end"],
  be: ["backend", "back-end"],
  fs: ["full stack", "fullstack", "full-stack"],
  devops: ["devops", "platform", "infrastructure"],
};

/**
 * A role query rewritten for a job board's full-text search: shorthand becomes
 * the phrase adverts use ("SWE intern" → "software engineer intern"). Adzuna
 * matches every word in `what`, so sending "SWE" literally found almost nothing.
 */
export function expandRoleQuery(roleType: string): string {
  return (roleType ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ROLE_ABBREVIATIONS[w.toLowerCase()]?.[0] ?? w)
    .join(" ");
}

/** Lower-case words of a free-text filter worth matching. Sub-3-char words are
 *  dropped as noise ("of", "&"), unless they are all there is: "AI" on its own
 *  is the filter, not noise. */
function keywordTokens(text: string | undefined): string[] {
  const all = (text ?? "").toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean);
  const long = all.filter((t) => t.length > 2);
  return long.length ? long : all;
}

/** Whole-word match, so "ai" doesn't hit "Daily" and "bank" doesn't hit "Bankside". */
function hasWord(text: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`).test(text);
}

/** Split a role query into title-matchable tokens, expanding known abbreviations. */
function roleQueryTokens(roleType: string): string[] {
  const raw = (roleType ?? "").trim().toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
  const tokens = new Set<string>();
  for (const t of raw) {
    if (t === "intern" || t === "internship") continue;
    const expansion = ROLE_ABBREVIATIONS[t];
    if (expansion) {
      for (const word of expansion) tokens.add(word);
      tokens.add(t); // keep the shorthand in case a title spells it out
    } else if (t.length > 2) {
      tokens.add(t); // sub-3-char tokens that aren't known abbreviations are noise
    }
  }
  return [...tokens];
}

/**
 * Does a title match a query token? Short (<=2 char) tokens match whole-word
 * only: "pm" as a substring hits "develoPMent", which is never what the
 * searcher meant. Longer tokens match as a substring so "engineer" catches
 * "Software Engineering".
 */
function titleMatchesToken(title: string, token: string): boolean {
  if (token.length <= 2) return new RegExp(`\\b${token}\\b`).test(title);
  return title.includes(token);
}

/**
 * Client-side narrowing for sources that aren't pre-filtered by an API (e.g. the
 * GitHub lists). A role token matches if it appears in the title (abbreviations
 * expanded to their title words); a location matches as a substring. Empty
 * filters pass everything.
 *
 * Industry and work mode are keyword narrowing, the same as on Adzuna, but
 * these lists carry no advert text, so the word has to appear in the title,
 * company or location. That is a much smaller haystack, and the UI says so.
 */
export function filterListings(
  listings: JobListing[],
  opts: { roleType?: string; location?: string; industry?: string; workMode?: string },
): JobListing[] {
  const roleTokens = roleQueryTokens(opts.roleType ?? "");
  const loc = (opts.location ?? "").trim().toLowerCase();
  const industryTokens = keywordTokens(opts.industry);
  const modeTokens = keywordTokens(opts.workMode);

  return listings.filter((j) => {
    const title = j.title.toLowerCase();
    const text = `${title} ${j.company} ${j.location} ${j.workMode}`.toLowerCase();
    const roleOk = roleTokens.length === 0 || roleTokens.some((t) => titleMatchesToken(title, t));
    const locOk = !loc || j.location.toLowerCase().includes(loc);
    // Every word of a multi-word filter must appear: "health tech" means both, not either.
    const industryOk = industryTokens.every((t) => hasWord(text, t));
    const modeOk = modeTokens.every((t) => hasWord(text, t));
    return roleOk && locOk && industryOk && modeOk;
  });
}

/** Highest known fit first; unscored listings sink below scored ones. */
export function sortByFit(listings: JobListing[]): JobListing[] {
  return [...listings].sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
}
