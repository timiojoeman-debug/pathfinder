"use client";

import { useMemo } from "react";

/**
 * PathFinder redesign — global app store. Holds every piece of cross-page
 * state from the design handoff (onboarding, direction, cv, jobs, networking,
 * interview, tracker board, palette + drawers) and persists the durable slice
 * to localStorage under the same key the design prototype used.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  EMPTY_BOARD,
  type BoardCard,
  type BoardColumn,
  type OutreachPersona,
} from "./data";
import { addCustomStack, onbToDirIndustry, onbToDirRole, onbToDirSize } from "./taxonomy";
import {
  analyzeCvText,
  analyzeJobDescription,
  fitTone,
  migrateDiags,
  migrateDirection,
  pruneTargetRoles,
  readinessFrom,
  MAX_JD_CHARS,
  postingKey,
  roleFit,
  trackCardKey,
  targetKeywords,
  type JfResult,
  type OnbState,
} from "./logic";
import { categoryOf, LEETCODE_CATEGORIES, LEETCODE_PROBLEMS } from "./leetcode";
import { makeEvent, nextEventId, type PfEvent, type PfEventType, type PfPhase } from "./events";
import { CONTACT_STAGE_LABEL, MAX_CONTACTS, newContactId, sanitizeContacts, validDay, HOW_WE_MET, type Contact, type ContactStage, type HowWeMet } from "./contacts";
import { safeHttpUrl } from "@/lib/jobs/types";
import { deriveProfile, type CareerProfile, type ProfileInput } from "./profile";
import { computeProgress, type ProgressReport } from "./progress";
import { recommend, type Recommendation } from "./recommendations";
import type { AiInteraction } from "./orchestrator";
import type { AtsEnvelope as TailorAts, MatchEnvelope as TailorMatch } from "@/components/pf/cv/tailor-panel";

import type { Naturalness } from "@/components/pf/networking/naturalness-note";

export interface ChatMsg { who: "you" | "ai"; text: string }

/** The person the student is currently working on, shared by Research, Outreach
 *  and the Contact workspace so nobody types the same name twice. */
export interface NetContact { name: string; company: string; about: string; experience: string }
export type AddContactResult = "added" | "no-name" | "duplicate" | "bad-link";
/** What `/api/networking/analyze-profile` found in what the student pasted. */
export interface NetResearch { summary?: string; connectionPoints?: string[]; outreachAngles?: string[]; conversationStarters?: string[] }
/** Research is about one person: `key` is `netContactKey` of the contact it was run on. */
export interface NetResearchFor { key: string; name: string; data: NetResearch }
/** The last generated outreach, kept only for the contact + persona it was written for. */
export interface NetDraft {
  key: string;
  paras: string[];
  followUp: string | null;
  naturalness: Naturalness | null;
  questions: string[];
  topics: string[];
}
// Deleting a contact also drops the pasted profile, research and draft about them.
const NO_WORKING_CONTACT = { netContact: { name: "", company: "", about: "", experience: "" }, netResearch: null, netDraft: null };

/** Which person something belongs to, ignoring case and stray whitespace. */
export const netContactKey = (c: { name: string; company?: string }) =>
  [c.name.trim().toLowerCase(), (c.company ?? "").trim().toLowerCase()].join("|");
/** Which contact + persona a draft belongs to. */
export const netDraftKey = (persona: string, c: { name: string; company: string }) =>
  [persona, netContactKey(c)].join("|");

const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Erasing people: bookkeeping events about them go, and the evidence events that stay
 *  (messages, chats, referrals) lose the name, in meta and in any label that carries it.
 *  Company, type and contactId stay, so the counts survive without saying who. */
export function scrubPeople(events: PfEvent[], people: Contact[]): PfEvent[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const byKey = new Map(people.map((p) => [netContactKey(p), p]));
  const names = people.map((p) => p.name.trim()).filter(Boolean);
  // Which removed person an event is about, if any.
  const who = (e: PfEvent) =>
    (typeof e.meta?.contactId === "string" ? byId.get(e.meta.contactId) : undefined) ??
    byKey.get(netContactKey({ name: String(e.meta?.contact ?? ""), company: String(e.meta?.company ?? "") }));
  return events
    .filter((e) => !(e.type === "ContactStageChanged" && who(e)))
    .map((e) => {
      let label = e.label;
      for (const n of names) label = label.replace(new RegExp(`\\b${reEscape(n)}\\b`, "gi"), "a contact");
      const p = who(e);
      if (!p && label === e.label) return e;
      // An opaque contactId replaces the name, so two people at one company still count as two.
      return { ...e, label, ...(p && e.meta ? { meta: { ...e.meta, contact: "", contactId: p.id } } : {}) };
    });
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A CoffeeChatCompleted for this contact (and company) in the last 24 hours. One
 *  conversation counts once, but a genuine later chat with the same person still can. */
export function recentCoffeeChat(events: PfEvent[], c: { contact: string; company?: string }, now = Date.now()): boolean {
  const key = netContactKey({ name: c.contact, company: c.company });
  return events.some(
    (e) =>
      e.type === "CoffeeChatCompleted" &&
      now - e.ts < DAY_MS &&
      netContactKey({ name: String(e.meta?.contact ?? ""), company: String(e.meta?.company ?? "") }) === key,
  );
}
/** A turn in the cross-page mentor conversation. */
export interface AsstMsg { role: "user" | "assistant"; content: string }

export interface SavedJob {
  company: string;
  role: string;
  meta: string;
  fit: number;
  /** False when nothing could be scored (e.g. a job-board snippet listing no
   *  requirements). `fit` is then meaningless and must render as "—", never as
   *  a number. Absent means scored, so existing saved jobs are unaffected. */
  fitKnown?: boolean;
  dash: number;
  tone: string;
  tags: string[];
  verdict: string;
  action: string;
  jdText?: string;
  /** The listing's own apply link. Absent for roles the student added by hand. */
  url?: string;
  /** ISO time the employer published it, when the source said. Absent means unknown, never guessed. */
  postedAt?: string;
  /** The last cover letter generated for this role, so it survives navigation. */
  coverLetter?: string;
}

/** The statement `/api/direction` composed. Persisted because the profile shows it on other
 *  pages; cleared whenever a direction chip changes, so it can never describe stale inputs. */
export interface DirStatementAi { statement: string; specificity: string; suggestions: string[] }

/** The AI mentor read of the CV text (/api/cv/analyze), kept so it survives navigation. */
export interface CvAiRead {
  skills: string[];
  strengths: string[];
  feedback: { issue: string; suggestedFix: string }[];
  nextSteps: string[];
}

/** The last AI cover letter, keyed on the posting it was written for (see `postingKey`). */
export interface JfCoverLetter { key: string; paras: string[]; assumptions: string[]; words: number }

export interface InterviewFeedback { company: string; rating: number; note: string; date: string }
/** A STAR story the student saved. Its count is the "stories prepared" evidence. */
export interface SavedStory { id: string; title: string; situation: string; task: string; action: string; result: string; /** Optional fifth STARL beat; stories saved with four beats have none. */ learnings?: string; savedAt: number }
/** The last company briefing generated for a company, kept so it survives a reload. */
export interface SavedBriefing {
  company: string;
  role: string;
  at: number;
  data: {
    companyOverview?: string;
    techStack?: string[];
    techStackConfidence?: "high" | "medium" | "low";
    values?: string[];
    whyThisCompany?: string[];
    questionsToAsk?: string[];
    uncertainties?: string[];
    /** Tiered research (beginner / intermediate / advanced). Absent on briefings saved before tiers existed. */
    tiers?: BriefingTiers;
  };
}
export interface BriefingTiers {
  beginner?: { facts?: string[]; toCheck?: string[] };
  intermediate?: { customersAndPainPoints?: string[]; peopleToResearch?: string[] };
  advanced?: {
    competitiveLandscape?: string[];
    strategicSignals?: string[];
    whatItMeansForTheRole?: string[];
    angles?: string[];
    insight?: string;
    whyItLands?: string;
  };
}

interface PfState {
  /* shell */
  collapsed: boolean;
  paletteOpen: boolean;
  paletteQ: string;
  jobDetail: string | null; // trackCardKey(company, role), or a bare company name from older callers
  appDetail: string | null; // board card key

  /* onboarding */
  onb: OnbState;
  onbDone: boolean;

  /* direction */
  dirMode: "wizard" | "explore";
  dirRole: string | null;
  dirStack: string[];
  dirIndustry: string | null;
  dirSize: string | null;
  dirSetting: string | null;
  dirGenerated: boolean;
  copiedVariant: string | null;
  dirStatementAi: DirStatementAi | null;
  /** Titles the student ticked to search under. Capped at three. */
  dirTargetRoles: string[];
  chat: ChatMsg[];
  chatDraft: string;
  chatN: number;

  /* mentor assistant — advisory only, kept separate from the Direction page's
     scripted `chat` above. It reads the profile; it never writes to it. */
  asstOpen: boolean;
  asstMsgs: AsstMsg[];
  asstDraft: string;

  /* profile — self-reported, only used to build alumni-search links; feeds no progress number or AI prompt */
  university: string;

  /* cv */
  cvText: string;
  cvAnalyzed: boolean;
  cvProjects: boolean;
  cvLinkedIn: boolean;
  cvAiRead: CvAiRead | null;
  /** Tailor panel: the last pasted advert and the results run against it. */
  cvTailorJD: string;
  cvTailorAts: TailorAts | null;
  cvTailorMatch: TailorMatch | null;

  /* jobs */
  jfTitle: string;
  jfCompany: string;
  jfJD: string;
  jfResult: JfResult | null;
  jfLetter: boolean;
  jfCoverLetter: JfCoverLetter | null;
  savedJobs: SavedJob[];

  /* networking */
  netPersona: OutreachPersona;
  netSent: number;
  netGenerated: boolean;
  netFollow: boolean;
  netContact: NetContact;
  netResearch: NetResearchFor | null;
  netDraft: NetDraft | null;
  /** Everyone the student is talking to. Private to them: never sent to an AI route
   *  except through the explicit per-contact actions (outreach, prep). */
  contacts: Contact[];
  /** Which contact's drawer is open. Not persisted. */
  contactDetail: string | null;
  /** True once the pre-board working contact has been considered for seeding. Without it
   *  a deleted contact would be re-seeded from `netContact` on the next load. */
  contactsSeeded: boolean;

  /* interview */
  ivTab: string;
  /** Per-category solved counts. A projection of `ivProblems`, kept in the
   *  store because the profile and progress derivations read it. */
  ivSolved: Record<string, number>;
  /** Solved problems by slug — the source of truth for LeetCode progress. */
  ivProblems: Record<string, boolean>;
  fbCompany: string;
  fbRating: number;
  fbNote: string;
  ivFeedback: InterviewFeedback[];
  savedStories: SavedStory[];
  /** Last briefing per company, keyed by lower-cased company name. */
  ivBriefings: Record<string, SavedBriefing>;
  /** Set by the tracker's "Prep" action; the Briefing tab takes it once and clears it. */
  ivBriefingFor: { company: string; role: string } | null;

  /* tracker */
  board: BoardColumn[];
  diags: Record<string, string>;

  /* career OS — event log, AI memory, ATS history */
  events: PfEvent[];
  aiLog: AiInteraction[];
  cvScores: number[];

  /* ── actions ── */
  set: (patch: Partial<PfState>) => void;
  emit: (type: PfEventType, phase: PfPhase, label: string, meta?: PfEvent["meta"]) => void;
  logAi: (interaction: AiInteraction) => void;
  pushEvent: (event: PfEvent) => void;
  toggleCollapsed: () => void;
  openPalette: () => void;
  closePalette: () => void;
  closeDrawers: () => void;
  /** With a role, keys the drawer on company + role so two roles at one company don't collide. */
  openJob: (company: string, role?: string) => void;
  openApp: (key: string) => void;

  setOnb: (patch: Partial<OnbState>) => void;
  startOnbScan: () => void;
  finishOnb: () => void;
  readiness: () => number;

  pickDirChip: (key: "dirRole" | "dirIndustry" | "dirSize" | "dirSetting", value: string | null) => void;
  /** Append a keyword the student typed to the stack. Returns an error message, or null. */
  addDirStack: (raw: string) => string | null;
  toggleDirStack: (value: string) => void;
  generateDirection: () => void;
  copyVariant: (v: string) => void;
  /** Tick or untick a target role. Ticking a fourth is a no-op. */
  toggleDirTargetRole: (title: string) => void;
  acceptChat: () => void;

  analyzeCv: () => void;
  reAnalyzeCv: () => void;

  saveJfJob: () => void;
  analyzeJf: () => void;
  /** Save a live search result (deduped on company + role) and log it. */
  saveListing: (job: SavedJob) => void;
  /** Keep a generated cover letter, and attach it to the saved role it was written for. */
  keepCoverLetter: (letter: JfCoverLetter) => void;
  /** Hand an advert to the CV Tailor panel, clearing results run against the old one. */
  setUniversity: (name: string) => void;
  setTailorJD: (jd: string) => void;
  /** Keep an AI read of `forText` (length-capped). False, and nothing kept, if the CV changed meanwhile. */
  keepCvAiRead: (read: CvAiRead, forText: string) => boolean;
  /** Keep a Tailor result run against `forJD`. False, and nothing kept, if the advert changed meanwhile. */
  keepTailorResult: (kind: "ats" | "match", result: TailorAts | TailorMatch, forJD: string) => boolean;

  /** Log a sent message. Returns false (and logs nothing) without a real recipient and message. */
  generateOutreach: (contact: { name: string; company?: string; message: string }) => boolean;
  /** Logs a coffee chat the student actually held. Needs a named contact. */
  completeCoffeeChat: (chat: { contact: string; company?: string; stage?: string; contactId?: string }) => boolean;

  /** Add a contact (stage Researched). Deduped on name + company. */
  addContact: (input: { name: string; company: string; role?: string; howWeMet: HowWeMet; link?: string }) => AddContactResult;
  /** Edit details. A blank name, a clashing name + company or a non-http(s) link leaves that field as it was. */
  /** Batch add for the import: one dedupe pass, one `set`. Rows over `MAX_CONTACTS` are skipped. */
  addContacts: (inputs: { name: string; company: string; role?: string; howWeMet: HowWeMet }[]) => { added: number; skipped: number };
  updateContact: (id: string, patch: Partial<Pick<Contact, "name" | "company" | "role" | "howWeMet" | "link" | "notes">>) => void;
  /** Change stage. Chatted logs a coffee chat and Referred logs a self-reported referral; neither is progress by hand-waving (see the store). */
  moveContact: (id: string, stage: ContactStage) => void;
  setContactFollowUp: (id: string, day: string | undefined) => void;
  /** "Still relevant?" answered yes: restarts the 12-month retention clock without changing anything else. */
  keepContact: (id: string) => void;
  removeContact: (id: string) => void;
  clearContacts: () => void;
  /** Make this contact the working contact, so research, outreach and prep apply to them. */
  selectContact: (id: string) => void;
  openContact: (id: string) => void;

  /** Mark a problem solved, or un-mark it if it already was. */
  toggleProblem: (slug: string) => void;
  saveFeedback: () => void;
  /** Save a STAR story. Returns false (and saves nothing) unless all four beats are written. */
  saveStory: (story: Omit<SavedStory, "id" | "savedAt">) => boolean;
  deleteStory: (id: string) => void;
  saveBriefing: (briefing: Omit<SavedBriefing, "at">) => void;

  moveCard: (key: string, toId: BoardColumn["id"]) => void;
  moveCardBefore: (key: string, targetKey: string) => void;
  advanceCard: (key: string) => void;
  removeCard: (key: string) => void;
  setRemind: (key: string, value: string) => void;
  setCardDate: (key: string, field: "opens" | "deadline", value: string) => void;
  setDiag: (key: string, timing: string) => void;
  trackJob: (job: { company: string; role: string; fit: number | null; tone: string }) => void;
  /** Add an application by hand. Returns false for a missing field or a card that already exists. */
  addCard: (card: { company: string; role: string; column: BoardColumn["id"]; link?: string; appliedOn?: string }) => boolean;
  setCardNote: (key: string, note: string) => void;
  /** The student sent a follow-up on this application. Clears the follow-up nudge for two weeks. */
  markFollowedUp: (key: string) => void;
}

/** Stamp a card as it lands in a new column. */
function stampCard(card: BoardCard, toId: BoardColumn["id"]): BoardCard {
  const now = Date.now();
  if (toId === "applied" && !card.appliedDate) return { ...card, appliedDate: now, movedAt: now, tag: "ATS ✓", when: "today" };
  if (toId === "interview") return { ...card, tag: "scheduled", when: "prep now", movedAt: now, reachedInterview: true };
  if (toId === "offer") return { ...card, tag: "offer", when: "decide", movedAt: now, reachedInterview: true };
  if (toId === "rejected") return { ...card, tag: "rejected", tone: "var(--risk)", when: "today", movedAt: now, rejected: true };
  return card;
}

const COLUMN_EVENT: Partial<Record<BoardColumn["id"], { type: PfEventType; label: (co: string) => string }>> = {
  applied: { type: "ApplicationSubmitted", label: (co) => `Applied to ${co}` },
  interview: { type: "InterviewScheduled", label: (co) => `Interview stage · ${co}` },
  offer: { type: "OfferReceived", label: (co) => `Offer from ${co} 🎉` },
  rejected: { type: "ApplicationAdvanced", label: (co) => `Rejected or ghosted · ${co}` },
};

function columnOf(board: BoardColumn[], key: string): BoardColumn["id"] | null {
  return board.find((col) => col.cards.some((c) => c.key === key))?.id ?? null;
}

function stripCard(board: BoardColumn[], key: string): { board: BoardColumn[]; moved: BoardCard | null } {
  let moved: BoardCard | null = null;
  const stripped = board.map((col) => {
    const found = col.cards.find((c) => c.key === key);
    if (found) moved = found;
    return { ...col, cards: col.cards.filter((c) => c.key !== key) };
  });
  return { board: stripped, moved };
}

export const usePfStore = create<PfState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      paletteOpen: false,
      paletteQ: "",
      jobDetail: null,
      appDetail: null,

      onb: { step: 1, role: null, industry: null, stage: null, cv: null, projects: null, outreach: null, cadence: null },
      onbDone: false,

      dirMode: "wizard",
      dirRole: null,
      dirStack: [],
      dirIndustry: null,
      dirSize: null,
      dirSetting: null,
      dirGenerated: false,
      copiedVariant: null,
      dirStatementAi: null,
      dirTargetRoles: [],
      chat: [],
      chatDraft: "",
      chatN: 0,

      asstOpen: false,
      asstMsgs: [],
      asstDraft: "",

      university: "",

      cvText: "",
      cvAnalyzed: false,
      cvProjects: false,
      cvLinkedIn: false,
      cvAiRead: null,
      cvTailorJD: "",
      cvTailorAts: null,
      cvTailorMatch: null,

      jfTitle: "",
      jfCompany: "",
      jfJD: "",
      jfResult: null,
      jfLetter: false,
      jfCoverLetter: null,
      savedJobs: [],

      netPersona: "Recruiter",
      netSent: 0,
      netGenerated: false,
      netFollow: false,
      netContact: { name: "", company: "", about: "", experience: "" },
      netResearch: null,
      netDraft: null,
      contacts: [],
      contactDetail: null,
      contactsSeeded: true,

      ivTab: "leetcode",
      ivSolved: {},
      ivProblems: {},
      fbCompany: "",
      fbRating: 0,
      fbNote: "",
      ivFeedback: [],
      savedStories: [],
      ivBriefings: {},
      ivBriefingFor: null,

      board: EMPTY_BOARD,
      diags: {},

      events: [],
      aiLog: [],
      cvScores: [],

      set: (patch) => set(patch),
      emit: (type, phase, label, meta) =>
        set((s) => ({ events: [...s.events, makeEvent(type, phase, label, meta)] })),
      pushEvent: (event) => set((s) => ({ events: [...s.events, event] })),
      logAi: (interaction) => set((s) => ({ aiLog: [interaction, ...s.aiLog].slice(0, 30) })),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      openPalette: () => set({ paletteOpen: true, paletteQ: "" }),
      closePalette: () => set({ paletteOpen: false }),
      closeDrawers: () => set({ jobDetail: null, appDetail: null, contactDetail: null }),
      openJob: (company, role) => set({ jobDetail: role === undefined ? company : trackCardKey(company, role), appDetail: null, contactDetail: null }),
      openApp: (key) => set({ appDetail: key, jobDetail: null, contactDetail: null }),
      openContact: (id) => set({ contactDetail: id, appDetail: null, jobDetail: null }),

      setOnb: (patch) => set((s) => ({ onb: { ...s.onb, ...patch } })),
      startOnbScan: () => {
        const { onb } = get();
        if (!(onb.cv && onb.projects && onb.outreach && onb.cadence)) return;
        // The baseline is arithmetic, so it shows at once rather than behind a pretend scan.
        set((s) => ({ onb: { ...s.onb, step: 3 } }));
      },
      /**
       * Finishing Stage 00 has to hand its answers to the rest of the system,
       * or the assessment is a dead end: the Command Centre derives everything
       * from the Career Profile + event log, so an onboarding that only flips
       * `onbDone` leaves the student staring at 0% and "No clear direction
       * yet" seconds after telling us their target.
       *
       * So: carry the target into the direction chips (real input the student
       * gave — it makes `directionSet` true and pre-fills the wizard), and log
       * the baseline as events so the timeline and AI memory start non-empty.
       *
       * Deliberately NOT done: feeding the self-rated sliders into the CV /
       * networking / interview pillars. Those are evidence-derived — claiming
       * "CV 45%" before a CV exists is exactly the fabricated-progress problem
       * we removed. Zeros there are correct until the student does the work.
       */
      finishOnb: () => {
        const { onb } = get();
        const role = onbToDirRole(onb.role);
        const industry = onbToDirIndustry(onb.industry);
        const size = onbToDirSize(onb.stage);

        // Never clobber a direction the student already built in the wizard.
        set((s) => ({
          onbDone: true,
          dirRole: s.dirRole ?? role,
          dirIndustry: s.dirIndustry ?? industry,
          dirSize: s.dirSize ?? size,
        }));

        const { emit } = get();
        emit("ProfileCreated", "direction", `Baseline captured — self-assessed readiness ${readinessFrom(onb)}%`, {
          selfRatedCv: onb.cv ?? 0,
          selfRatedProjects: onb.projects ?? 0,
          selfRatedOutreach: onb.outreach ?? 0,
          selfRatedCadence: onb.cadence ?? 0,
          source: "onboarding",
        });

        const committed = get();
        if (committed.dirRole && committed.dirIndustry) {
          emit(
            "CareerDirectionUpdated",
            "direction",
            `Target set: ${committed.dirRole} in ${committed.dirIndustry}`,
            { role: committed.dirRole, industry: committed.dirIndustry },
          );
        }
      },
      readiness: () => readinessFrom(get().onb),

      pickDirChip: (key, value) =>
        set((s) => ({
          [key]: value,
          dirGenerated: false,
          dirStatementAi: null,
          // A role change can retire ticked target roles; never count titles the list no longer shows.
          ...(key === "dirRole" ? { dirTargetRoles: pruneTargetRoles(s.dirTargetRoles, value) } : {}),
        }) as Partial<PfState>),
      addDirStack: (raw) => {
        const { stack, error } = addCustomStack(get().dirStack, raw);
        if (stack !== get().dirStack) set({ dirStack: stack, dirGenerated: false, dirStatementAi: null });
        return error;
      },
      toggleDirStack: (value) =>
        set((s) => ({
          dirStack: s.dirStack.includes(value) ? s.dirStack.filter((x) => x !== value) : [...s.dirStack, value],
          dirGenerated: false,
          dirStatementAi: null,
        })),
      generateDirection: () => {
        const s = get();
        if (!(s.dirRole && s.dirIndustry && s.dirSize)) return;
        set({ dirGenerated: true });
        get().emit("CareerDirectionUpdated", "direction", `Direction set: ${s.dirRole} in ${s.dirIndustry}`, { role: s.dirRole!, industry: s.dirIndustry! });
      },
      copyVariant: (v) => {
        try { void navigator.clipboard.writeText(v); } catch { /* clipboard unavailable */ }
        set({ copiedVariant: v });
      },
      toggleDirTargetRole: (title) => {
        const cur = get().dirTargetRoles;
        const on = cur.includes(title);
        if (!on && cur.length >= 3) return;
        const next = on ? cur.filter((t) => t !== title) : [...cur, title];
        set({ dirTargetRoles: next });
        get().emit("CareerDirectionUpdated", "direction", next.length ? `Target roles: ${next.join(", ")}` : "Cleared target roles", { targetRoles: next.join(", ") });
      },
      /** Hand the chat's answers to the wizard. Only a role and industry the student actually
       *  stated count; the company size is left for them to pick rather than assumed. */
      acceptChat: () => {
        const s = get();
        if (!(s.dirRole && s.dirIndustry)) return;
        set({ dirMode: "wizard", dirGenerated: !!s.dirSize });
        if (s.dirSize) get().emit("CareerDirectionUpdated", "direction", `Direction drafted from chat: ${s.dirRole} in ${s.dirIndustry}`, { role: s.dirRole, industry: s.dirIndustry });
      },

      analyzeCv: () => {
        const s0 = get();
        if (s0.cvText.trim().length < 60) return;
        const s = s0;
        const analysis = analyzeCvText(s.cvText, s.dirStack, s.dirRole);
        const prev = s.cvScores.length ? s.cvScores[s.cvScores.length - 1] : null;
        const label = prev !== null && prev !== analysis.score
          ? `ATS score ${prev} → ${analysis.score}`
          : `CV analysed, ATS ${analysis.score}`;
        set({ cvAnalyzed: true, cvScores: [...s.cvScores, analysis.score] });
        get().emit("CVAnalyzed", "cv", label, { score: analysis.score, vague: analysis.vague.length, missing: analysis.missing.length });
      },
      reAnalyzeCv: () => set({ cvAnalyzed: false, cvProjects: false }),

      saveJfJob: () => {
        const s = get();
        if (!(s.jfTitle.trim() && s.jfCompany.trim())) return;
        const scored = roleFit(s.jfJD, s.cvText);
        const fit = scored ?? 0;
        const letter = s.jfCoverLetter?.key === postingKey(s.jfCompany, s.jfTitle, s.jfJD) ? s.jfCoverLetter : null;
        const jdLower = s.jfJD.toLowerCase();
        const found = ["React", "TypeScript", "JavaScript", "Next.js", "Node", "Express", "Python", "Go", "Java", "C++", "SQL", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes", "GraphQL", "REST", "CI/CD", "Testing", "Git", "Linux"]
          .filter((k) => jdLower.indexOf(k.toLowerCase()) >= 0)
          .slice(0, 3);
        set({
          savedJobs: [
            {
              company: s.jfCompany.trim(),
              role: s.jfTitle.trim(),
              meta: "Added by you · just now",
              fit,
              fitKnown: scored !== null,
              dash: scored === null ? 144 : Math.round(144 * (1 - fit / 100)),
              tone: scored === null ? "var(--faint)" : fitTone(fit),
              tags: found.length ? found : ["Manual"],
              verdict: scored === null ? (s.cvText.trim() ? "Not scored: the posting names no tech" : "Not scored: add your CV first") : fit >= 70 ? "Strong match" : fit >= 55 ? "Reach, tailor hard" : "Long shot",
              action: "Open",
              jdText: s.jfJD.trim().slice(0, MAX_JD_CHARS),
              ...(letter ? { coverLetter: letter.paras.join("\n\n") } : {}),
            },
            ...s.savedJobs,
          ],
        });
        get().emit("JobSaved", "jobs", `Saved ${s.jfTitle.trim()} at ${s.jfCompany.trim()}${scored === null ? "" : ` (fit ${fit})`}`, scored === null ? { company: s.jfCompany.trim() } : { company: s.jfCompany.trim(), fit });
      },
      analyzeJf: () => {
        const s = get();
        if (s.jfJD.trim().length < 80) return;
        const result = analyzeJobDescription(s.jfJD, s.cvText, targetKeywords(s.dirStack, s.dirRole));
        set({ jfResult: result });
        get().emit("JobMatched", "jobs", `Matched ${s.jfCompany.trim() || "a role"}, ${result.compat}% compatible`, { company: s.jfCompany.trim(), compat: result.compat });
      },
      saveListing: (job) => {
        const key = trackCardKey(job.company, job.role);
        if (get().savedJobs.some((j) => trackCardKey(j.company, j.role) === key)) return;
        set((s) => ({ savedJobs: [{ ...job, action: "Open", jdText: job.jdText?.slice(0, MAX_JD_CHARS) }, ...s.savedJobs] }));
        get().emit("JobSaved", "jobs", `Saved ${job.role} at ${job.company}${job.fitKnown === false ? "" : ` (fit ${job.fit})`}`, job.fitKnown === false ? { company: job.company } : { company: job.company, fit: job.fit });
      },
      keepCoverLetter: (letter) => {
        const text = letter.paras.join("\n\n");
        // Keyed on the posting (role + advert), so a saved role whose JD differs from
        // the one the letter was written for doesn't get it.
        set((s) => ({
          jfCoverLetter: letter,
          savedJobs: s.savedJobs.map((j) => (postingKey(j.company, j.role, j.jdText ?? "") === letter.key ? { ...j, coverLetter: text } : j)),
        }));
      },
      setUniversity: (name) => set({ university: name.trim().slice(0, 120) }),
      setTailorJD: (jd) => set({ cvTailorJD: jd, cvTailorAts: null, cvTailorMatch: null }),
      keepCvAiRead: (read, forText) => {
        // A read that lands after the CV was edited describes text that no longer
        // exists, and its skills would feed the profile. Drop it.
        if (get().cvText !== forText) return false;
        const cap = (xs: string[], n = 12) => xs.slice(0, n).map((x) => x.slice(0, 300));
        set({
          cvAiRead: {
            skills: read.skills.slice(0, 40).map((x) => x.slice(0, 60)),
            strengths: cap(read.strengths),
            nextSteps: cap(read.nextSteps),
            feedback: read.feedback.slice(0, 12).map((f) => ({ issue: f.issue.slice(0, 300), suggestedFix: f.suggestedFix.slice(0, 500) })),
          },
        });
        return true;
      },
      keepTailorResult: (kind, result, forJD) => {
        // Same guard for the Tailor panel: a result for an advert that has since changed is stale.
        if (get().cvTailorJD !== forJD) return false;
        set(kind === "ats" ? { cvTailorAts: result as TailorAts } : { cvTailorMatch: result as TailorMatch });
        return true;
      },

      // Networking progress is counted from this, so it needs a real recipient and a real
      // message: a blank form used to log "a contact" and could be clicked up to 80%.
      generateOutreach: ({ name, company, message }) => {
        const who = name.trim();
        if (!who || !message.trim()) return false;
        const s = get();
        const co = company?.trim();
        // The one door to Messaged that counts: a real message was marked as sent. If this
        // person is on the board and hasn't got further than Researched, they move with it.
        const key = netContactKey({ name: who, company: co });
        const match = s.contacts.find((c) => netContactKey(c) === key);
        const onBoard = match && (match.stage === "researched" || match.stage === "not-now") ? match : undefined;
        set({
          netGenerated: true,
          netSent: s.netSent + 1,
          ...(onBoard ? { contacts: s.contacts.map((c) => (c.id === onBoard.id ? { ...c, stage: "messaged" as const, updatedAt: Date.now() } : c)) } : {}),
        });
        get().emit(
          "RecruiterContacted",
          "networking",
          // Name-free: labels travel to the mentor, and the name must be erasable from meta alone.
          `Outreach sent${co ? ` at ${co}` : ""} (${s.netPersona})`,
          { ...(co ? { company: co } : {}), contact: who, persona: s.netPersona, ...(match ? { contactId: match.id } : {}), ...(onBoard ? { stage: "messaged" } : {}) },
        );
        return true;
      },

      // Feeds `profile.coffeeChatsDone` and so networking progress: a chat with nobody
      // is not evidence of anything.
      completeCoffeeChat: ({ contact, company, stage, contactId }) => {
        const who = contact.trim();
        if (!who || recentCoffeeChat(get().events, { contact, company })) return false;
        const co = company?.trim();
        get().emit("CoffeeChatCompleted", "networking", `Coffee chat${co ? ` at ${co}` : ""}`, { contact: who, ...(co ? { company: co } : {}), ...(stage ? { stage } : {}), ...(contactId ? { contactId } : {}) });
        return true;
      },

      /* ── contacts board ──
         Evidence rules: moving a card by hand is bookkeeping. Only "Mark as sent"
         (generateOutreach) logs RecruiterContacted, Chatted goes through the guarded
         completeCoffeeChat, and Referred is self-reported: its event feeds no progress number. */
      addContact: ({ name, company, role, howWeMet, link }) => {
        const who = name.trim().slice(0, 120);
        if (!who) return "no-name";
        const co = company.trim().slice(0, 120);
        const url = link?.trim() ? safeHttpUrl(link) : null;
        if (link?.trim() && !url) return "bad-link";
        if (get().contacts.some((c) => netContactKey(c) === netContactKey({ name: who, company: co }))) return "duplicate";
        const now = Date.now();
        const ro = role?.trim().slice(0, 120);
        const contact: Contact = {
          id: newContactId(), name: who, company: co, ...(ro ? { role: ro } : {}),
          howWeMet: HOW_WE_MET.includes(howWeMet) ? howWeMet : "other", ...(url ? { link: url } : {}),
          stage: "researched", notes: "", createdAt: now, updatedAt: now,
        };
        set((st) => ({ contacts: [contact, ...st.contacts] }));
        return "added";
      },
      addContacts: (inputs) => {
        const seen = new Set(get().contacts.map((c) => netContactKey(c)));
        const room = Math.max(0, MAX_CONTACTS - get().contacts.length);
        const now = Date.now();
        const fresh: Contact[] = [];
        for (const i of inputs) {
          const who = i.name.trim().slice(0, 120);
          const co = i.company.trim().slice(0, 120);
          const key = netContactKey({ name: who, company: co });
          if (!who || seen.has(key) || fresh.length >= room) continue;
          seen.add(key);
          const ro = i.role?.trim().slice(0, 120);
          fresh.push({
            id: newContactId(), name: who, company: co, ...(ro ? { role: ro } : {}),
            howWeMet: HOW_WE_MET.includes(i.howWeMet) ? i.howWeMet : "other",
            stage: "researched", notes: "", createdAt: now, updatedAt: now,
          });
        }
        if (fresh.length) set((st) => ({ contacts: [...fresh, ...st.contacts] }));
        return { added: fresh.length, skipped: inputs.length - fresh.length };
      },
      updateContact: (id, patch) => {
        const cur = get().contacts.find((c) => c.id === id);
        if (!cur) return;
        const name = patch.name !== undefined ? patch.name.trim().slice(0, 120) : cur.name;
        const company = patch.company !== undefined ? patch.company.trim().slice(0, 120) : cur.company;
        const identityOk =
          !!name && (netContactKey({ name, company }) === netContactKey(cur) || !get().contacts.some((c) => c.id !== id && netContactKey(c) === netContactKey({ name, company })));
        const role = patch.role !== undefined ? patch.role.trim().slice(0, 120) : cur.role;
        const linkRaw = patch.link !== undefined ? patch.link.trim() : cur.link;
        const linkOk = linkRaw === undefined || linkRaw === "" || !!safeHttpUrl(linkRaw);
        const next: Contact = {
          ...cur,
          name: identityOk ? name : cur.name,
          company: identityOk ? company : cur.company,
          howWeMet: patch.howWeMet !== undefined && HOW_WE_MET.includes(patch.howWeMet) ? patch.howWeMet : cur.howWeMet,
          notes: patch.notes !== undefined ? patch.notes.slice(0, 4000) : cur.notes,
          updatedAt: Date.now(),
        };
        if (role) next.role = role; else delete next.role;
        const url = linkOk ? (linkRaw ? safeHttpUrl(linkRaw) : null) : (cur.link ?? null);
        if (url) next.link = url; else delete next.link;
        if (JSON.stringify({ ...next, updatedAt: 0 }) === JSON.stringify({ ...cur, updatedAt: 0 })) return;
        // A rename follows through to the working contact, so "Mark as sent" still finds the card.
        const working = get().netContact;
        const renamed = netContactKey(working) === netContactKey(cur);
        set((st) => ({
          contacts: st.contacts.map((c) => (c.id === id ? next : c)),
          ...(renamed ? { netContact: { ...working, name: next.name, company: next.company } } : {}),
        }));
      },
      moveContact: (id, stage) => {
        const cur = get().contacts.find((c) => c.id === id);
        if (!cur || cur.stage === stage) return;
        set((st) => ({ contacts: st.contacts.map((c) => (c.id === id ? { ...c, stage, updatedAt: Date.now() } : c)) }));
        const meta = { contact: cur.name, company: cur.company, stage, contactId: id };
        if (stage === "referred") {
          get().emit("ReferralReceived", "networking", `Referral received${cur.company ? ` at ${cur.company}` : ""} (self-reported)`, meta);
        } else if (
          // One chat per contact from the board, however often they are moved back and forth
          // or renamed; the 24-hour name guard inside completeCoffeeChat still applies too.
          stage === "chatted" &&
          !get().events.some((e) => e.type === "CoffeeChatCompleted" && e.meta?.contactId === id) &&
          get().completeCoffeeChat({ contact: cur.name, company: cur.company, stage, contactId: id })
        ) {
          // CoffeeChatCompleted is this move's event.
        } else {
          // Names stay out of the label: labels travel to the mentor as recent activity.
          get().emit("ContactStageChanged", "networking", `Moved a contact to ${CONTACT_STAGE_LABEL[stage]}`, meta);
        }
      },
      setContactFollowUp: (id, day) => {
        const when = validDay(day) ? day : undefined;
        set((st) => ({
          contacts: st.contacts.map((c) => {
            if (c.id !== id) return c;
            const next: Contact = { ...c, updatedAt: Date.now() };
            if (when) next.followUpOn = when; else delete next.followUpOn;
            return next;
          }),
        }));
      },
      keepContact: (id) =>
        set((st) => ({ contacts: st.contacts.map((c) => (c.id === id ? { ...c, updatedAt: Date.now() } : c)) })),
      removeContact: (id) => {
        const cur = get().contacts.find((c) => c.id === id);
        if (!cur) return;
        const key = netContactKey(cur);
        set((st) => ({
          ...(netContactKey(st.netContact) === key ? NO_WORKING_CONTACT : {}),
          contacts: st.contacts.filter((c) => c.id !== id),
          contactDetail: st.contactDetail === id ? null : st.contactDetail,
          // Bookkeeping events go; evidence events stay as anonymous counts (see scrubPeople).
          events: scrubPeople(st.events, [cur]),
        }));
      },
      clearContacts: () =>
        set((st) => ({
          ...(st.contacts.some((c) => netContactKey(c) === netContactKey(st.netContact)) ? NO_WORKING_CONTACT : {}),
          contacts: [],
          contactDetail: null,
          events: scrubPeople(st.events, st.contacts),
        })),
      selectContact: (id) => {
        const c = get().contacts.find((x) => x.id === id);
        if (!c) return;
        const cur = get().netContact;
        // Pasted profile text belongs to the person it was pasted for.
        const same = netContactKey(cur) === netContactKey(c);
        set({ netContact: { name: c.name, company: c.company, about: same ? cur.about : "", experience: same ? cur.experience : "" } });
      },

      toggleProblem: (slug) => {
        const problem = LEETCODE_PROBLEMS.find((p) => p.slug === slug);
        if (!problem) return;
        const wasSolved = !!get().ivProblems[slug];

        set((s) => {
          const ivProblems = { ...s.ivProblems };
          if (wasSolved) delete ivProblems[slug];
          else ivProblems[slug] = true;

          // `ivSolved` is a pure projection of `ivProblems`, recomputed rather
          // than incremented so the per-category counts can never drift from
          // the ticked problems. Recomputing every category also retires the
          // legacy counts that were logged against the five invented patterns.
          const ivSolved: Record<string, number> = {};
          for (const c of LEETCODE_CATEGORIES) {
            ivSolved[c.name] = c.problems.filter((p) => ivProblems[p.slug]).length;
          }
          return { ivProblems, ivSolved };
        });

        // Only solving is an event. Un-ticking is a correction to the log, not
        // an achievement to record.
        if (!wasSolved) {
          const category = categoryOf(slug) ?? "LeetCode";
          get().emit("LeetCodeSolved", "interview", `Solved ${problem.name} (${category})`, {
            slug,
            pattern: category,
            difficulty: problem.difficulty,
          });
        }
      },
      saveFeedback: () => {
        const s = get();
        if (!(s.fbCompany.trim() && s.fbRating)) return;
        get().emit("InterviewCompleted", "interview", `Logged interview reflection · ${s.fbCompany.trim()} (${s.fbRating}★)`, { company: s.fbCompany.trim(), rating: s.fbRating });
        set({
          ivFeedback: [
            {
              company: s.fbCompany.trim(),
              rating: s.fbRating,
              note: s.fbNote.trim() || "No reflections logged.",
              date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            },
            ...s.ivFeedback,
          ],
          fbCompany: "",
          fbRating: 0,
          fbNote: "",
        });
      },

      saveStory: (story) => {
        const beats = [story.situation, story.task, story.action, story.result].map((b) => b.trim());
        if (beats.some((b) => !b)) return false;
        const [situation, task, action, result] = beats;
        const title = story.title.trim() || situation.slice(0, 60);
        const learnings = story.learnings?.trim();
        const saved: SavedStory = { id: nextEventId(), title, situation, task, action, result, ...(learnings ? { learnings } : {}), savedAt: Date.now() };
        set((s) => ({ savedStories: [saved, ...s.savedStories] }));
        get().emit("StoryPrepared", "interview", `Prepared a STAR story · ${title}`, { title });
        return true;
      },
      deleteStory: (id) => set((s) => ({ savedStories: s.savedStories.filter((x) => x.id !== id) })),
      saveBriefing: (briefing) =>
        set((s) => ({ ivBriefings: { ...s.ivBriefings, [briefing.company.trim().toLowerCase()]: { ...briefing, at: Date.now() } } })),

      moveCard: (key, toId) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        if (columnOf(get().board, key) === toId) return;
        set((s) => {
          const { board, moved } = stripCard(s.board, key);
          if (!moved) return {};
          const stamped = stampCard(moved, toId);
          return { board: board.map((col) => (col.id === toId ? { ...col, cards: [stamped, ...col.cards] } : col)) };
        });
        if (!card) return;
        const ev = toId === "applied" && card.appliedDate ? undefined : COLUMN_EVENT[toId];
        if (ev) get().emit(ev.type, "tracker", ev.label(card.company), { company: card.company, role: card.role, to: toId });
      },
      moveCardBefore: (key, targetKey) => {
        const from = columnOf(get().board, key);
        const to = columnOf(get().board, targetKey);
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        set((s) => {
          if (key === targetKey) return {};
          const { board, moved } = stripCard(s.board, key);
          if (!moved) return {};
          let placed = false;
          const nb = board.map((col) => {
            const idx = col.cards.findIndex((c) => c.key === targetKey);
            if (idx < 0) return col;
            placed = true;
            const cards = [...col.cards];
            cards.splice(idx, 0, col.id === from ? moved! : stampCard(moved!, col.id));
            return { ...col, cards };
          });
          return placed ? { board: nb } : {};
        });
        // Dropping onto a card in another column is a move like any other, and logs like one.
        const ev = to && to !== from && !(to === "applied" && card?.appliedDate) ? COLUMN_EVENT[to] : undefined;
        if (card && ev) get().emit(ev.type, "tracker", ev.label(card.company), { company: card.company, role: card.role, to: to! });
      },
      advanceCard: (key) => {
        const s0 = get();
        const colIdx0 = s0.board.findIndex((col) => col.cards.some((c) => c.key === key));
        const card = s0.board.flatMap((c) => c.cards).find((c) => c.key === key);
        set((s) => {
          const colIdx = s.board.findIndex((col) => col.cards.some((c) => c.key === key));
          if (colIdx < 0 || colIdx >= 3) return {};
          const advTag = [
            { tag: "ATS ✓", when: "today" },
            { tag: "scheduled", when: "prep now" },
            { tag: "offer", when: "decide" },
          ][colIdx];
          const { board, moved } = stripCard(s.board, key);
          if (!moved) return {};
          const stamped = colIdx === 0 ? stampCard(moved, "applied") : { ...moved, ...advTag, movedAt: Date.now(), reachedInterview: true };
          return { board: board.map((col, i) => (i === colIdx + 1 ? { ...col, cards: [stamped, ...col.cards] } : col)) };
        });
        if (!card || colIdx0 < 0 || colIdx0 >= 3) return;
        const ev = COLUMN_EVENT[(["applied", "interview", "offer"] as const)[colIdx0]];
        if (ev) get().emit(ev.type, "tracker", ev.label(card.company), { company: card.company, role: card.role });
      },
      removeCard: (key) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        set((s) => ({
          appDetail: null,
          board: s.board.map((col) => ({ ...col, cards: col.cards.filter((c) => c.key !== key) })),
        }));
        if (card) get().emit("ApplicationAdvanced", "tracker", `Removed ${card.role} at ${card.company} from the tracker`, { company: card.company, removed: true });
      },
      setRemind: (key, value) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        set((s) => ({
          board: s.board.map((col) => ({
            ...col,
            cards: col.cards.map((c) => (c.key === key ? { ...c, remind: value } : c)),
          })),
        }));
        if (card && value) get().emit("ApplicationAdvanced", "tracker", `Reminder set · ${card.company} (${value})`, { company: card.company, remind: value });
      },
      setCardDate: (key, field, value) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        set((s) => ({
          board: s.board.map((col) => ({
            ...col,
            cards: col.cards.map((c) => (c.key === key ? { ...c, [field]: value || undefined } : c)),
          })),
        }));
        if (card && value) get().emit("ApplicationAdvanced", "tracker", `${field === "opens" ? "Opening" : "Deadline"} date · ${card.company} (${value})`, { company: card.company, [field]: value });
      },
      setDiag: (key, timing) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        set((s) => ({ diags: { ...s.diags, [key]: timing } }));
        get().emit("RejectionDiagnosed", "tracker", `Diagnosed rejection · ${card?.company ?? key} (${timing})`, { company: card?.company ?? key, timing });
      },
      trackJob: (job) => {
        // Keyed by company and role, so two roles at one company are two cards. Older cards
        // were keyed by company alone, hence the field comparison as well as the key.
        const slug = trackCardKey(job.company, job.role);
        if (get().board.some((col) => col.cards.some((c) => c.key === slug || trackCardKey(c.company, c.role) === slug))) return;
        set((s) => ({
          board: s.board.map((col, i) =>
            i === 0
              ? {
                  ...col,
                  cards: [
                    { key: slug, company: job.company, role: job.role, tag: job.fit === null ? "saved" : "fit " + job.fit, tone: job.tone, when: "new", ...(job.fit === null ? {} : { match: job.fit }), note: "Tracked from Opportunity Discovery. Tailor the CV before applying." },
                    ...col.cards,
                  ],
                }
              : col,
          ),
        }));
        get().emit("JobSaved", "jobs", `Tracking ${job.role} at ${job.company}${job.fit === null ? "" : ` (fit ${job.fit})`}`, job.fit === null ? { company: job.company } : { company: job.company, fit: job.fit });
      },
      addCard: ({ company, role, column, link, appliedOn }) => {
        const co = company.trim();
        const ro = role.trim();
        if (!co || !ro) return false;
        const key = trackCardKey(co, ro);
        if (get().board.some((col) => col.cards.some((c) => c.key === key || trackCardKey(c.company, c.role) === key))) return false;
        // Only http(s) links are kept: the drawer renders this as an <a href>.
        const url = link?.trim() && /^https?:\/\//i.test(link.trim()) ? link.trim() : undefined;
        const base: BoardCard = { key, company: co, role: ro, tag: "added", tone: "var(--muted)", when: "new", note: "", ...(url ? { link: url } : {}) };
        let card = column === "saved" ? base : stampCard(base, column);
        // Anything past Saved was applied to. Back-filled applications keep the date the
        // student gives, so last month's applications don't count toward this week.
        if (column !== "saved") {
          // Clamped to now: an application can't have been sent in the future.
          const parsed = appliedOn ? new Date(appliedOn + "T00:00:00").getTime() : NaN;
          card = { ...card, appliedDate: Number.isFinite(parsed) ? Math.min(parsed, Date.now()) : Date.now() };
        }
        set((s) => ({ board: s.board.map((col) => (col.id === column ? { ...col, cards: [card, ...col.cards] } : col)) }));
        const ev = COLUMN_EVENT[column];
        if (ev) get().emit(ev.type, "tracker", ev.label(co), { company: co, role: ro, to: column, added: true });
        else get().emit("JobSaved", "tracker", `Tracking ${ro} at ${co}`, { company: co, role: ro, added: true });
        return true;
      },
      setCardNote: (key, note) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        if (!card || card.note === note) return;
        // No event: a note is bookkeeping, not progress.
        set((s) => ({
          board: s.board.map((col) => ({ ...col, cards: col.cards.map((c) => (c.key === key ? { ...c, note } : c)) })),
        }));
      },
      markFollowedUp: (key) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        if (!card) return;
        const now = Date.now();
        set((s) => ({
          board: s.board.map((col) => ({ ...col, cards: col.cards.map((c) => (c.key === key ? { ...c, followedUpAt: now } : c)) })),
        }));
        get().emit("ApplicationAdvanced", "tracker", `Followed up · ${card.role} at ${card.company}`, { company: card.company, role: card.role, followedUp: true });
      },
    }),
    {
      name: "pathfinder-redesign-v1",
      // SSR renders the default state; rehydrate after mount (see AppChrome)
      // so the first client render matches the server HTML.
      skipHydration: true,
      partialize: (s) => ({
        collapsed: s.collapsed,
        onb: s.onb,
        onbDone: s.onbDone,
        dirMode: s.dirMode,
        dirRole: s.dirRole,
        dirStack: s.dirStack,
        dirIndustry: s.dirIndustry,
        dirSize: s.dirSize,
        dirSetting: s.dirSetting,
        dirGenerated: s.dirGenerated,
        dirStatementAi: s.dirStatementAi,
        dirTargetRoles: s.dirTargetRoles,
        chat: s.chat,
        chatN: s.chatN,
        asstMsgs: s.asstMsgs,
        university: s.university,
        cvText: s.cvText,
        cvAnalyzed: s.cvAnalyzed,
        cvProjects: s.cvProjects,
        cvLinkedIn: s.cvLinkedIn,
        cvAiRead: s.cvAiRead,
        cvTailorJD: s.cvTailorJD,
        cvTailorAts: s.cvTailorAts,
        cvTailorMatch: s.cvTailorMatch,
        jfCoverLetter: s.jfCoverLetter,
        jfTitle: s.jfTitle,
        jfCompany: s.jfCompany,
        jfJD: s.jfJD,
        jfResult: s.jfResult,
        savedJobs: s.savedJobs,
        netPersona: s.netPersona,
        netSent: s.netSent,
        netGenerated: s.netGenerated,
        netContact: s.netContact,
        netResearch: s.netResearch,
        netDraft: s.netDraft,
        contacts: s.contacts,
        contactsSeeded: s.contactsSeeded,
        ivTab: s.ivTab,
        ivSolved: s.ivSolved,
        ivProblems: s.ivProblems,
        ivFeedback: s.ivFeedback,
        savedStories: s.savedStories,
        ivBriefings: s.ivBriefings,
        diags: s.diags,
        board: s.board,
        events: s.events,
        aiLog: s.aiLog,
        cvScores: s.cvScores,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PfState>;
        // Migrate stored boards: keep stored cards for known columns, append
        // any new default columns added since the data was saved.
        let board = current.board;
        if (Array.isArray(p.board)) {
          board = current.board.map((def) => {
            const stored = (p.board as BoardColumn[]).find((c) => c.id === def.id);
            return stored ? { ...def, ...stored } : def;
          });
        }
        // `ivSolved` is a projection of `ivProblems`. Recompute it on load so counts saved under
        // an older problem list can't outlive the list they were counted against.
        const ivProblems = p.ivProblems ?? current.ivProblems;
        const ivSolved: Record<string, number> = {};
        for (const c of LEETCODE_CATEGORIES) ivSolved[c.name] = c.problems.filter((x) => ivProblems[x.slug]).length;
        const diags = p.diags ? migrateDiags(p.diags) : current.diags;
        // Contacts: sanitised (they may come from a synced snapshot). The single working
        // contact from before the board existed becomes one Researched contact, so
        // nobody loses the person they were working on.
        const contacts = sanitizeContacts(p.contacts);
        const working = p.netContact;
        if (p.contactsSeeded !== true && working?.name?.trim() && !contacts.some((c) => netContactKey(c) === netContactKey(working))) {
          const now = Date.now();
          contacts.unshift({ id: newContactId(), name: working.name.trim(), company: (working.company ?? "").trim(), howWeMet: "other", stage: "researched", notes: "", createdAt: now, updatedAt: now });
        }
        // Direction values saved before the shared taxonomy move onto the current labels.
        return { ...current, ...p, ...migrateDirection(p), board, ivProblems, ivSolved, diags, contacts, contactsSeeded: true, contactDetail: null, university: typeof p.university === "string" ? p.university.trim().slice(0, 120) : "" };
      },
    },
  ),
);

/* ── Career-OS selectors ─────────────────────────────────────────────
   These derive the profile / progress / recommendations from live store
   state on every render, so every surface stays in sync automatically. */

/** Structural projection of the store into the profile's input shape. */
function toProfileInput(s: PfState): ProfileInput {
  return {
    onb: s.onb, onbDone: s.onbDone,
    dirRole: s.dirRole, dirStack: s.dirStack, dirIndustry: s.dirIndustry, dirSize: s.dirSize, dirSetting: s.dirSetting, dirGenerated: s.dirGenerated, dirStatementAi: s.dirStatementAi,
    chat: s.chat,
    cvText: s.cvText, cvAnalyzed: s.cvAnalyzed, cvProjects: s.cvProjects, cvLinkedIn: s.cvLinkedIn, cvScores: s.cvScores,
    cvAiSkills: s.cvAiRead?.skills,
    savedJobs: s.savedJobs,
    contacts: s.contacts,
    netPersona: s.netPersona, netSent: s.netSent, netGenerated: s.netGenerated,
    ivSolved: s.ivSolved, ivFeedback: s.ivFeedback, savedStories: s.savedStories,
    board: s.board, diags: s.diags, events: s.events,
  };
}

/** The live Career Profile — recomputed from store state on every change.
 *  Memoised on the state identity so the derived object is stable between
 *  unrelated renders (avoids the useSyncExternalStore snapshot loop). */
export function useProfile(): CareerProfile {
  const state = usePfStore();
  return useMemo(() => deriveProfile(toProfileInput(state)), [state]);
}

/** The dynamic progress report (per-phase % + overall readiness). */
export function useProgress(): ProgressReport {
  const profile = useProfile();
  return useMemo(() => computeProgress(profile), [profile]);
}

/** Ranked recommendations from the whole profile. */
export function useRecommendations(): Recommendation[] {
  const profile = useProfile();
  const progress = useProgress();
  return useMemo(() => recommend(profile, progress), [profile, progress]);
}

/** Non-hook accessors for imperative code (event handlers, orchestrator). */
export function getProfile(): CareerProfile {
  return deriveProfile(toProfileInput(usePfStore.getState()));
}
export function getProgress(): ProgressReport {
  return computeProgress(getProfile());
}

/** Sidebar readiness — the live overall progress, matching the Command Centre. */
export function useSidebarReadiness(): number {
  const progress = useProgress();
  return progress.overall;
}
