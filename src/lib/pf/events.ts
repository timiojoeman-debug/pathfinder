/**
 * PathFinder — event log. Every meaningful user action appends a typed,
 * timestamped event. Events are the append-only spine the Career Profile,
 * progress engine, recommendation engine and AI memory all read from.
 *
 * Nothing derived is stored twice: the profile is computed from core store
 * state + this event stream, so there is a single source of truth.
 */

export type PfEventType =
  | "ProfileCreated"
  | "CareerDirectionUpdated"
  | "CVUploaded"
  | "CVAnalyzed"
  | "ProjectGenerated"
  | "JobSaved"
  | "JobMatched"
  | "ApplicationSubmitted"
  | "ApplicationAdvanced"
  | "RecruiterContacted"
  | "CoffeeChatCompleted"
  | "InterviewScheduled"
  | "InterviewCompleted"
  | "OfferReceived"
  | "RejectionDiagnosed"
  | "LeetCodeSolved"
  | "StoryPrepared"
  | "AiConsulted";

export interface PfEvent {
  id: string;
  type: PfEventType;
  /** Short human sentence, e.g. "ATS score 52 → 71". */
  label: string;
  /** Phase this belongs to, for grouping in the timeline. */
  phase: PfPhase;
  /** Free-form structured payload for downstream consumers. */
  meta?: Record<string, string | number | boolean>;
  ts: number;
}

export type PfPhase =
  | "direction"
  | "cv"
  | "jobs"
  | "networking"
  | "interview"
  | "tracker";

export const PHASE_LABEL: Record<PfPhase, string> = {
  direction: "Career Direction",
  cv: "CV Optimisation",
  jobs: "Opportunity Discovery",
  networking: "Networking",
  interview: "Interview Prep",
  tracker: "Application Tracking",
};

export const PHASE_HREF: Record<PfPhase, string> = {
  direction: "/direction",
  cv: "/cv",
  jobs: "/jobs",
  networking: "/networking",
  interview: "/interview",
  tracker: "/tracker",
};

let seq = 0;
/** Monotonic id — stable within a session, unique per event. */
export function nextEventId(): string {
  seq += 1;
  return `${Date.now().toString(36)}-${seq.toString(36)}`;
}

export function makeEvent(
  type: PfEventType,
  phase: PfPhase,
  label: string,
  meta?: PfEvent["meta"],
): PfEvent {
  return { id: nextEventId(), type, phase, label, meta, ts: Date.now() };
}

/** Relative "3d ago" style stamp for the timeline. */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  return `${w}w ago`;
}
