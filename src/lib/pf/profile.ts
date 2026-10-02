/**
 * PathFinder — the Career Profile: one derived, normalized view of everything
 * the platform knows about the user. It is *computed*, never stored twice —
 * every field is a projection of core store state + the event log, so there is
 * a single source of truth and no drift between phases.
 *
 * Every page reads this. Every phase writes to the store/events that feed it.
 */

import { KEYWORD_VOCAB, type BoardColumn } from "./data";
import { LEETCODE_CATEGORIES, LEET_ON_TRACK } from "./leetcode";
import { analyzeCvText, directionStatement, targetKeywords, trackerDerived, type SchemeWindow } from "./logic";
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
  /** Null when nothing scored this role. Never a placeholder number. */
  fit: number | null;
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
  /** The stack the student picked. Unlike `targetKeywords`, never defaulted. */
  targetStack: string[];

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
  /** Saved schemes the student has put dates on; recommend() works back from them. */
  schemeWindows: SchemeWindow[];

  /* Networking */
  outreachSent: number;
  contactedCompanies: string[];
  /** Coffee chats the student marked as held. */
  coffeeChatsDone: number;

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
      byCompany.set(`${c.company}|${c.role}`.toLowerCase(), { company: c.company, role: c.role, fit: c.match ?? null, stage: col.title });
    }),
  );
  savedJobs.forEach((j) => {
    const key = `${j.company}|${j.role}`.toLowerCase();
    if (!byCompany.has(key)) byCompany.set(key, { company: j.company, role: j.role, fit: j.fitKnown === false ? null : j.fit, stage: "Saved" });
  });
  // Only the user's real board + saved jobs count — no seeded market prospects,
  // so a new user's target list starts empty.
  // Unscored roles sort last rather than pretending to a middling fit.
  return [...byCompany.values()].sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));
}

export function deriveProfile(s: ProfileInput): CareerProfile {
  // Set means the student composed a statement, not that onboarding pre-filled
  // the chips: those are a starting point, and counting them handed out
  // direction progress before any direction work happened.
  const directionSet = s.dirGenerated && !!s.dirRole;
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

  // Interview — solved counts come only from real logged progress.
  //
  // A category is "weak" below half solved, but the list is deliberately
  // lopsided (Tries and Intervals hold one problem each), so a single untouched
  // problem would otherwise report as a weak pattern with the same weight as
  // an untouched thirteen. Categories below MIN_WEAK_SIZE are judged only on
  // whether they have been started at all.
  const MIN_WEAK_SIZE = 3;
  let leetSolved = 0;
  const weakPatterns: string[] = [];
  LEETCODE_CATEGORIES.forEach(({ name, problems }) => {
    const total = problems.length;
    const cur = Math.min(total, s.ivSolved[name] ?? 0);
    leetSolved += cur;
    const weak = total < MIN_WEAK_SIZE ? cur === 0 : cur / total < 0.5;
    if (weak) weakPatterns.push(name);
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
  if (leetSolved >= LEET_ON_TRACK) strengths.push("Technical prep on track");
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
          : leetSolved < LEET_ON_TRACK
            ? "interview"
            : "tracker";

  return {
    targetRole: s.dirRole,
    targetIndustry: s.dirIndustry,
    companySize: s.dirSize,
    workSetting: s.dirSetting,
    directionStatement: directionSet ? directionStatement(s) : null,
    directionSet,
    targetStack: s.dirStack,

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
    schemeWindows: (s.board.find((col) => col.id === "saved")?.cards ?? [])
      .filter((c) => c.opens || c.deadline)
      .map(({ company, role, opens, deadline }) => ({ company, role, opens, deadline })),

    outreachSent: s.netSent,
    contactedCompanies,
    coffeeChatsDone: s.events.filter((e) => e.type === "CoffeeChatCompleted").length,

    leetSolved,
    weakPatterns,
    interviewsLogged: s.ivFeedback.length,

    strengths,
    weaknesses,
    currentPhase,

    events: s.events,
  };
}
