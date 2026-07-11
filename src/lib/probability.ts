/**
 * Per-role fit estimate.
 *
 * Combines the student's readiness baseline with difficulty signals parsed
 * from the actual job description (seniority / experience requirements).
 * It is an *estimate* that sharpens when the role is analyzed — never a
 * fabricated precise number.
 */

export type FitBand = "reach" | "stretch" | "realistic" | "strong";
export type FitTone = "bad" | "warn" | "accent" | "good";

export interface RoleFit {
  band: FitBand;
  pct: number; // estimated fit, 4–96
  label: string;
  tone: FitTone;
}

// Signals that the role is harder for a student (push fit down).
const HARDER: RegExp[] = [
  /\bsenior\b/i,
  /\blead\b/i,
  /\bstaff\b/i,
  /\bprincipal\b/i,
  /\bmanager\b/i,
  /\b(3|4|5|6|7|8|9|10)\s*\+?\s*years?\b/i,
  /\bph\.?d\b/i,
  /\bexpert\b/i,
  /\bextensive experience\b/i,
];

// Signals that the role suits a student (push fit up).
const EASIER: RegExp[] = [
  /\bintern(ship)?\b/i,
  /\bgraduate\b/i,
  /\bentry[-\s]level\b/i,
  /\bjunior\b/i,
  /\bplacement\b/i,
  /\bno experience\b/i,
  /\bfirst[-\s]year\b/i,
  /\btrainee\b/i,
  /\bapprentice/i,
  /\bstudent\b/i,
];

const HARD_STEP = 9;
const EASY_STEP = 8;

export function roleDifficulty(jobDescription: string): number {
  const text = jobDescription || "";
  let d = 50;
  for (const re of HARDER) if (re.test(text)) d += HARD_STEP;
  for (const re of EASIER) if (re.test(text)) d -= EASY_STEP;
  return Math.max(15, Math.min(90, d));
}

export function roleFit(baseline: number, jobDescription: string): RoleFit {
  const safeBaseline = Number.isFinite(baseline) ? Math.max(0, Math.min(100, baseline)) : 50;
  const difficulty = roleDifficulty(jobDescription);
  // Student strength vs role difficulty. Above-average difficulty erodes fit.
  let pct = Math.round(safeBaseline - (difficulty - 50) * 0.8);
  pct = Math.max(4, Math.min(96, pct));

  if (pct < 35) return { band: "reach", pct, label: "Reach", tone: "bad" };
  if (pct < 55) return { band: "stretch", pct, label: "Stretch", tone: "warn" };
  if (pct < 75) return { band: "realistic", pct, label: "Realistic", tone: "accent" };
  return { band: "strong", pct, label: "Strong match", tone: "good" };
}
