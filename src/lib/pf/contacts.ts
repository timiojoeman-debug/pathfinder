/**
 * PathFinder: the contacts board. Pure types and helpers; the store owns the
 * actions. A contact is another person's data, so it holds only what is needed
 * to follow up, stays on the student's side, and never feeds a progress number
 * by itself (see the evidence rules in store.ts).
 */

import { safeHttpUrl } from "@/lib/jobs/types";
import type { BoardColumn } from "./data";

export const CONTACT_STAGES = ["researched", "messaged", "replied", "chatted", "referred", "not-now"] as const;
export type ContactStage = (typeof CONTACT_STAGES)[number];
export const CONTACT_STAGE_LABEL: Record<ContactStage, string> = {
  researched: "Researched",
  messaged: "Messaged",
  replied: "Replied",
  chatted: "Chatted",
  referred: "Referred",
  "not-now": "Not now",
};

export const HOW_WE_MET = ["alumni", "event", "linkedin", "introduction", "cold-outreach", "other"] as const;
export type HowWeMet = (typeof HOW_WE_MET)[number];
export const HOW_WE_MET_LABEL: Record<HowWeMet, string> = {
  alumni: "Alumni",
  event: "Event",
  linkedin: "LinkedIn",
  introduction: "Introduction",
  "cold-outreach": "Cold outreach",
  other: "Other",
};

export interface Contact {
  id: string;
  name: string;
  company: string;
  role?: string;
  howWeMet: HowWeMet;
  /** http(s) only. */
  link?: string;
  stage: ContactStage;
  notes: string;
  /** yyyy-mm-dd */
  followUpOn?: string;
  createdAt: number;
  updatedAt: number;
}

let seq = 0;
export function newContactId(): string {
  seq += 1;
  return `ct-${Date.now().toString(36)}-${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
export const validDay = (v: unknown): v is string => typeof v === "string" && ISO_DAY.test(v);

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Contacts arrive from localStorage or a synced snapshot, so nothing is trusted:
 *  unknown stages fall back, links are re-checked, junk rows are dropped. */
export function sanitizeContacts(raw: unknown): Contact[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, Contact>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const c = r as Record<string, unknown>;
    const name = clip(c.name, 120);
    if (typeof c.id !== "string" || !c.id || !name) continue;
    const link = safeHttpUrl(c.link) ?? undefined;
    const role = clip(c.role, 120);
    const now = Date.now();
    const keep: Contact = {
      id: c.id,
      name,
      company: clip(c.company, 120),
      ...(role ? { role } : {}),
      howWeMet: (HOW_WE_MET as readonly unknown[]).includes(c.howWeMet) ? (c.howWeMet as HowWeMet) : "other",
      ...(link ? { link } : {}),
      stage: (CONTACT_STAGES as readonly unknown[]).includes(c.stage) ? (c.stage as ContactStage) : "researched",
      notes: typeof c.notes === "string" ? c.notes.slice(0, 4000) : "",
      ...(validDay(c.followUpOn) ? { followUpOn: c.followUpOn } : {}),
      createdAt: typeof c.createdAt === "number" ? c.createdAt : now,
      updatedAt: typeof c.updatedAt === "number" ? c.updatedAt : now,
    };
    // A duplicate id (a bad merge of two devices) keeps the newest copy.
    const prev = byId.get(keep.id);
    if (!prev || keep.updatedAt > prev.updatedAt) byId.set(keep.id, keep);
  }
  return [...byId.values()];
}

const norm = (s: string) => s.trim().toLowerCase();

/** People the student knows at a company, ignoring case and stray spaces. An empty company matches nobody. */
export function contactsAtCompany(contacts: Contact[], company: string): Contact[] {
  const co = norm(company);
  return co ? contacts.filter((c) => norm(c.company) === co) : [];
}

/** Tracker cards at a company, with the column they sit in. */
export function applicationsAtCompany(board: BoardColumn[], company: string): { key: string; role: string; column: string }[] {
  const co = norm(company);
  if (!co) return [];
  return board.flatMap((col) => col.cards.filter((c) => norm(c.company) === co).map((c) => ({ key: c.key, role: c.role, column: col.title })));
}
