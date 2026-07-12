/**
 * PathFinder — progress engine. Every progress number in the product is
 * computed here from the Career Profile, never hard-coded. Phase percentages
 * feed the sidebar ring, the Command Centre, and the recommendation engine;
 * they update the instant any phase writes new state.
 */

import { toneFor } from "./logic";
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

/** Direction: statement drafted = done, otherwise scaled by fields chosen. */
function directionPct(p: CareerProfile): number {
  if (p.directionSet) {
    const bonus = [p.workSetting, p.targetKeywords.length >= 3].filter(Boolean).length * 0;
    return clamp(80 + (p.workSetting ? 10 : 0) + (p.targetKeywords.length >= 3 ? 10 : 0) + bonus);
  }
  const chosen = [p.targetRole, p.targetIndustry, p.companySize].filter(Boolean).length;
  return clamp((chosen / 3) * 60);
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

/** Networking: outreach volume toward a ~15-message target + warm paths. */
function networkingPct(p: CareerProfile): number {
  const NET_TARGET = 15;
  const volume = Math.min(1, p.outreachSent / NET_TARGET) * 80;
  const warm = Math.min(1, p.contactedCompanies.length / 3) * 20;
  return clamp(volume + warm);
}

/** Interview readiness: LeetCode coverage blended with reflections logged. */
function interviewPct(p: CareerProfile): number {
  const leet = (p.leetSolved / 75) * 70;
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

  // Weighted overall — direction & CV are prerequisites, pipeline is the goal.
  const weights: Record<PfPhase, number> = {
    direction: 0.12,
    cv: 0.24,
    jobs: 0.16,
    networking: 0.18,
    interview: 0.16,
    tracker: 0.14,
  };
  const overall = clamp(phases.reduce((sum, ph) => sum + ph.pct * weights[ph.phase], 0));

  return { phases, overall, band: bandFor(overall) };
}
