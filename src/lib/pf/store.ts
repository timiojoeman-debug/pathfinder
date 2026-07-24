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
  OUTREACH_MESSAGES,
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

/** Company name out of an outreach recipient line ("Priya · Recruiter, Skyscanner"). */
function companyFromRecipient(to: string): string {
  const parts = to.split(", ");
  return parts.length > 1 ? parts[parts.length - 1] : to;
}

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

  generateOutreach: () => void;

  /** Mark a problem solved, or un-mark it if it already was. */
  toggleProblem: (slug: string) => void;
  saveFeedback: () => void;

  moveCard: (key: string, toId: BoardColumn["id"]) => void;
  moveCardBefore: (key: string, targetKey: string) => void;
  advanceCard: (key: string) => void;
  removeCard: (key: string) => void;
  setRemind: (key: string, value: string) => void;
  setDiag: (key: string, timing: string) => void;
  trackJob: (job: { company: string; role: string; fit: number; tone: string }) => void;
}

/** Stamp a card as it lands in a new column. */
function stampCard(card: BoardCard, toId: BoardColumn["id"]): BoardCard {
  if (toId === "applied" && !card.appliedDate) return { ...card, appliedDate: Date.now(), tag: "ATS ✓", when: "today" };
  if (toId === "interview") return { ...card, tag: "scheduled", when: "prep now" };
  if (toId === "offer") return { ...card, tag: "offer", when: "decide" };
  if (toId === "rejected") return { ...card, tag: "rejected", tone: "var(--risk)", when: "today", rejected: true };
  return card;
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
        set({ onbScanning: true });
        setTimeout(() => set((s) => ({ onbScanning: false, onb: { ...s.onb, step: 3 } })), 1300);
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
        set({ dirGenerating: true });
        setTimeout(() => {
          set({ dirGenerating: false, dirGenerated: true });
          get().emit("CareerDirectionUpdated", "direction", `Direction set: ${s.dirRole} in ${s.dirIndustry}`, { role: s.dirRole!, industry: s.dirIndustry! });
        }, 900);
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
      acceptChat: () => {
        set((s) => ({ dirMode: "wizard", dirGenerated: true, dirSize: s.dirSize || "Startups 0–50" }));
        const s = get();
        get().emit("CareerDirectionUpdated", "direction", `Direction drafted from AI chat: ${s.dirRole ?? "role"}`, s.dirRole ? { role: s.dirRole } : undefined);
      },

      analyzeCv: () => {
        const s0 = get();
        if (s0.cvText.trim().length < 60) return;
        set({ cvAnalyzing: true });
        setTimeout(() => {
          const s = get();
          const analysis = analyzeCvText(s.cvText, s.dirStack);
          const prev = s.cvScores.length ? s.cvScores[s.cvScores.length - 1] : null;
          const label = prev !== null && prev !== analysis.score
            ? `ATS score ${prev} → ${analysis.score}`
            : `CV analyzed — ATS ${analysis.score}`;
          set({ cvAnalyzing: false, cvAnalyzed: true, cvScores: [...s.cvScores, analysis.score] });
          get().emit("CVAnalyzed", "cv", label, { score: analysis.score, vague: analysis.vague.length, missing: analysis.missing.length });
        }, 1400);
      },
      reAnalyzeCv: () => set({ cvAnalyzed: false, cvProjects: false }),

      saveJfJob: () => {
        const s = get();
        if (!(s.jfTitle.trim() && s.jfCompany.trim())) return;
        const fit = roleFit(s.jfJD, s.onbDone ? readinessFrom(s.onb) : 74, s.cvText, targetKeywords(s.dirStack));
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
              dash: Math.round(144 * (1 - fit / 100)),
              tone: fitTone(fit),
              tags: found.length ? found : ["Manual"],
              verdict: fit >= 70 ? "Strong match" : fit >= 55 ? "Reach — tailor hard" : "Long shot",
              action: "Analyze",
              jdText: s.jfJD.trim(),
            },
            ...s.savedJobs,
          ],
        });
        get().emit("JobSaved", "jobs", `Saved ${s.jfTitle.trim()} at ${s.jfCompany.trim()} (fit ${fit})`, { company: s.jfCompany.trim(), fit });
      },
      analyzeJf: () => {
        const s = get();
        if (s.jfJD.trim().length < 80) return;
        set({ jfAnalyzing: true });
        setTimeout(() => {
          const st = get();
          const result = analyzeJobDescription(st.jfJD, st.cvText, targetKeywords(st.dirStack));
          set({ jfAnalyzing: false, jfResult: result });
          get().emit("JobMatched", "jobs", `Matched ${st.jfCompany.trim() || "a role"} — ${result.compat}% compatible`, { company: st.jfCompany.trim(), compat: result.compat });
        }, 1500);
      },

      generateOutreach: () => {
        const s = get();
        const company = companyFromRecipient(OUTREACH_MESSAGES[s.netPersona].to);
        set({ netGenerated: true, netSent: s.netSent + 1 });
        get().emit("RecruiterContacted", "networking", `Outreach sent to ${company} (${s.netPersona})`, { company, persona: s.netPersona });
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
        set((s) => {
          const { board, moved } = stripCard(s.board, key);
          if (!moved) return {};
          const stamped = stampCard(moved, toId);
          return { board: board.map((col) => (col.id === toId ? { ...col, cards: [stamped, ...col.cards] } : col)) };
        });
        if (!card) return;
        const co = card.company;
        if (toId === "applied") get().emit("ApplicationSubmitted", "tracker", `Applied to ${co}`, { company: co });
        else if (toId === "interview") get().emit("InterviewScheduled", "tracker", `Interview stage · ${co}`, { company: co });
        else if (toId === "offer") get().emit("OfferReceived", "tracker", `Offer from ${co} 🎉`, { company: co });
      },
      moveCardBefore: (key, targetKey) =>
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
            cards.splice(idx, 0, stampCard(moved!, col.id));
            return { ...col, cards };
          });
          return placed ? { board: nb } : {};
        }),
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
          const stamped = colIdx === 0 ? stampCard(moved, "applied") : { ...moved, ...advTag };
          return { board: board.map((col, i) => (i === colIdx + 1 ? { ...col, cards: [stamped, ...col.cards] } : col)) };
        });
        if (!card || colIdx0 < 0 || colIdx0 >= 3) return;
        const co = card.company;
        const targetId = ["applied", "interview", "offer"][colIdx0];
        if (targetId === "applied") get().emit("ApplicationSubmitted", "tracker", `Applied to ${co}`, { company: co });
        else if (targetId === "interview") get().emit("InterviewScheduled", "tracker", `Interview stage · ${co}`, { company: co });
        else if (targetId === "offer") get().emit("OfferReceived", "tracker", `Offer from ${co} 🎉`, { company: co });
      },
      removeCard: (key) =>
        set((s) => ({
          appDetail: null,
          board: s.board.map((col) => ({ ...col, cards: col.cards.filter((c) => c.key !== key) })),
        })),
      setRemind: (key, value) =>
        set((s) => ({
          board: s.board.map((col) => ({
            ...col,
            cards: col.cards.map((c) => (c.key === key ? { ...c, remind: value } : c)),
          })),
        })),
      setDiag: (key, timing) => {
        const card = get().board.flatMap((c) => c.cards).find((c) => c.key === key);
        set((s) => ({ diags: { ...s.diags, [key]: timing } }));
        get().emit("RejectionDiagnosed", "tracker", `Diagnosed rejection · ${card?.company ?? key} (${timing})`, { company: card?.company ?? key, timing });
      },
      trackJob: (job) => {
        const slug = job.company.toLowerCase();
        if (get().board.some((col) => col.cards.some((c) => c.key === slug))) return;
        set((s) => ({
          board: s.board.map((col, i) =>
            i === 0
              ? {
                  ...col,
                  cards: [
                    { key: slug, company: job.company, role: job.role, tag: "fit " + job.fit, tone: job.tone, when: "new", match: job.fit, note: "Tracked from Opportunity Discovery. Tailor the CV before applying." },
                    ...col.cards,
                  ],
                }
              : col,
          ),
        }));
        get().emit("JobSaved", "jobs", `Tracking ${job.company} (fit ${job.fit})`, { company: job.company, fit: job.fit });
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
        return { ...current, ...p, board };
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
