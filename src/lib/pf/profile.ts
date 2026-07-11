/**
 * PathFinder — the Career Profile: one derived, normalized view of everything
 * the platform knows about the user. It is *computed*, never stored twice —
 * every field is a projection of core store state + the event log, so there is
 * a single source of truth and no drift between phases.
 *
 * Every page reads this. Every phase writes to the store/events that feed it.
 */

import { KEYWORD_VOCAB, OPPORTUNITY_MATRIX, type BoardColumn } from "./data";
import { analyzeCvText, directionStatement, targetKeywords, trackerDerived } from "./logic";
import type { PfEvent, PfPhase } from "./events";
import type { ChatMsg, InterviewFeedback, SavedJob } from "./store";
import type { OnbState } from "./logic";
import type { OutreachPersona } from "./data";

/** The persisted slice the profile is derived from (structural subset of PfState). */
export interface ProfileInput {
  onb: OnbState;
  onbDone: boolean;
  dirRole: string | null;
  dirStack: string[];
  dirIndustry: string | null;
  dirSize: string | null;
  dirSetting: string | null;
  dirGenerated: boolean;
  chat: ChatMsg[];
  cvText: string;
  cvAnalyzed: boolean;
  cvProjects: boolean;
  cvLinkedIn: boolean;
  cvScores: number[];
  savedJobs: SavedJob[];
  netPersona: OutreachPersona;
  netSent: number;
  netGenerated: boolean;
  ivSolved: Record<string, number>;
  ivFeedback: InterviewFeedback[];
  board: BoardColumn[];
  diags: Record<string, string>;
  events: PfEvent[];
}

export interface TargetCompany {
  company: string;
  role: string;
  fit: number;
  stage: string; // pipeline column title, or "Prospect"
}

export interface CareerProfile {
  /* Direction */
  targetRole: string | null;
  targetIndustry: string | null;
  companySize: string | null;
  workSetting: string | null;
  directionStatement: string | null;
  directionSet: boolean;

  /* Skills */
  currentSkills: string[];
  missingSkills: string[];
  targetKeywords: string[];

  /* CV */
  cvAnalyzed: boolean;
  cvHasContent: boolean;
  atsScore: number | null;
  atsHistory: number[];
  atsDelta: number | null; // latest − first
  projectsGenerated: boolean;

  /* Opportunities / applications */
  targetCompanies: TargetCompany[];
  applicationsSubmitted: number;
  interviewsLanded: number;
  offers: number;
  interviewRate: number; // 0–1

  /* Networking */
  outreachSent: number;
  contactedCompanies: string[];

  /* Interview */
  leetSolved: number;
  weakPatterns: string[];
  interviewsLogged: number;

  /* Narrative */
  strengths: string[];
  weaknesses: string[];
  currentPhase: PfPhase;

  /* Provenance */
  events: PfEvent[];
}

const LEET_PATTERNS: [string, number, number][] = [
  ["Two Pointers", 10, 9],
  ["Sliding Window", 10, 8],
  ["BFS / DFS", 10, 7],
  ["Dynamic Programming", 10, 4],
  ["Graphs", 15, 5],
];
const LEET_BASE = 19;

/** Skills *evidenced in the CV* — kept disjoint from missing/target skills so
 *  the profile never claims a skill is both present and absent. */
function detectSkills(cvText: string): string[] {
  const lower = cvText.toLowerCase();
  return KEYWORD_VOCAB.filter((k) => lower.includes(k.toLowerCase()));
}

function gatherTargetCompanies(board: BoardColumn[], savedJobs: SavedJob[]): TargetCompany[] {
  const byCompany = new Map<string, TargetCompany>();
  // Board first (has real pipeline stage), then saved jobs, then market matrix.
  board.forEach((col) =>
    col.cards.forEach((c) => {
      byCompany.set(c.company.toLowerCase(), { company: c.company, role: c.role, fit: c.match ?? 60, stage: col.title });
    }),
  );
  savedJobs.forEach((j) => {
    const key = j.company.toLowerCase();
    if (!byCompany.has(key)) byCompany.set(key, { company: j.company, role: j.role, fit: j.fit, stage: "Saved" });
  });
  OPPORTUNITY_MATRIX.forEach((o) => {
    const key = o.company.toLowerCase();
    if (!byCompany.has(key)) byCompany.set(key, { company: o.company, role: o.role, fit: o.fit, stage: "Prospect" });
  });
  return [...byCompany.values()].sort((a, b) => b.fit - a.fit);
}

export function deriveProfile(s: ProfileInput): CareerProfile {
  const directionSet = !!(s.dirRole && s.dirIndustry && s.dirSize) || s.dirGenerated;
  const keywords = targetKeywords(s.dirStack);
  const currentSkills = detectSkills(s.cvText);

  // CV / ATS
  const analysis = s.cvText.trim().length >= 60 ? analyzeCvText(s.cvText, s.dirStack) : null;
  const atsHistory = s.cvScores.length ? s.cvScores : analysis && s.cvAnalyzed ? [analysis.score] : [];
  const atsScore = s.cvAnalyzed && atsHistory.length ? atsHistory[atsHistory.length - 1] : null;
  const atsDelta = atsHistory.length >= 2 ? atsHistory[atsHistory.length - 1] - atsHistory[0] : null;
  const missingSkills = analysis ? analysis.missing.map((m) => m.label) : keywords.filter((k) => !currentSkills.includes(k));

  // Pipeline
  const derived = trackerDerived(s.board, s.netSent);
  const interviewRate = derived.submitted ? derived.interviews / derived.submitted : 0;

  // Networking — companies contacted come from outreach events (real history).
  const contactedCompanies = [
    ...new Set(
      s.events
        .filter((e) => e.type === "RecruiterContacted" && typeof e.meta?.company === "string")
        .map((e) => String(e.meta!.company)),
    ),
  ];

  // Interview
  let leetSolved = LEET_BASE;
  const weakPatterns: string[] = [];
  LEET_PATTERNS.forEach(([name, total, def]) => {
    const cur = Math.min(total, s.ivSolved[name] ?? def);
    leetSolved += cur;
    if (cur / total < 0.5) weakPatterns.push(name);
  });

  const targetCompanies = gatherTargetCompanies(s.board, s.savedJobs);

  // Narrative — strengths & weaknesses read from real signal.
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (directionSet) strengths.push("Direction is set and specific");
  else weaknesses.push("No clear direction yet");
  if (atsScore !== null && atsScore >= 75) strengths.push(`Strong CV (ATS ${atsScore})`);
  else if (atsScore !== null) weaknesses.push(`CV needs work (ATS ${atsScore})`);
  if (s.cvProjects) strengths.push("Portfolio projects planned");
  else weaknesses.push("Portfolio is thin");
  if (s.netSent > 8) strengths.push("Actively networking");
  else weaknesses.push("Little networking activity");
  if (leetSolved >= 45) strengths.push("Technical prep on track");
  if (weakPatterns.length) weaknesses.push(`Weak LeetCode patterns: ${weakPatterns.join(", ")}`);
  if (derived.offers > 0) strengths.push("Offer in hand");

  // Current phase = first incomplete phase in the journey order.
  const currentPhase: PfPhase = !directionSet
    ? "direction"
    : !s.cvAnalyzed
      ? "cv"
      : targetCompanies.filter((c) => c.stage === "Saved" || c.stage === "Prospect").length === 0
        ? "jobs"
        : s.netSent <= 8
          ? "networking"
          : leetSolved < 45
            ? "interview"
            : "tracker";

  return {
    targetRole: s.dirRole,
    targetIndustry: s.dirIndustry,
    companySize: s.dirSize,
    workSetting: s.dirSetting,
    directionStatement: directionSet ? directionStatement(s) : null,
    directionSet,

    currentSkills,
    missingSkills,
    targetKeywords: keywords,

    cvAnalyzed: s.cvAnalyzed,
    cvHasContent: s.cvText.trim().length > 0,
    atsScore,
    atsHistory,
    atsDelta,
    projectsGenerated: s.cvProjects,

    targetCompanies,
    applicationsSubmitted: derived.submitted,
    interviewsLanded: derived.interviews,
    offers: derived.offers,
    interviewRate,

    outreachSent: s.netSent,
    contactedCompanies,

    leetSolved,
    weakPatterns,
    interviewsLogged: s.ivFeedback.length,

    strengths,
    weaknesses,
    currentPhase,

    events: s.events,
  };
}
