"use client";

import { useAppStore } from "@/lib/stores";

const STORAGE_KEYS = {
  applications: "pathfinder-applications",
  internships: "pathfinder-internships",
  cvSummary: "pathfinder-cv-summary",
  direction: "pathfinder-direction",
  leetcode: "pathfinder-leetcode",
  networkingCount: "pathfinder-networking-count",
};

export type SavedInternship = {
  id: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  jobUrl?: string;
  createdAt: string;
};

export function getInternships(): SavedInternship[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEYS.internships);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function setInternships(internships: SavedInternship[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.internships, JSON.stringify(internships));
}

export function addInternship(internship: Omit<SavedInternship, "id" | "createdAt">) {
  const list = getInternships();
  const newOne: SavedInternship = {
    ...internship,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(newOne);
  setInternships(list);
  return newOne;
}

export function removeInternship(id: string) {
  const list = getInternships().filter((i) => i.id !== id);
  setInternships(list);
}

export type PipelineStageId =
  | "researching"
  | "tailoring"
  | "applied"
  | "networking"
  | "interviewing"
  | "offer"
  | "rejected"
  | "ghosted";

export type Application = {
  id: string;
  jobTitle: string;
  company: string;
  source: string;
  matchScore: number;
  stage: PipelineStageId;
  reminderDate?: string;
  jobUrl?: string;
  jobDescription?: string;
  atsKeywords?: string[];
  rejectionTiming?: string;
  appliedDate?: string;
};

export function getApplications(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEYS.applications);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

// Map the canonical lib/store Application shape into the app-store read-model.
function mapAppToLocal(a: Application) {
  return {
    id: a.id,
    company: a.company,
    role: a.jobTitle,
    jobUrl: a.jobUrl,
    jobDescription: a.jobDescription,
    status: a.stage,
    matchScore: a.matchScore,
    atsKeywords: a.atsKeywords ?? [],
    appliedDate: a.appliedDate,
    rejectionTiming: a.rejectionTiming,
  };
}

export function setApplications(apps: Application[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(apps));
  // Mirror into the reactive read-model the dashboard subscribes to.
  useAppStore.setState({ applications: apps.map(mapAppToLocal) as never });
}

export function getCvSummary(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.cvSummary) || "";
}

export function setCvSummary(summary: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.cvSummary, summary);
  useAppStore.setState((s) => ({ cv: { ...s.cv, rawText: summary } }));
}

/**
 * Push the canonical lib/store data into the app-store read-model.
 * Called once on app load so the dashboard reflects existing data even
 * for entities written before this session.
 */
export function hydrateReadModel() {
  if (typeof window === "undefined") return;
  const apps = getApplications();
  const dir = getDirection();
  const cvS = getCvSummary();
  useAppStore.setState((s) => ({
    applications: apps.map(mapAppToLocal) as never,
    direction: {
      ...s.direction,
      statement: dir.statement ?? s.direction.statement,
      score: dir.score ? Number(dir.score) : s.direction.score,
      preferences: {
        ...s.direction.preferences,
        industry: dir.industry ?? s.direction.preferences.industry,
        roleType: dir.roleType ?? s.direction.preferences.roleType,
      },
    },
    cv: { ...s.cv, rawText: cvS || s.cv.rawText },
  }));
}

export function getDirection(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const s = localStorage.getItem(STORAGE_KEYS.direction);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function setDirection(d: Record<string, string>) {
  if (typeof window === "undefined") return;
  // Merge so single-field writes (e.g. an onboarding statement/score) survive
  // later partial updates from the direction wizard.
  const merged = { ...getDirection(), ...d };
  localStorage.setItem(STORAGE_KEYS.direction, JSON.stringify(merged));
  useAppStore.setState((s) => ({
    direction: {
      ...s.direction,
      statement: merged.statement ?? s.direction.statement,
      score: merged.score ? Number(merged.score) : s.direction.score,
      preferences: {
        ...s.direction.preferences,
        industry: merged.industry ?? s.direction.preferences.industry,
        roleType: merged.roleType ?? s.direction.preferences.roleType,
      },
    },
  }));
}

export type LeetcodeState = {
  neetCode75: number;
  neetCode150: number;
  completed75: string[];
  completed150: string[];
};

export function getLeetcode(): LeetcodeState {
  if (typeof window === "undefined") return { neetCode75: 0, neetCode150: 0, completed75: [], completed150: [] };
  try {
    const s = localStorage.getItem(STORAGE_KEYS.leetcode);
    const parsed = s ? JSON.parse(s) : {};
    return {
      neetCode75: parsed.neetCode75 ?? 0,
      neetCode150: parsed.neetCode150 ?? 0,
      completed75: Array.isArray(parsed.completed75) ? parsed.completed75 : [],
      completed150: Array.isArray(parsed.completed150) ? parsed.completed150 : [],
    };
  } catch {
    return { neetCode75: 0, neetCode150: 0, completed75: [], completed150: [] };
  }
}

export function setLeetcode(v: Partial<LeetcodeState>) {
  if (typeof window === "undefined") return;
  const current = getLeetcode();
  const next = { ...current, ...v };
  localStorage.setItem(STORAGE_KEYS.leetcode, JSON.stringify(next));
}

export function getNetworkingCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEYS.networkingCount) || "0", 10);
}

export function setNetworkingCount(n: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.networkingCount, String(n));
}
