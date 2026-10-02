import type { ApplicationStatus } from "@/types/database";

/**
 * The student's real working state lives in the client store, which syncs whole
 * to `profiles.client_state`. The per-domain tables the mentor engine was built
 * to read (applications, interview_stories, coffee_chat_notes, leetcode_progress,
 * networking_contacts) are never written by the app, so reading only them gave
 * the mentor an empty picture of every student. This reads the same facts out
 * of the synced snapshot.
 *
 * The snapshot is untrusted JSON from the database, so every field is checked
 * rather than cast.
 */

export interface ClientStateFacts {
  role: string;
  industry: string;
  techStack: string[];
  skills: string[];
  applications: {
    total: number;
    thisWeek: number;
    statuses: Partial<Record<ApplicationStatus, number>>;
    companies: string[];
    recentRejectionTimings: string[];
  };
  networking: { contactsCount: number; coffeeChatsDone: number; messagesSent: number };
  interviewPrep: { storiesCount: number; leetcodeSolved: number };
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strs = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === "string");

/** Tracker columns onto the engine's application statuses. Saved roles aren't applications. */
const COLUMN_STATUS: Record<string, ApplicationStatus> = {
  applied: "applied",
  interview: "interviewing",
  offer: "offer",
  rejected: "rejected",
};

export function factsFromClientState(raw: unknown, now: number = Date.now()): ClientStateFacts {
  const s = obj(raw);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const statuses: Partial<Record<ApplicationStatus, number>> = {};
  const companies = new Set<string>();
  let total = 0;
  let thisWeek = 0;
  const rejectedKeys: string[] = [];
  for (const col of arr(s.board)) {
    const c = obj(col);
    const status = COLUMN_STATUS[str(c.id)];
    if (!status) continue;
    for (const card of arr(c.cards)) {
      const k = obj(card);
      total += 1;
      statuses[status] = (statuses[status] ?? 0) + 1;
      if (str(k.company)) companies.add(str(k.company));
      if (typeof k.appliedDate === "number" && k.appliedDate >= weekStart.getTime()) thisWeek += 1;
      if (status === "rejected" && str(k.key)) rejectedKeys.push(str(k.key));
    }
  }
  const diags = obj(s.diags);
  const recentRejectionTimings = rejectedKeys.map((k) => str(diags[k])).filter(Boolean).slice(0, 5);

  const events = arr(s.events).map(obj);
  const contacts = new Set(
    events.filter((e) => e.type === "RecruiterContacted").map((e) => str(obj(e.meta).contact) || str(obj(e.meta).company)).filter(Boolean),
  );

  return {
    role: str(s.dirRole),
    industry: str(s.dirIndustry),
    techStack: strs(s.dirStack),
    skills: strs(obj(s.cvAiRead).skills),
    applications: { total, thisWeek, statuses, companies: [...companies], recentRejectionTimings },
    networking: {
      contactsCount: contacts.size,
      coffeeChatsDone: events.filter((e) => e.type === "CoffeeChatCompleted").length,
      messagesSent: typeof s.netSent === "number" ? s.netSent : 0,
    },
    interviewPrep: {
      storiesCount: arr(s.savedStories).length,
      leetcodeSolved: Object.values(obj(s.ivProblems)).filter((v) => v === true).length,
    },
  };
}
