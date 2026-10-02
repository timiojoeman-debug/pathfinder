/**
 * Recruiter-side material from two TechTalk decks: "What Recruiters Are Really
 * Looking For" (slides 007-010, 015-018, 020-021) and "How to Build a Portfolio
 * That Gets You Hired" (slides 008, 012-016).
 *
 * These are one recruiter's and one designer's rules of thumb, not market data.
 * Nothing here is a statistic; the thresholds are the speakers' heuristics and
 * the UI labels them as TechTalk guidance.
 */
import { findGenericPhrases } from "@/lib/ai/naturalness-check";

export const RECRUITER_DECK_SOURCE = "deck-recruiters-looking-for";
export const PORTFOLIO_DECK_SOURCE = "deck-portfolio";

/** Recruiter deck 007-010. */
export const JD_DECODER = {
  tiers: [
    { id: "must-have", label: "Must-have", detail: "Skills you genuinely need to deliver the result the business is paying for. Non-negotiable." },
    { id: "teachable", label: "Teachable", detail: "Things they will compromise on or teach you once you are in, such as their tool versus yours." },
    { id: "nice-to-have", label: "Nice-to-have", detail: "The extras. Have them and you stand out; without them there is no harm done." },
  ],
  mustHaveWords: ["required", "essential", "proven experience in", "X years of", "strong background in"],
  niceToHaveWords: ["preferred", "a plus", "bonus", "ideally", "familiarity with", "exposure to"],
  positionSignals: [
    "Must-haves sit near the top of the list.",
    "Must-haves get repeated, across the title, the summary and the requirements.",
  ],
  repeatRule: "If a skill shows up 3 times, treat it as a must-have.",
  applyRule: "Apply when you hit at least 70% of the must-haves, rather than counting every skill listed.",
  /** Static "decode the advert yourself" checklist for the jobs page. */
  checklist: [
    "Underline every skill that appears three or more times (title, summary, requirements). Treat those as must-haves.",
    "Mark skills that follow “required”, “essential”, “proven experience in”, “X years of” or “strong background in” as must-haves.",
    "Mark skills that follow “preferred”, “a plus”, “bonus”, “ideally”, “familiarity with” or “exposure to” as nice-to-haves.",
    "Anything left that they could plausibly teach you (their tool versus yours) is teachable.",
    "Count the must-haves you can evidence on your CV. At 70% or more, apply.",
  ],
} as const;

export interface MustHave {
  skill: string;
  met: boolean;
}

export interface MustHaveSummary {
  met: number;
  total: number;
  /** Whole-number percentage of must-haves met. */
  pct: number;
  /** True when the TechTalk 70% rule says to apply. */
  meetsRule: boolean;
}

/** Keep only well-formed rows; the model's list is untrusted. */
export function cleanMustHaves(v: unknown): MustHave[] {
  if (!Array.isArray(v)) return [];
  const rows: MustHave[] = [];
  for (const r of v) {
    if (!r || typeof r !== "object") continue;
    const { skill, met } = r as { skill?: unknown; met?: unknown };
    if (typeof skill === "string" && skill.trim()) rows.push({ skill: skill.trim(), met: met === true });
  }
  return rows;
}

/** "Must-haves met: x of y", derived here rather than trusted from the model. */
export function summariseMustHaves(rows: MustHave[]): MustHaveSummary | null {
  if (!rows.length) return null;
  const met = rows.filter((r) => r.met).length;
  const pct = Math.round((met / rows.length) * 100);
  return { met, total: rows.length, pct, meetsRule: pct >= 70 };
}

/** Recruiter deck 015-018. */
export const CAREER_GAP = {
  bands: [
    { range: "3 to 6 months", advice: "Usually not something a recruiter worries about." },
    { range: "6 months or more", advice: "Name it on your CV rather than leaving it blank." },
    { range: "1 to 2 years", advice: "The real question is how fresh your skills are and what you did to keep them sharp." },
  ],
  labels: ["Career Break", "Volunteering Break", "Maternity Leave", "Reskilling Break", "Upskilling Break"],
  interview: [
    "Do not shy away: be open about what you were learning or doing.",
    "Do not over-focus: a clear 1 to 2 minute answer is plenty.",
    "Use the power of 3: name three things you improved during the break that will help in the next role.",
  ],
} as const;

/** Portfolio deck 008: the order of a portfolio page. Testimonials are optional. */
export const PORTFOLIO_PAGE_ORDER = [
  "Hero: who you are and what you do, immediately",
  "Body of work",
  "About me",
  "Testimonials (optional)",
  "Contact",
] as const;

/**
 * Portfolio deck 015-016: the "passionate problem solver who loves
 * collaboration" About page. Deterministic, so a flag never depends on the
 * model noticing; reuses the buzzword list from the naturalness checker.
 */
const GENERIC_ABOUT: RegExp[] = [
  /passionate (?:problem[- ]solver|about)/gi,
  /problem[- ]solver who loves/gi,
  /loves? collaborati(?:on|ng)/gi,
  /team player/gi,
  /detail[- ]oriented/gi,
  /results[- ]driven/gi,
  /self[- ]motivated/gi,
  /always (?:learning|eager to learn)/gi,
];

export function findGenericAbout(text: string): string[] {
  const hits = new Set<string>();
  for (const re of GENERIC_ABOUT) for (const m of text.match(re) ?? []) hits.add(m.toLowerCase());
  for (const m of findGenericPhrases(text)) hits.add(m.toLowerCase());
  return [...hits];
}
