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
  ONB_TO_DIR_INDUSTRY,
  ONB_TO_DIR_ROLE,
  ONB_TO_DIR_SIZE,
  type BoardCard,
  type BoardColumn,
  type OutreachPersona,
} from "./data";
import {
  analyzeCvText,
  analyzeJobDescription,
  chatReplyFor,
  extractChatPatch,
  fitTone,
  readinessFrom,
  roleFit,
  trackCardKey,
  targetKeywords,
  type JfResult,
  type OnbState,
} from "./logic";
import { categoryOf, LEETCODE_CATEGORIES, LEETCODE_PROBLEMS } from "./leetcode";
import { makeEvent, type PfEvent, type PfEventType, type PfPhase } from "./events";
import { deriveProfile, type CareerProfile, type ProfileInput } from "./profile";
import { computeProgress, type ProgressReport } from "./progress";
import { recommend, type Recommendation } from "./recommendations";
import type { AiInteraction } from "./orchestrator";

export interface ChatMsg { who: "you" | "ai"; text: string }
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
}

export interface InterviewFeedback { company: string; rating: number; note: string; date: string }

interface PfState {
  /* shell */
  collapsed: boolean;
  paletteOpen: boolean;
  paletteQ: string;
  jobDetail: string | null; // company name
  appDetail: string | null; // board card key

  /* onboarding */
  onb: OnbState;
  onbDone: boolean;
  onbScanning: boolean;

  /* direction */
  dirMode: "wizard" | "explore";
  dirRole: string | null;
  dirStack: string[];
  dirIndustry: string | null;
  dirSize: string | null;
  dirSetting: string | null;
  dirGenerating: boolean;
  dirGenerated: boolean;
  copiedVariant: string | null;
  chat: ChatMsg[];
  chatDraft: string;
  chatN: number;

  /* mentor assistant — advisory only, kept separate from the Direction page's
     scripted `chat` above. It reads the profile; it never writes to it. */
  asstOpen: boolean;
  asstMsgs: AsstMsg[];
  asstDraft: string;

  /* cv */
  cvText: string;
  cvAnalyzing: boolean;
  cvAnalyzed: boolean;
  cvProjects: boolean;
  cvLinkedIn: boolean;

  /* jobs */
  jfTitle: string;
  jfCompany: string;
  jfJD: string;
  jfAnalyzing: boolean;
  jfResult: JfResult | null;
  jfLetter: boolean;
  savedJobs: SavedJob[];

  /* networking */
  netPersona: OutreachPersona;
  netSent: number;
  netGenerated: boolean;
  netFollow: boolean;

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
  openJob: (company: string) => void;
  openApp: (key: string) => void;

  setOnb: (patch: Partial<OnbState>) => void;
  startOnbScan: () => void;
  finishOnb: () => void;
  readiness: () => number;

  pickDirChip: (key: "dirRole" | "dirIndustry" | "dirSize" | "dirSetting", value: string) => void;
  toggleDirStack: (value: string) => void;
  generateDirection: () => void;
  copyVariant: (v: string) => void;
  sendChat: () => void;
  acceptChat: () => void;

  analyzeCv: () => void;
  reAnalyzeCv: () => void;

  saveJfJob: () => void;
  analyzeJf: () => void;

  /** Log a sent message. Returns false (and logs nothing) without a real recipient and message. */
  generateOutreach: (contact: { name: string; company?: string; message: string }) => boolean;

  /** Mark a problem solved, or un-mark it if it already was. */
  toggleProblem: (slug: string) => void;
  saveFeedback: () => void;

  moveCard: (key: string, toId: BoardColumn["id"]) => void;
  moveCardBefore: (key: string, targetKey: string) => void;
  advanceCard: (key: string) => void;
  removeCard: (key: string) => void;
  setRemind: (key: string, value: string) => void;
  setCardDate: (key: string, field: "opens" | "deadline", value: string) => void;
  setDiag: (key: string, timing: string) => void;
  trackJob: (job: { company: string; role: string; fit: number | null; tone: string }) => void;
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
      onbScanning: false,

      dirMode: "wizard",
      dirRole: null,
      dirStack: [],
      dirIndustry: null,
      dirSize: null,
      dirSetting: null,
      dirGenerating: false,
      dirGenerated: false,
      copiedVariant: null,
      chat: [],
      chatDraft: "",
      chatN: 0,

      asstOpen: false,
      asstMsgs: [],
      asstDraft: "",

      cvText: "",
      cvAnalyzing: false,
      cvAnalyzed: false,
      cvProjects: false,
      cvLinkedIn: false,

      jfTitle: "",
      jfCompany: "",
      jfJD: "",
      jfAnalyzing: false,
      jfResult: null,
      jfLetter: false,
      savedJobs: [],

      netPersona: "Recruiter",
      netSent: 0,
      netGenerated: false,
      netFollow: false,

      ivTab: "leetcode",
      ivSolved: {},
      ivProblems: {},
      fbCompany: "",
      fbRating: 0,
      fbNote: "",
      ivFeedback: [],

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
      closeDrawers: () => set({ jobDetail: null, appDetail: null }),
      openJob: (company) => set({ jobDetail: company, appDetail: null }),
      openApp: (key) => set({ appDetail: key, jobDetail: null }),

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
        const role = ONB_TO_DIR_ROLE[onb.role ?? ""] ?? null;
        const industry = ONB_TO_DIR_INDUSTRY[onb.industry ?? ""] ?? null;
        const size = ONB_TO_DIR_SIZE[onb.stage ?? ""] ?? null;

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

      pickDirChip: (key, value) => set({ [key]: value, dirGenerated: false } as Partial<PfState>),
      toggleDirStack: (value) =>
        set((s) => ({
          dirStack: s.dirStack.includes(value) ? s.dirStack.filter((x) => x !== value) : [...s.dirStack, value],
          dirGenerated: false,
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
      sendChat: () => {
        const s = get();
        const t = s.chatDraft.trim();
        if (!t) return;
        const patch = extractChatPatch(t);
        const reply = chatReplyFor(s.chatN);
        set({
          ...(patch as Partial<PfState>),
          chat: [...s.chat, { who: "you", text: t }, { who: "ai", text: reply }],
          chatDraft: "",
          chatN: s.chatN + 1,
        });
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
        const analysis = analyzeCvText(s.cvText, s.dirStack);
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
              action: "Analyze",
              jdText: s.jfJD.trim(),
            },
            ...s.savedJobs,
          ],
        });
        get().emit("JobSaved", "jobs", `Saved ${s.jfTitle.trim()} at ${s.jfCompany.trim()}${scored === null ? "" : ` (fit ${fit})`}`, scored === null ? { company: s.jfCompany.trim() } : { company: s.jfCompany.trim(), fit });
      },
      analyzeJf: () => {
        const s = get();
        if (s.jfJD.trim().length < 80) return;
        const result = analyzeJobDescription(s.jfJD, s.cvText, targetKeywords(s.dirStack));
        set({ jfResult: result });
        get().emit("JobMatched", "jobs", `Matched ${s.jfCompany.trim() || "a role"}, ${result.compat}% compatible`, { company: s.jfCompany.trim(), compat: result.compat });
      },

      // Networking progress is counted from this, so it needs a real recipient and a real
      // message: a blank form used to log "a contact" and could be clicked up to 80%.
      generateOutreach: ({ name, company, message }) => {
        const who = name.trim();
        if (!who || !message.trim()) return false;
        const s = get();
        const co = company?.trim();
        set({ netGenerated: true, netSent: s.netSent + 1 });
        get().emit("RecruiterContacted", "networking", `Outreach sent to ${who}${co ? ` at ${co}` : ""} (${s.netPersona})`, co ? { company: co, contact: who, persona: s.netPersona } : { contact: who, persona: s.netPersona });
        return true;
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
        const ev = COLUMN_EVENT[toId];
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
        const ev = to && to !== from ? COLUMN_EVENT[to] : undefined;
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
        chat: s.chat,
        chatN: s.chatN,
        asstMsgs: s.asstMsgs,
        cvText: s.cvText,
        cvAnalyzed: s.cvAnalyzed,
        cvProjects: s.cvProjects,
        cvLinkedIn: s.cvLinkedIn,
        jfTitle: s.jfTitle,
        jfCompany: s.jfCompany,
        jfJD: s.jfJD,
        jfResult: s.jfResult,
        savedJobs: s.savedJobs,
        netPersona: s.netPersona,
        netSent: s.netSent,
        netGenerated: s.netGenerated,
        ivTab: s.ivTab,
        ivSolved: s.ivSolved,
        ivProblems: s.ivProblems,
        ivFeedback: s.ivFeedback,
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
        return { ...current, ...p, board, ivProblems, ivSolved };
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
    dirRole: s.dirRole, dirStack: s.dirStack, dirIndustry: s.dirIndustry, dirSize: s.dirSize, dirSetting: s.dirSetting, dirGenerated: s.dirGenerated,
    chat: s.chat,
    cvText: s.cvText, cvAnalyzed: s.cvAnalyzed, cvProjects: s.cvProjects, cvLinkedIn: s.cvLinkedIn, cvScores: s.cvScores,
    savedJobs: s.savedJobs,
    netPersona: s.netPersona, netSent: s.netSent, netGenerated: s.netGenerated,
    ivSolved: s.ivSolved, ivFeedback: s.ivFeedback,
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
