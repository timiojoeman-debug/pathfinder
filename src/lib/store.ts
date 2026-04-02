"use client";

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

export function setApplications(apps: Application[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(apps));
}

export function getCvSummary(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.cvSummary) || "";
}

export function setCvSummary(summary: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.cvSummary, summary);
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
  localStorage.setItem(STORAGE_KEYS.direction, JSON.stringify(d));
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
