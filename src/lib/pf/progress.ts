/**
 * PathFinder — progress engine. Every progress number in the product is
 * computed here from the Career Profile, never hard-coded. Phase percentages
 * feed the sidebar ring, the Command Centre, and the recommendation engine;
 * they update the instant any phase writes new state.
 */

import { toneFor } from "./logic";
import { LEETCODE_TOTAL } from "./leetcode";
import type { CareerProfile } from "./profile";
import type { PfPhase } from "./events";

export interface PhaseProgress {
  phase: PfPhase;
  label: string;
  pct: number; // 0–100
  tone: string;
}

export interface ProgressReport {
  phases: PhaseProgress[];
  overall: number;
  band: string;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Direction: statement drafted = done, otherwise scaled by fields chosen.
 *  The stack bonus needs a stack the student picked: `targetKeywords` falls back
 *  to defaults, so reading it here gave every student the +10 for free. */
function directionPct(p: CareerProfile): number {
  if (p.directionSet) {
    return clamp(80 + (p.workSetting ? 10 : 0) + (p.targetStack.length >= 3 ? 10 : 0));
  }
  const chosen = [p.targetRole, p.targetIndustry, p.companySize].filter(Boolean).length;
  // Chips alone (often pre-filled by onboarding) stay under half: the statement is the work.
  return clamp((chosen / 3) * 40);
}

/** CV: ATS score is the completion once analyzed; 0 before. */
function cvPct(p: CareerProfile): number {
  if (!p.cvAnalyzed || p.atsScore === null) return p.cvHasContent ? 20 : 0;
  return clamp(p.atsScore);
}

/** Projects: planned generation + how many target keywords are covered. */
function projectsPct(p: CareerProfile): number {
  const covered = p.targetKeywords.length
    ? (p.targetKeywords.length - p.missingSkills.length) / p.targetKeywords.length
    : 0;
  const base = p.projectsGenerated ? 55 : 0;
  return clamp(base + covered * 40);
}

/** Networking: outreach volume toward a ~15-message target, companies reached, and the
 *  conversations that actually happened (the step that turns outreach into referrals). */
function networkingPct(p: CareerProfile): number {
  const NET_TARGET = 15;
  const volume = Math.min(1, p.outreachSent / NET_TARGET) * 60;
  const warm = Math.min(1, p.contactedCompanies.length / 3) * 20;
  const chats = Math.min(1, p.coffeeChatsDone / 2) * 20;
  return clamp(volume + warm + chats);
}

/** Interview readiness: LeetCode coverage blended with reflections logged. */
function interviewPct(p: CareerProfile): number {
  const leet = (p.leetSolved / LEETCODE_TOTAL) * 70;
  const reflect = Math.min(1, p.interviewsLogged / 3) * 30;
  return clamp(leet + reflect);
}

/** Application pipeline: submissions toward a target + conversion signal. */
function applicationsPct(p: CareerProfile): number {
  const APP_TARGET = 10;
  const volume = Math.min(1, p.applicationsSubmitted / APP_TARGET) * 60;
  const convert = p.applicationsSubmitted ? p.interviewRate * 30 : 0;
  const offer = p.offers > 0 ? 10 : 0;
  return clamp(volume + convert + offer);
}

function bandFor(overall: number): string {
  if (overall < 45) return "Early stage — build the base";
  if (overall < 65) return "Competitive — closing fast";
  if (overall < 80) return "Strong — start applying hard";
  return "Top decile — convert offers";
}

export function computeProgress(p: CareerProfile): ProgressReport {
  const raw: { phase: PfPhase; label: string; pct: number }[] = [
    { phase: "direction", label: "Career Direction", pct: directionPct(p) },
    { phase: "cv", label: "CV & ATS", pct: cvPct(p) },
    { phase: "jobs", label: "Portfolio & projects", pct: projectsPct(p) },
    { phase: "networking", label: "Networking", pct: networkingPct(p) },
    { phase: "interview", label: "Interview readiness", pct: interviewPct(p) },
    { phase: "tracker", label: "Application pipeline", pct: applicationsPct(p) },
  ];
  const phases: PhaseProgress[] = raw.map((x) => ({ ...x, tone: toneFor(x.pct) }));

  // Readiness is weighted toward the spine of a real offer: referrals
  // (networking) and interview readiness are the highest-leverage, least
  // automatable phases, so they carry the most weight. Direction, CV and
  // tracking are necessary hygiene — not the differentiator between candidates.
  const weights: Record<PfPhase, number> = {
    direction: 0.10,
    cv: 0.18,
    jobs: 0.12,
    networking: 0.26,
    interview: 0.22,
    tracker: 0.12,
  };
  const overall = clamp(phases.reduce((sum, ph) => sum + ph.pct * weights[ph.phase], 0));

  return { phases, overall, band: bandFor(overall) };
}
