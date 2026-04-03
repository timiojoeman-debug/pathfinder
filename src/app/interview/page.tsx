"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCvSummary, getDirection, getLeetcode, setLeetcode } from "@/lib/store";
import {
  NEETCODE_BY_CATEGORY,
  NEETCODE_75_CATEGORIES,
  NEETCODE_150_CATEGORIES,
  getLeetcodeUrl,
  type LeetCodeProblem,
} from "@/lib/neetcode-data";
import { TARGET_ROLES, STAR_TUTORIAL_LINKS } from "@/lib/constants";
import { MagBtn } from "@/components/ui/mag-btn";
import { Tag, AnimBar } from "@/components/ui/typography";

type Tab = "leetcode" | "star" | "questions" | "briefing" | "feedback";
type LeetCodeList = "75" | "150";
type InterviewQuestion = {
  type: string;
  question: string;
  answerTemplate: string;
};

type FeedbackEntry = {
  id: string;
  companyName: string;
  role: string;
  date: string;
  questionsAsked: string;
  ratings: { technical: number; behavioral: number; communication: number };
  reflections: string;
  aiAnalysis?: Record<string, unknown>;
  createdAt: string;
};

const FEEDBACK_STORAGE_KEY = "pathfinder-interview-feedback";

function loadFeedbackEntries(): FeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFeedbackEntries(entries: FeedbackEntry[]) {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(entries));
}

function ProblemRow({
  p,
  list,
  isCompleted,
  onToggle,
}: {
  p: LeetCodeProblem;
  list: LeetCodeList;
  isCompleted: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          isCompleted ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--muted)]"
        }`}
      >
        {isCompleted && <span className="text-[10px] text-[var(--accent-foreground)]">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--foreground)]">{p.title}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Tag
            className={`${
              p.difficulty === "Easy"
                ? "bg-emerald-500/10 text-emerald-400"
                : p.difficulty === "Medium"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-rose-500/10 text-rose-500"
            }`}
          >
            {p.difficulty}
          </Tag>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <a
          href={getLeetcodeUrl(p.leetcodeSlug)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--accent)] hover:underline"
        >
          LeetCode
        </a>
        <a
          href={p.neetcodeUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--accent)] hover:underline"
        >
          NeetCode
        </a>
      </div>
    </li>
  );
}

function StarRatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium transition ${
              n <= value
                ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InterviewPage() {
  const [activeTab, setActiveTab] = useState<Tab>("leetcode");
  const [leetList, setLeetList] = useState<LeetCodeList>("75");
  const [lcState, setLcState] = useState(getLeetcode());
  const [star, setStar] = useState({ situation: "", task: "", action: "", result: "" });
  const [starTweaked, setStarTweaked] = useState<
    (typeof star & { tips?: string[] }) | null
  >(null);
  const [starLoading, setStarLoading] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [randomProblem, setRandomProblem] = useState<Record<string, unknown> | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [solutionInput, setSolutionInput] = useState("");
  const [solutionRating, setSolutionRating] = useState<Record<string, unknown> | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [targetRole, setTargetRole] = useState("");

  // Company Briefing state
  const [briefingCompany, setBriefingCompany] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingResult, setBriefingResult] = useState<Record<string, unknown> | null>(null);

  // Feedback Log state
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [fbCompany, setFbCompany] = useState("");
  const [fbRole, setFbRole] = useState("");
  const [fbDate, setFbDate] = useState("");
  const [fbQuestions, setFbQuestions] = useState("");
  const [fbRatings, setFbRatings] = useState({ technical: 3, behavioral: 3, communication: 3 });
  const [fbReflections, setFbReflections] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [fbAiResult, setFbAiResult] = useState<Record<string, unknown> | null>(null);

  const cvSummary = getCvSummary();
  const direction = getDirection();
  const effectiveTargetRole = targetRole || direction.roleType || "Software Engineering Intern";

  useEffect(() => {
    setLcState(getLeetcode());
  }, [activeTab]);

  useEffect(() => {
    setFeedbackEntries(loadFeedbackEntries());
  }, []);

  const problems75 = NEETCODE_75_CATEGORIES.flatMap(
    (cat) => (NEETCODE_BY_CATEGORY[cat] ?? []).filter((x) => x.list === "75")
  );
  const problems150 = Object.values(NEETCODE_BY_CATEGORY).flat();
  const completed75 = (lcState.completed75 ?? []).length;
  const completed150 = (lcState.completed150 ?? []).length;
  const pct75 = Math.min(100, Math.round((completed75 / Math.max(1, problems75.length)) * 100));
  const pct150 = Math.min(100, Math.round((completed150 / Math.max(1, problems150.length)) * 100));
  const allCompleted75 = completed75 >= 75;
  const allCompleted150 = completed150 >= 150;

  const toggleProblem = useCallback((id: string, list: "75" | "150") => {
    const key = list === "75" ? "completed75" : "completed150";
    const arr = (lcState[key] ?? []) as string[];
    const next = arr.includes(id)
      ? arr.filter((x) => x !== id)
      : [...arr, id];
    const updated = { ...lcState, [key]: next, [`neetCode${list}`]: next.length };
    setLcState(updated);
    setLeetcode(updated);
  }, [lcState]);

  async function handleStarTweak() {
    if (!star.situation && !star.task && !star.action && !star.result) return;
    setStarLoading(true);
    setStarTweaked(null);
    try {
      const res = await fetch("/api/interview/star-tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(star),
      });
      const data = await res.json();
      setStarTweaked(data);
    } finally {
      setStarLoading(false);
    }
  }

  async function handleGenerateQuestions() {
    setQuestionsLoading(true);
    setQuestions([]);
    try {
      const res = await fetch("/api/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvSummary, targetRole: effectiveTargetRole, more: true }),
      });
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function handleRandomProblem() {
    setRandomLoading(true);
    setRandomProblem(null);
    setSolutionInput("");
    setSolutionRating(null);
    try {
      const res = await fetch("/api/interview/random-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedIds: [...(lcState.completed75 ?? []), ...(lcState.completed150 ?? [])],
        }),
      });
      const data = await res.json();
      setRandomProblem(data);
    } finally {
      setRandomLoading(false);
    }
  }

  async function handleRateSolution() {
    if (!randomProblem?.title || !solutionInput.trim()) return;
    setRatingLoading(true);
    setSolutionRating(null);
    try {
      const res = await fetch("/api/interview/rate-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle: String(randomProblem.title),
          userSolution: solutionInput,
        }),
      });
      const data = await res.json();
      setSolutionRating(data);
    } finally {
      setRatingLoading(false);
    }
  }

  async function handleGenerateBriefing() {
    if (!briefingCompany.trim()) return;
    setBriefingLoading(true);
    setBriefingResult(null);
    try {
      const res = await fetch("/api/interview/company-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: briefingCompany.trim(),
          roleName: effectiveTargetRole,
          studentProfile: cvSummary || "Student",
        }),
      });
      const data = await res.json();
      setBriefingResult(data);
    } finally {
      setBriefingLoading(false);
    }
  }

  async function handleGetAiFeedback() {
    if (!fbCompany.trim()) return;
    setFbLoading(true);
    setFbAiResult(null);

    const previousSummary = feedbackEntries
      .slice(0, 10)
      .map(
        (e) =>
          `${e.companyName} (${e.role}) - Tech:${e.ratings.technical} Behav:${e.ratings.behavioral} Comm:${e.ratings.communication}`
      )
      .join("; ");

    try {
      const res = await fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType: fbRole || "general",
          questionsAsked: fbQuestions,
          selfRatings: fbRatings,
          wentWell: fbReflections,
          wouldChange: "",
          previousInterviews: previousSummary,
        }),
      });
      const data = await res.json();
      setFbAiResult(data);

      // Save the entry to localStorage
      const entry: FeedbackEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        companyName: fbCompany.trim(),
        role: fbRole.trim(),
        date: fbDate || new Date().toISOString().split("T")[0],
        questionsAsked: fbQuestions,
        ratings: { ...fbRatings },
        reflections: fbReflections,
        aiAnalysis: data,
        createdAt: new Date().toISOString(),
      };
      const updated = [entry, ...feedbackEntries];
      setFeedbackEntries(updated);
      saveFeedbackEntries(updated);
    } finally {
      setFbLoading(false);
    }
  }

  function detectPatterns(entries: FeedbackEntry[]): string[] {
    if (entries.length < 2) return [];
    const patterns: string[] = [];
    const avgTech = entries.reduce((s, e) => s + e.ratings.technical, 0) / entries.length;
    const avgBehav = entries.reduce((s, e) => s + e.ratings.behavioral, 0) / entries.length;
    const avgComm = entries.reduce((s, e) => s + e.ratings.communication, 0) / entries.length;

    if (avgTech < 3) patterns.push("Technical skills consistently rated below average -- consider more LeetCode practice.");
    if (avgBehav < 3) patterns.push("Behavioral responses need work -- practice more STAR stories.");
    if (avgComm < 3) patterns.push("Communication scores are low -- try mock interviews with a friend.");
    if (avgTech >= 4 && avgBehav >= 4 && avgComm >= 4) patterns.push("Strong performance across all areas -- keep it up!");

    const recent = entries.slice(0, 3);
    const older = entries.slice(3, 6);
    if (recent.length >= 2 && older.length >= 2) {
      const recentAvg = recent.reduce((s, e) => s + e.ratings.technical + e.ratings.behavioral + e.ratings.communication, 0) / (recent.length * 3);
      const olderAvg = older.reduce((s, e) => s + e.ratings.technical + e.ratings.behavioral + e.ratings.communication, 0) / (older.length * 3);
      if (recentAvg > olderAvg + 0.5) patterns.push("Upward trend detected -- your recent interviews show improvement.");
      if (recentAvg < olderAvg - 0.5) patterns.push("Downward trend detected -- review recent reflections to identify what changed.");
    }

    return patterns;
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "leetcode", label: "LeetCode Tracker", icon: "</>" },
    { id: "star", label: "STAR Stories", icon: "⭐" },
    { id: "questions", label: "Mock Questions", icon: "?" },
    { id: "briefing", label: "Company Briefing", icon: "🏢" },
    { id: "feedback", label: "Feedback Log", icon: "📝" },
  ];

  const categories = leetList === "75" ? NEETCODE_75_CATEGORIES : NEETCODE_150_CATEGORIES;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="section-label">Phase 5</p>
        <h1 className="section-title">Interview Preparation</h1>
        <p className="section-subtitle">
          Master technical questions and behavioral storytelling.
        </p>
      </section>

      <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === t.id
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "text-[var(--muted)] hover:bg-[var(--border)]/50"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "leetcode" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLeetList("75")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                leetList === "75"
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "border-[var(--border)]"
              }`}
            >
              Blind 75
            </button>
            <button
              type="button"
              onClick={() => setLeetList("150")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                leetList === "150"
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "border-[var(--border)]"
              }`}
            >
              NeetCode 150
            </button>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  {leetList === "75" ? "Blind 75" : "NeetCode 150"} — {leetList === "75" ? completed75 : completed150} / {leetList === "75" ? "75" : "150"}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Problems by category</p>
              </div>
              <a
                href="https://neetcode.io/practice/neetcode-75"
                target="_blank"
                rel="noreferrer"
                style={{textDecoration: 'none'}}
              >
                <MagBtn variant="secondary" size="sm">
                  Open NeetCode →
                </MagBtn>
              </a>
            </div>
            <div className="mt-4 flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {leetList === "75" ? pct75 : pct150}%
              </span>
              <div className="w-full mt-1">
                <AnimBar width={leetList === "75" ? pct75 : pct150} delay={100} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => {
              const probs = (NEETCODE_BY_CATEGORY[cat] ?? []).filter(
                (p) => leetList === "150" || p.list === "75"
              );
              if (probs.length === 0) return null;
              return (
                <div key={cat} className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{cat}</h3>
                  <ul className="mt-3 space-y-2">
                    {probs.map((prob) => (
                      <ProblemRow
                        key={prob.id}
                        p={prob}
                        list={leetList}
                        isCompleted={
                          leetList === "75"
                            ? (lcState.completed75 ?? []).includes(prob.id)
                            : (lcState.completed150 ?? []).includes(prob.id)
                        }
                        onToggle={() => toggleProblem(prob.id, leetList)}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {(allCompleted75 || allCompleted150) && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Random problem + explain</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Generate a random problem. Type your solution/explanation and get complexity rating and top approaches.
              </p>
              <button type="button" onClick={handleRandomProblem} disabled={randomLoading} className="bg-transparent border-0 p-0 mt-4">
                <MagBtn variant="primary" size="md" style={randomLoading ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                  {randomLoading ? "Generating..." : "Generate random problem"}
                </MagBtn>
              </button>
              {randomProblem && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-[var(--border)] p-4">
                    <p className="font-medium text-[var(--foreground)]">{String(randomProblem.title ?? "")}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{String(randomProblem.description ?? "")}</p>
                    <a
                      href={String(randomProblem.leetcodeUrl || "#")}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline"
                    >
                      Open on LeetCode →
                    </a>
                  </div>
                  <textarea
                    className="input h-32"
                    placeholder="Type your solution or explain your approach..."
                    value={solutionInput}
                    onChange={(e) => setSolutionInput(e.target.value)}
                  />
                  <button type="button" onClick={handleRateSolution} disabled={ratingLoading || !solutionInput.trim()} className="bg-transparent border-0 p-0">
                    <MagBtn variant="secondary" size="md" style={(ratingLoading || !solutionInput.trim()) ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                      {ratingLoading ? "Rating..." : "Rate my solution"}
                    </MagBtn>
                  </button>
                  {solutionRating && (
                    <div className="rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/5 p-4">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Time: {String(solutionRating.timeComplexity ?? "")} · Space: {String(solutionRating.spaceComplexity ?? "")} · Rating: {String(solutionRating.rating ?? "")}/10
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">{String(solutionRating.feedback ?? "")}</p>
                      {Array.isArray(solutionRating.topTwoApproaches) && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-[var(--foreground)]">Top 2 efficient approaches:</p>
                          <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                            {solutionRating.topTwoApproaches.map((a: string, i: number) => (
                              <li key={i}>• {a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "star" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">STAR story builder</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Write Situation, Task, Action, Result. AI will tweak for better flow.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STAR_TUTORIAL_LINKS.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {l.label} →
                </a>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Situation</label>
                <textarea
                  className="input h-20 resize-y"
                  placeholder="Context of the challenge"
                  value={star.situation}
                  onChange={(e) => setStar((s) => ({ ...s, situation: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Task</label>
                <textarea
                  className="input h-20 resize-y"
                  placeholder="What you needed to achieve"
                  value={star.task}
                  onChange={(e) => setStar((s) => ({ ...s, task: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Action</label>
                <textarea
                  className="input mt-1.5 h-20 w-full resize-y"
                  placeholder="Concrete steps you took"
                  value={star.action}
                  onChange={(e) => setStar((s) => ({ ...s, action: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Result</label>
                <textarea
                  className="input mt-1.5 h-20 w-full resize-y"
                  placeholder="Measurable outcome"
                  value={star.result}
                  onChange={(e) => setStar((s) => ({ ...s, result: e.target.value }))}
                />
              </div>
            </div>
            <button type="button" onClick={handleStarTweak} disabled={starLoading || (!star.situation && !star.task && !star.action && !star.result)} className="bg-transparent border-0 p-0 mt-4">
              <MagBtn variant="primary" size="md" style={(starLoading || (!star.situation && !star.task && !star.action && !star.result)) ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                {starLoading ? "Tweaking..." : "AI: Improve flow"}
              </MagBtn>
            </button>
            {starTweaked && (
              <div className="mt-5 rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/5 p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">Improved story</p>
                <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  <p><strong className="text-[var(--foreground)]">S:</strong> {starTweaked.situation}</p>
                  <p><strong className="text-[var(--foreground)]">T:</strong> {starTweaked.task}</p>
                  <p><strong className="text-[var(--foreground)]">A:</strong> {starTweaked.action}</p>
                  <p><strong className="text-[var(--foreground)]">R:</strong> {starTweaked.result}</p>
                </div>
                {starTweaked.tips?.length && (
                  <p className="mt-3 text-xs text-[var(--accent)]">Tips: {starTweaked.tips.join(" ")}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "questions" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Mock questions (4 types)</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Behavioral, Technical, Situational, CV-Specific. Select target role:
                </p>
                <select
                  className="input mt-2 w-full max-w-xs"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                >
                  <option value="">Use Phase 1 role</option>
                  {TARGET_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={handleGenerateQuestions} disabled={questionsLoading} className="bg-transparent border-0 p-0 shrink-0">
                <MagBtn variant="primary" size="md" style={questionsLoading ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                  {questionsLoading ? "Generating..." : "Generate questions"}
                </MagBtn>
              </button>
            </div>
            {questions.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-[var(--border)] p-4">
                    <Tag>{q.type}</Tag>
                    <p className="mt-2 font-medium text-[var(--foreground)]">{q.question}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      <strong className="text-[var(--foreground)]">HOW TO ANSWER:</strong> {q.answerTemplate}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!cvSummary && (
            <p className="text-sm text-[var(--accent)]">
              <Link href="/cv" className="underline">Upload your CV</Link> for better CV-specific questions.
            </p>
          )}
        </div>
      )}

      {activeTab === "briefing" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Company Research Briefing</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Enter a company name to generate a research briefing with talking points tailored to your profile.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Company name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Stripe, Google, Figma..."
                  value={briefingCompany}
                  onChange={(e) => setBriefingCompany(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateBriefing}
                disabled={briefingLoading || !briefingCompany.trim()}
                className="bg-transparent border-0 p-0 shrink-0"
              >
                <MagBtn
                  variant="primary"
                  size="md"
                  style={
                    briefingLoading || !briefingCompany.trim()
                      ? { opacity: 0.5, pointerEvents: "none" }
                      : {}
                  }
                >
                  {briefingLoading ? "Generating..." : "Generate briefing"}
                </MagBtn>
              </button>
            </div>

            {briefingResult && !briefingResult.error && (
              <div className="mt-6 space-y-4">
                {briefingResult.whatTheyDo ? (
                  <div className="rounded-lg border border-[var(--border)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">What they do</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{String(briefingResult.whatTheyDo)}</p>
                  </div>
                ) : null}
                {briefingResult.techStack ? (
                  <div className="rounded-lg border border-[var(--border)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Known tech stack</h3>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.isArray(briefingResult.techStack)
                        ? (briefingResult.techStack as string[]).map((t, i) => (
                            <Tag key={i}>{t}</Tag>
                          ))
                        : <p className="text-sm text-[var(--muted)]">{String(briefingResult.techStack)}</p>
                      }
                    </div>
                  </div>
                ) : null}
                {briefingResult.values ? (
                  <div className="rounded-lg border border-[var(--border)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Company values</h3>
                    {Array.isArray(briefingResult.values) ? (
                      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                        {(briefingResult.values as string[]).map((v, i) => (
                          <li key={i}>• {v}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--muted)]">{String(briefingResult.values)}</p>
                    )}
                  </div>
                ) : null}
                {Array.isArray(briefingResult.talkingPoints) ? (
                  <div className="rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/5 p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      &quot;Why this company?&quot; -- talking points
                    </h3>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
                      {(briefingResult.talkingPoints as string[]).map((tp, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 text-[var(--accent)]">{i + 1}.</span>
                          {tp}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(briefingResult.questionsToAsk) ? (
                  <div className="rounded-lg border border-[var(--border)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Questions to ask the interviewer</h3>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
                      {(briefingResult.questionsToAsk as string[]).map((q, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 text-[var(--accent)]">Q{i + 1}.</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {briefingResult?.error ? (
              <div className="mt-4 rounded-lg border border-rose-500/50 bg-rose-500/5 p-4">
                <p className="text-sm text-rose-400">{String(briefingResult.error)}</p>
              </div>
            ) : null}
          </div>

          {/* Contextual tool recommendation */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]/50 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">🔍</span>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Recommended: Glassdoor</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Use{" "}
                  <a
                    href="https://www.glassdoor.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    Glassdoor
                  </a>{" "}
                  to research salary ranges, interview experiences, and company culture reviews from real employees.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Post-Interview Feedback Logger</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Log your interview experience and get AI-powered analysis with a generated thank-you email.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Company name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Stripe"
                  value={fbCompany}
                  onChange={(e) => setFbCompany(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Role</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Frontend Intern"
                  value={fbRole}
                  onChange={(e) => setFbRole(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Date</label>
                <input
                  type="date"
                  className="input"
                  value={fbDate}
                  onChange={(e) => setFbDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Questions asked</label>
              <textarea
                className="input h-24 resize-y"
                placeholder="List the questions you were asked during the interview..."
                value={fbQuestions}
                onChange={(e) => setFbQuestions(e.target.value)}
              />
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-[var(--foreground)] mb-3">Self-ratings</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <StarRatingInput
                  label="Technical"
                  value={fbRatings.technical}
                  onChange={(v) => setFbRatings((r) => ({ ...r, technical: v }))}
                />
                <StarRatingInput
                  label="Behavioral"
                  value={fbRatings.behavioral}
                  onChange={(v) => setFbRatings((r) => ({ ...r, behavioral: v }))}
                />
                <StarRatingInput
                  label="Communication"
                  value={fbRatings.communication}
                  onChange={(v) => setFbRatings((r) => ({ ...r, communication: v }))}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Reflections</label>
              <textarea
                className="input h-24 resize-y"
                placeholder="What went well? What would you do differently?"
                value={fbReflections}
                onChange={(e) => setFbReflections(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleGetAiFeedback}
              disabled={fbLoading || !fbCompany.trim()}
              className="bg-transparent border-0 p-0 mt-4"
            >
              <MagBtn
                variant="primary"
                size="md"
                style={
                  fbLoading || !fbCompany.trim()
                    ? { opacity: 0.5, pointerEvents: "none" }
                    : {}
                }
              >
                {fbLoading ? "Analyzing..." : "Get AI feedback"}
              </MagBtn>
            </button>

            {fbAiResult && !fbAiResult.error ? (
              <div className="mt-6 space-y-4">
                {fbAiResult.analysis ? (
                  <div className="rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/5 p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">AI Analysis</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{String(fbAiResult.analysis)}</p>
                  </div>
                ) : null}
                {Array.isArray(fbAiResult.improvements) ? (
                  <div className="rounded-lg border border-[var(--border)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Areas for improvement</h3>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                      {(fbAiResult.improvements as string[]).map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {fbAiResult.thankYouEmail ? (
                  <div className="rounded-lg border border-[var(--border)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Generated thank-you email</h3>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)] font-sans">
                      {String(fbAiResult.thankYouEmail)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}

            {fbAiResult?.error ? (
              <div className="mt-4 rounded-lg border border-rose-500/50 bg-rose-500/5 p-4">
                <p className="text-sm text-rose-400">{String(fbAiResult.error)}</p>
              </div>
            ) : null}
          </div>

          {/* Past entries and pattern detection */}
          {feedbackEntries.length > 0 && (
            <div className="space-y-4">
              {feedbackEntries.length >= 2 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Pattern detection</h3>
                  {(() => {
                    const patterns = detectPatterns(feedbackEntries);
                    if (patterns.length === 0)
                      return (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          Not enough data yet for pattern analysis. Keep logging interviews!
                        </p>
                      );
                    return (
                      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                        {patterns.map((p, i) => (
                          <li key={i}>• {p}</li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Past interviews ({feedbackEntries.length})
                </h3>
                <div className="mt-3 space-y-2">
                  {feedbackEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--foreground)]">
                          {entry.companyName}
                          {entry.role ? ` -- ${entry.role}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{entry.date}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Tag className="bg-blue-500/10 text-blue-400">T:{entry.ratings.technical}</Tag>
                        <Tag className="bg-purple-500/10 text-purple-400">B:{entry.ratings.behavioral}</Tag>
                        <Tag className="bg-emerald-500/10 text-emerald-400">C:{entry.ratings.communication}</Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
