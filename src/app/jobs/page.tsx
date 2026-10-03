"use client";

/**
 * Phase 03 — Opportunity Discovery. Add & analyze a role against the CV
 * (compatibility, dealbreakers, ATS keywords, cover letter), plus the scored
 * job cards feeding the detail drawer.
 */

import { useEffect, useState } from "react";
import { buildCoverLetter, fitTone, jobPassesFit, MAX_JD_CHARS, postingKey, targetKeywords } from "@/lib/pf/logic";
import { getProfile, usePfStore, type SavedJob } from "@/lib/pf/store";
import Link from "next/link";
import { classifyRoleType, isUkLocation, safeHttpUrl } from "@/lib/jobs/types";
import { ukByDefault } from "@/lib/jobs/display";
import { useRoleFreshness } from "@/lib/pf/use-freshness";
import { FreshnessNote, JobMeta } from "@/components/pf/job-meta";
import { useAiTask, type AiTask } from "@/lib/pf/use-ai";
import { AiCaveat, AiError } from "@/components/pf/ai-panel";
import { Chip, Kicker, MarkDot, PageHeader, Panel, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";
import { JD_DECODER } from "@/lib/methodology/recruiter-signals";
import { SchemeWindows } from "@/components/pf/scheme-windows";

/** Work modes the search can genuinely narrow on. "On-site" is absent because
 *  adverts rarely say it, so searching the term would hide the roles it means
 *  to find. */
type WorkMode = "any" | "remote" | "hybrid";
const WORK_MODES: [WorkMode, string][] = [
  ["any", "Any mode"],
  ["remote", "Remote"],
  ["hybrid", "Hybrid"],
];

/** Client-side display filter over already-scored results. Company size is
 *  deliberately absent — no job board exposes it, so it can't be a real filter. */
const FIT_FILTERS: [number, string][] = [
  [0, "All fits"],
  [60, "Fit ≥ 60"],
  [80, "Fit ≥ 80"],
];

/** /api/jobs/analyze answers at the root. `source: "heuristic"` means the AI
 *  failed and the score is keyword overlap, which must never read as AI. */
interface JdAnalyzeResponse {
  source?: "ai" | "heuristic";
  matchScore?: number | null;
  auditChecklist?: unknown;
  blockerWarning?: string | null;
}
interface AiJdRead { source: "ai" | "heuristic"; score: number | null; checklist: string[]; warning: string | null }

/** /api/cover-letter/generate: the methodology envelope, letter under `data`. */
interface CoverLetterResponse { data?: { coverLetter?: string; assumptions?: unknown } }

function toJdRead(j: JdAnalyzeResponse): AiJdRead {
  const checklist = Array.isArray(j.auditChecklist) ? j.auditChecklist.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  return {
    source: j.source === "ai" ? "ai" : "heuristic",
    score: typeof j.matchScore === "number" ? j.matchScore : null,
    checklist,
    warning: j.blockerWarning ?? null,
  };
}

/** Map a /api/jobs/search listing onto the design's job-card shape. */
function toSavedJob(j: { title?: string; company?: string; location?: string; source?: string; description?: string; url?: string; matchScore?: number | null; atsKeywords?: string[]; postedAt?: string | null }): SavedJob {
  // A job-board snippet often names no requirements at all, so there is nothing
  // to score against. Defaulting to a number labelled genuine roles "Long shot"
  // and talked students out of applying — confidence derived from nothing.
  const fitKnown = typeof j.matchScore === "number";
  const fit = fitKnown ? Math.max(20, Math.min(95, Math.round(j.matchScore as number))) : 0;
  return {
    company: j.company ?? "Unknown",
    role: j.title ?? "Internship",
    meta: [j.location, j.source].filter(Boolean).join(" · ") || "Live result",
    fit,
    fitKnown,
    dash: fitKnown ? Math.round(144 * (1 - fit / 100)) : 144, // 144 = empty ring
    tone: fitKnown ? fitTone(fit) : "var(--faint)",
    tags: j.atsKeywords && j.atsKeywords.length ? j.atsKeywords.slice(0, 3) : ["Not scored"],
    verdict: fitKnown
      ? (fit >= 70 ? "Strong match" : fit >= 55 ? "Reach: tailor hard" : "Long shot")
      : "Fit unknown: paste the full JD below to score it",
    action: "+ Save",
    jdText: (j.description ?? "").slice(0, MAX_JD_CHARS),
    ...(safeHttpUrl(j.url) ? { url: safeHttpUrl(j.url) as string } : {}),
    ...(j.postedAt ? { postedAt: j.postedAt } : {}),
  };
}

/** Role-type tag from the title. "Other" is the absence of a signal, so it shows nothing. */
function RoleTag({ role }: { role: string }) {
  const type = classifyRoleType(role);
  if (type === "Other") return null;
  return (
    <span className="pf-mono" style={{ fontSize: 10, fontWeight: 600, color: "var(--accentText)", border: "1px solid var(--accent)", borderRadius: 6, padding: "3px 8px" }}>{type}</span>
  );
}

function AddRolePanel({ onAnalyze }: { onAnalyze: () => void }) {
  const s = usePfStore();
  const canSave = !!(s.jfTitle.trim() && s.jfCompany.trim());
  const canAnalyze = s.jfJD.trim().length >= 80;

  // Optional: paste a posting URL and pull the description text from it, so the
  // student doesn't have to copy the whole JD. Falls back to a clear "paste it"
  // message when the page can't be read.
  const [jdUrl, setJdUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<string | null>(null);

  const fetchJd = async () => {
    const url = jdUrl.trim();
    if (!url || fetching) return;
    setFetching(true);
    setFetchNote(null);
    try {
      const res = await fetch("/api/jobs/fetch-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (res.ok ? await res.json() : await res.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (res.ok && typeof json?.text === "string" && json.text.length >= 120) {
        s.set({ jfJD: json.text, jfResult: null, jfLetter: false });
        setFetchNote("Pulled the description from the link. Review it, then analyse.");
      } else {
        setFetchNote(json?.error ?? "Couldn't read that link. Paste the description below instead.");
      }
    } catch {
      setFetchNote("Couldn't reach that link. Paste the description below instead.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <Panel style={{ padding: "24px 26px", marginBottom: 18 }}>
      <Kicker style={{ marginBottom: 14 }}>Add a role you found: save it, or analyse it against your CV</Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <input
          value={s.jfTitle}
          onChange={(e) => s.set({ jfTitle: e.target.value })}
          placeholder="Job title, e.g. Software Engineer Intern"
          className="pf-input"
          style={{ height: 44, padding: "0 15px" }}
        />
        <input
          value={s.jfCompany}
          onChange={(e) => s.set({ jfCompany: e.target.value })}
          placeholder="Company"
          className="pf-input"
          style={{ height: 44, padding: "0 15px" }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={jdUrl}
          onChange={(e) => setJdUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void fetchJd(); }}
          placeholder="Job posting URL (optional): paste a link to pull the description"
          className="pf-input"
          style={{ flex: "1 1 260px", minWidth: 0, height: 44, padding: "0 15px", fontSize: 13 }}
        />
        <button
          onClick={() => void fetchJd()}
          disabled={!jdUrl.trim() || fetching}
          style={{ cursor: !jdUrl.trim() || fetching ? "default" : "pointer", height: 44, padding: "0 18px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: !jdUrl.trim() || fetching ? "var(--faint)" : "var(--fg)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          {fetching ? "Fetching…" : "Fetch from link"}
        </button>
      </div>
      {fetchNote && (
        <div style={{ fontSize: 11.5, color: "var(--faint)", margin: "-4px 0 12px" }}>{fetchNote}</div>
      )}
      <textarea
        value={s.jfJD}
        onChange={(e) => s.set({ jfJD: e.target.value, jfResult: null, jfLetter: false })}
        placeholder="Paste the job description (80+ characters unlocks the full analysis: compatibility, dealbreakers, ATS keywords, cover letter)…"
        className="pf-input"
        style={{ width: "100%", minHeight: 110, padding: "14px 15px", borderRadius: 12, borderStyle: "dashed", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
      />
      <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "10px 0 0" }}>
        Read the advert yourself first and note the must-haves; use the AI read to check what you missed.
      </p>
      <details style={{ marginTop: 8, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--fg)" }}>Decode the advert yourself</summary>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
          {JD_DECODER.checklist.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--faint)" }}>
          A TechTalk recruiter&apos;s rule of thumb, not a measured threshold. Hard requirements such as
          visa or minimum years are a separate check.
        </p>
      </details>
      <div style={{ display: "flex", gap: 10, marginTop: 13 }}>
        <button
          onClick={s.saveJfJob}
          disabled={!canSave}
          style={{ cursor: canSave ? "pointer" : "default", height: 44, padding: "0 20px", borderRadius: 11, border: "none", background: canSave ? "var(--fg)" : "var(--panel3)", color: canSave ? "var(--bg)" : "var(--faint)", fontSize: 13.5, fontWeight: 600 }}
        >
          Save to my list
        </button>
        <button className="pf-shine"
          onClick={onAnalyze}
          disabled={!canAnalyze}
          style={{ cursor: canAnalyze ? "pointer" : "default", height: 44, padding: "0 20px", borderRadius: 11, border: "none", background: canAnalyze ? "var(--accent)" : "var(--panel3)", color: canAnalyze ? "var(--onAccent)" : "var(--faint)", fontSize: 13.5, fontWeight: 600 }}
        >
          Analyse &amp; get ATS keywords →
        </button>
      </div>
    </Panel>
  );
}

function AnalysisResult({ aiRead, read }: { aiRead: AiJdRead | null; read: AiTask<JdAnalyzeResponse> }) {
  const s = usePfStore();
  const r = s.jfResult;
  const letterTask = useAiTask<CoverLetterResponse>("/api/cover-letter/generate");

  // The AI letter is keyed on the posting it was written for, so editing the JD
  // or the company shows the template again instead of the previous job's letter.
  const currentKey = postingKey(s.jfCompany, s.jfTitle, s.jfJD);
  const aiLetter = s.jfCoverLetter?.key === currentKey ? s.jfCoverLetter : null;

  const [refineDraft, setRefineDraft] = useState("");

  // The local template renders at once; the AI letter replaces it when it lands.
  const runLetter = async (refinement?: string) => {
    const st = usePfStore.getState();
    const key = postingKey(st.jfCompany, st.jfTitle, st.jfJD);
    const json = await letterTask.run({
      cvData: st.cvText,
      jobDescription: st.jfJD,
      companyName: st.jfCompany.trim() || "the company",
      directionStatement: getProfile().directionStatement ?? undefined,
      refinement: refinement || undefined,
    });
    const text = json?.data?.coverLetter;
    if (typeof text !== "string" || !text.trim()) return;
    const paras = text.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
    const raw = json?.data?.assumptions;
    const assumptions = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    st.keepCoverLetter({ key, paras, assumptions, words: text.split(/\s+/).length });
    st.emit("AiConsulted", "jobs", `Drafted a cover letter for ${st.jfCompany.trim() || "a role"}`);
    if (refinement) setRefineDraft("");
  };

  if (!r) return null;
  const localLetter = buildCoverLetter(s.jfCompany, s.jfTitle, s.jfJD, targetKeywords(s.dirStack, s.dirRole));
  const letter = aiLetter
    ? { paras: aiLetter.paras, words: aiLetter.words, assumptions: aiLetter.assumptions.length ? aiLetter.assumptions : localLetter.assumptions }
    : { paras: [localLetter.p1, localLetter.p2, localLetter.p3], words: localLetter.words, assumptions: localLetter.assumptions };

  // One compatibility number, not two: lead with the AI score once it lands,
  // fall back to the instant keyword heuristic before then. The two used to
  // render side by side and disagree, which is what students noticed.
  // A degraded server read is a keyword overlap too, so it never replaces the
  // local number or borrows the "AI" label.
  const scoreIsAi = aiRead?.source === "ai" && typeof aiRead.score === "number";
  const displayScore = scoreIsAi ? (aiRead.score as number) : r.compat;
  const displayTone = displayScore >= 70 ? "var(--strong)" : displayScore >= 55 ? "var(--warn)" : "var(--risk)";
  const scoreLabel = scoreIsAi
    ? "AI-scored against your CV"
    : read.loading
      ? "keyword estimate · AI read in progress"
      : aiRead?.source === "heuristic"
        ? "keyword estimate · the AI read didn't come back"
        : "keyword estimate";
  return (
    <Reveal style={{ border: "1px solid color-mix(in srgb,var(--accent) 22%,transparent)", borderRadius: 18, background: "var(--panel)", overflow: "hidden", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", borderBottom: "1px solid var(--line)", background: "var(--accentSoft)" }}>
        <span className="pf-mono" style={{ fontSize: 30, fontWeight: 700, color: displayTone }}>{displayScore}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Compatibility with your CV</div>
          <div className="pf-mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{scoreLabel} · {r.tally}</div>
        </div>
        {r.hasBlockers && (
          <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "var(--risk)", border: "1px solid color-mix(in srgb,var(--risk) 32%,transparent)", borderRadius: 6, padding: "3px 9px" }}>
            DEALBREAKER FOUND
          </span>
        )}
      </div>

      {r.noBlockers && (
        <div style={{ padding: "11px 24px", borderBottom: "1px solid var(--line2)", fontSize: 12.5, color: "var(--muted)" }}>
          No dealbreakers detected: no clearance, sponsorship or experience walls in this posting.
        </div>
      )}
      {r.blockers.map((b) => (
        <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 24px", borderBottom: "1px solid var(--line2)" }}>
          <MarkDot mark={b.mark} bg={b.bg} />
          <span style={{ fontSize: 13 }}>{b.text}</span>
        </div>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, padding: "9px 24px", background: "var(--panel2)", borderBottom: "1px solid var(--line)" }}>
        <span className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>Keyword</span>
        <span className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>Action needed</span>
      </div>
      {r.rows.map((row) => (
        <div key={row.kw} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, alignItems: "center", padding: "9px 24px", borderBottom: "1px solid var(--line2)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: row.bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0 }}>{row.mark}</span>
            <span className="pf-mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{row.kw}</span>
          </span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{row.action}</span>
        </div>
      ))}

      {(read.error || (aiRead?.source === "ai" && (aiRead.warning || aiRead.checklist.length > 0))) && (
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--line2)" }}>
          {aiRead?.source === "ai" && (
            <>
              <Kicker style={{ fontSize: 9.5, marginBottom: 8 }}>AI notes</Kicker>
              {aiRead.warning && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--risk)", margin: "0 0 8px" }}>{aiRead.warning}</p>
              )}
              {aiRead.checklist.map((c) => (
                <div key={c.slice(0, 60)} style={{ display: "flex", gap: 9, padding: "3px 0" }}>
                  <span style={{ color: "var(--accent)" }}>·</span>
                  <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>{c}</span>
                </div>
              ))}
              <AiCaveat>One model&apos;s read of this advert against your CV. Check the advert itself before acting on it.</AiCaveat>
            </>
          )}
          <AiError message={read.error} needsAuth={read.needsAuth} />
        </div>
      )}

      {!s.jfLetter && !aiLetter && (
        <div style={{ padding: "16px 24px" }}>
          <button
            onClick={() => { s.set({ jfLetter: true }); void runLetter(); }}
            style={{ cursor: "pointer", height: 42, padding: "0 20px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
          >
            Generate cover letter →
          </button>
        </div>
      )}
      {(s.jfLetter || aiLetter) && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <Kicker style={{ fontSize: 9.5 }}>Cover letter draft</Kicker>
            <span className="pf-mono" style={{ fontSize: 10, color: "var(--muted)" }}>{letter.words} words</span>
            <span className="pf-mono" style={{ fontSize: 10, fontWeight: 700, color: aiLetter ? "var(--strong)" : "var(--muted)", border: `1px solid color-mix(in srgb,${aiLetter ? "var(--strong)" : "var(--muted)"} 30%,transparent)`, borderRadius: 6, padding: "2px 8px" }}>
              {aiLetter ? "AI · tailored" : letterTask.loading ? "template · AI draft on its way" : "template · fill in the gaps"}
            </span>
          </div>
          {letter.paras.map((p, i) => (
            <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, margin: i === letter.paras.length - 1 ? "0 0 14px" : "0 0 10px" }}>{p}</p>
          ))}
          <div className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--warn)", marginBottom: 7 }}>Review these assumptions before sending</div>
          {letter.assumptions.map((a) => (
            <div key={a} style={{ display: "flex", gap: 9, padding: "4px 0" }}>
              <span style={{ color: "var(--warn)" }}>·</span>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{a}</span>
            </div>
          ))}

          {aiLetter && (
            <AiCaveat>An AI first draft. Review and personalise it before sending: you add the authenticity.</AiCaveat>
          )}

          {/* Refine with AI: tell it what to change and regenerate the draft. */}
          <div style={{ display: "flex", gap: 9, marginTop: 14, flexWrap: "wrap" }}>
            <input
              value={refineDraft}
              onChange={(e) => setRefineDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && refineDraft.trim() && !letterTask.loading) { void runLetter(refineDraft.trim()); } }}
              placeholder="Refine it, e.g. “more concise”, “lead with my Go project”…"
              className="pf-input"
              style={{ flex: "1 1 240px", minWidth: 0, height: 40, padding: "0 14px", fontSize: 13 }}
            />
            <button
              onClick={() => { if (refineDraft.trim() && !letterTask.loading) void runLetter(refineDraft.trim()); }}
              disabled={!refineDraft.trim() || letterTask.loading}
              style={{ cursor: !refineDraft.trim() || letterTask.loading ? "default" : "pointer", height: 40, padding: "0 18px", borderRadius: 10, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: !refineDraft.trim() || letterTask.loading ? "var(--faint)" : "var(--fg)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
            >
              {letterTask.loading ? "Writing…" : "Refine with AI"}
            </button>
          </div>
          <AiError
            message={letterTask.needsAuth ? "The tailored letter uses your account. Sign in to generate or refine it; until then this is a template to fill in." : letterTask.error}
            needsAuth={letterTask.needsAuth}
          />
        </div>
      )}
    </Reveal>
  );
}

export default function JobsPage() {
  const s = usePfStore();
  const jobsAll = [...s.savedJobs];
  // Saved roles whose posting has closed are flagged, never removed.
  const freshness = useRoleFreshness(jobsAll.flatMap((j) => (j.url ? [j.url] : [])));

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode>("any");
  const [searching, setSearching] = useState(false);
  const [liveJobs, setLiveJobs] = useState<SavedJob[]>([]);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [minFit, setMinFit] = useState(0);
  const [internOnly, setInternOnly] = useState(false);
  // UK by default. The direction's location wins when set: a UK place turns the filter on, any
  // other place prefills the location box instead. With none stored, the browser locale decides.
  // The pill makes the default visible and removable.
  const [ukOn, setUkOn] = useState(false);
  const dirLocation = s.location.trim();
  useEffect(() => {
    if (dirLocation) {
      const uk = isUkLocation(dirLocation);
      setUkOn(uk);
      if (!uk) setLocation(dirLocation);
    } else {
      setUkOn(ukByDefault(navigator.languages?.[0] ?? navigator.language));
    }
  }, [dirLocation]);
  const ukActive = ukOn && !location.trim();

  // The AI read of the pasted posting. Tagged with the posting it was run for,
  // so editing the JD can't leave the previous job's read on screen.
  const read = useAiTask<JdAnalyzeResponse>("/api/jobs/analyze");
  const [readFor, setReadFor] = useState<{ key: string; value: AiJdRead } | null>(null);
  const aiRead = readFor && readFor.key === postingKey(s.jfCompany, s.jfTitle, s.jfJD) ? readFor.value : null;

  // The keyword analysis is local and instant; the AI read runs beside it on
  // the click, not on every visit to the page.
  const analyze = async () => {
    s.analyzeJf();
    const st = usePfStore.getState();
    const key = postingKey(st.jfCompany, st.jfTitle, st.jfJD);
    const json = await read.run({ jobTitle: st.jfTitle, company: st.jfCompany, jobDescription: st.jfJD, cvSummary: st.cvText });
    if (!json) return;
    const value = toJdRead(json);
    setReadFor({ key, value });
    if (value.source === "ai") st.emit("AiConsulted", "jobs", `AI read of the ${st.jfCompany.trim() || "pasted"} posting`);
  };

  // Live search against the active site's job-board route (Adzuna/JSearch).
  const runSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearchNote(null);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleType: q,
          cvSummary: s.cvText,
          location: location.trim() || undefined,
          ukOnly: ukActive || undefined,
          industry: industry.trim() || undefined,
          workMode: workMode === "any" ? undefined : workMode,
        }),
      });
      // 429 is the guest daily cap (or a burst) — say so rather than showing
      // "no results", which reads as a broken search. The route ships a plain
      // message; fall back if it's missing.
      if (res.status === 429) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setLiveJobs([]);
        setSearchNote(
          body?.error ??
            "You've hit today's free search limit. Sign in for more, or try again after midnight UTC.",
        );
        return;
      }
      const json = (res.ok ? await res.json() : null) as
        | { jobs?: unknown; configured?: boolean; message?: string }
        | null;
      const raw = json?.jobs;
      const mapped = Array.isArray(raw) ? raw.map((j) => toSavedJob(j as Parameters<typeof toSavedJob>[0])) : [];
      setLiveJobs(mapped);
      if (!mapped.length) {
        // Say what actually happened. This used to read "showing curated
        // matches", which was only ever true because the matches were invented.
        setSearchNote(
          json?.message ??
            (json?.configured === false
              ? "Live job search isn't connected yet. Add roles manually below."
              : `No live results for "${q}". Try a broader title, or add the role manually below.`),
        );
      }
    } catch {
      setLiveJobs([]);
      setSearchNote("Couldn't reach job search just now. Add the role manually below and PathFinder will score it.");
    } finally {
      setSearching(false);
    }
  };

  // Saving a live result makes it a real card: tracked in the store,
  // searchable from ⌘K, and openable in the detail drawer.
  const saveLiveJob = (job: SavedJob, open: boolean) => {
    s.saveListing(job);
    if (open) s.openJob(job.company, job.role);
  };

  // Fit filter applies to already-scored results (jobPassesFit hides unknown-fit
  // roles once a threshold is set, since they have no score to compare).
  // With fewer than 3 scored results a threshold means nothing, so the chips switch off
  // (and a threshold set earlier stops applying) until a CV gives the roles scores.
  const liveInScope = internOnly ? liveJobs.filter((j) => classifyRoleType(j.role) === "Internship") : liveJobs;
  const scoredCount = [...liveInScope, ...jobsAll].filter((j) => j.fitKnown !== false).length;
  const fitDisabled = scoredCount < 3;
  const effMinFit = fitDisabled ? 0 : minFit;
  const passesFit = (j: SavedJob) => jobPassesFit(j, effMinFit);
  const shownLive = liveInScope.filter(passesFit);
  const shownSaved = jobsAll.filter(passesFit);

  return (
    <div>
      <PageHeader label="Phase 03 · Growth" title="Opportunity Discovery">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "56ch" }}>
          10–15 <span style={{ color: "var(--fg)", fontWeight: 600 }}>high-fit</span> targets a week beats 100 cold applications. A role is scored 0–100 against your CV when its advert names enough to score.
        </p>
      </PageHeader>

      <NextStep />

      <SchemeWindows />

      <Reveal style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260, display: "flex", alignItems: "center", gap: 10, height: 46, padding: "0 16px", border: "1px solid var(--lineStrong)", borderRadius: 12, background: "var(--panel)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void runSearch(); }}
            placeholder="SWE intern · React, Node · remote…"
            style={{ flex: 1, border: "none", background: "transparent", color: "var(--fg)", fontSize: 14, fontFamily: "inherit", outline: "none" }}
          />
          {searching && <span className="pf-anim-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--panel3)", borderTopColor: "var(--accent)", flexShrink: 0 }} />}
        </div>
        <button
          onClick={() => void runSearch()}
          disabled={!query.trim() || searching}
          style={{
            cursor: !query.trim() || searching ? "default" : "pointer", height: 46, padding: "0 22px", borderRadius: 12,
            border: "none", background: !query.trim() || searching ? "var(--panel3)" : "var(--accent)",
            color: !query.trim() || searching ? "var(--faint)" : "var(--onAccent)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
          }}
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </Reveal>

      {/* Filters. These are the ones the search actually honours — the two
          pills that used to sit here ("Fit ≥ 60", "Startup 2–50") looked like
          controls but filtered nothing, and there is no company-size data
          behind the second one to filter on. */}
      <Reveal style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void runSearch(); }}
          placeholder="Location, e.g. London"
          className="pf-input"
          style={{ height: 42, padding: "0 14px", flex: "1 1 170px", minWidth: 0, fontSize: 13 }}
        />
        <input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void runSearch(); }}
          placeholder="Industry, e.g. fintech"
          className="pf-input"
          style={{ height: 42, padding: "0 14px", flex: "1 1 170px", minWidth: 0, fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {WORK_MODES.map(([value, label]) => (
            <Chip key={value} size="sm" label={label} on={workMode === value} onClick={() => setWorkMode(value)} />
          ))}
        </div>
        {ukActive && (
          <button
            type="button"
            onClick={() => setUkOn(false)}
            aria-label="Remove UK filter"
            className="pf-mono"
            style={{ cursor: "pointer", border: "1px solid var(--accent)", background: "color-mix(in srgb,var(--accent) 12%,transparent)", color: "var(--accentText)", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}
          >
            UK + remote (UK) ×
          </button>
        )}
        {(workMode !== "any" || industry.trim()) && (
          <span style={{ fontSize: 11, color: "var(--faint)", lineHeight: 1.45, flex: "1 1 100%" }}>
            Industry and work mode narrow by keyword, not by a field. On Adzuna the word is searched in
            the advert; the GitHub lists carry no advert text, so there it has to appear in the title,
            company or location, which drops most of them. Check the advert before assuming a role is
            {workMode !== "any" ? ` ${workMode}` : " in that industry"}.
          </span>
        )}
      </Reveal>

      {searchNote && (
        <div style={{ fontSize: 12, color: "var(--faint)", margin: "-8px 0 14px" }}>{searchNote}</div>
      )}

      {(liveJobs.length > 0 || jobsAll.length > 0) && (
        <Reveal style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>Show</span>
          {FIT_FILTERS.map(([value, label]) => (
            <Chip key={value} size="sm" label={label} on={effMinFit === value} disabled={fitDisabled && value > 0} onClick={() => setMinFit(value)} />
          ))}
          <Chip size="sm" label="Internships only" on={internOnly} onClick={() => setInternOnly((v) => !v)} />
          <span style={{ fontSize: 11, color: "var(--faint)", lineHeight: 1.45, flex: "1 1 220px" }}>
            {fitDisabled ? (
              <>
                Not enough scored roles to filter by fit.{" "}
                <Link href="/cv" style={{ color: "var(--accentText)", textDecoration: "underline" }}>Add your CV to score fit</Link>.{" "}
              </>
            ) : null}
            Filters what&apos;s shown below. Company size isn&apos;t filterable, because no job board exposes it.
          </span>
        </Reveal>
      )}

      {shownLive.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div className="pf-mono" style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
            live results · {shownLive.length} shown
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {shownLive.map((j, i) => (
              <div
                key={`live-${j.company}-${j.role}-${i}`}
                onClick={() => saveLiveJob(j, true)}
                className="pf-hover-border"
                style={{ cursor: "pointer", border: "1px solid color-mix(in srgb,var(--accent) 24%,transparent)", borderRadius: 16, background: "var(--panel)", padding: "22px 24px", transition: "transform .3s var(--ease),border-color .3s var(--ease)" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
                  {/* The card's open action, as a real button so it is keyboard
                      reachable. The card itself keeps its click for the mouse. */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); saveLiveJob(j, true); }}
                    aria-label={`Save and open ${j.role} at ${j.company}`}
                    style={{ minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>{j.company}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{j.role}</div>
                    <JobMeta meta={j.meta} postedAt={j.postedAt} />
                  </button>
                  <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                    <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="28" cy="28" r="23" fill="none" stroke="var(--panel3)" strokeWidth="5" />
                      <circle cx="28" cy="28" r="23" fill="none" stroke={j.tone} strokeWidth="5" strokeLinecap="round" strokeDasharray="144" strokeDashoffset={j.dash} />
                    </svg>
                    <div className="pf-mono" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: j.tone }}>{j.fitKnown === false ? "—" : j.fit}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  <RoleTag role={j.role} />
                  {j.tags.map((tg) => (
                    <span key={tg} className="pf-mono" style={{ fontSize: 10, color: "var(--muted)", border: "1px solid var(--line)", background: "var(--panel2)", borderRadius: 6, padding: "3px 8px" }}>{tg}</span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--line2)", paddingTop: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: j.tone }}>{j.verdict}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); saveLiveJob(j, false); }}
                    aria-label={`Save ${j.role} at ${j.company}`}
                    className="pf-mono pf-tap"
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--accentText)", cursor: "pointer", background: "none", border: "none", padding: "4px 0" }}
                  >
                    + Save →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddRolePanel onAnalyze={() => void analyze()} />

      <AnalysisResult aiRead={aiRead} read={read} />

      {jobsAll.length > 0 && (
        <div className="pf-mono" style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", margin: "0 0 10px" }}>
          Your saved roles · {effMinFit ? `${shownSaved.length} of ${jobsAll.length}` : jobsAll.length}
        </div>
      )}

      {jobsAll.length === 0 ? (
        <Reveal style={{ border: "1px dashed var(--lineStrong)", borderRadius: 16, background: "var(--panel)", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No saved roles yet</div>
          <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: "46ch", margin: "0 auto", lineHeight: 1.6 }}>
            Search live roles above, or paste a job description below to score it against your CV and save it. Saved roles show here and feed your pipeline.
          </div>
        </Reveal>
      ) : shownSaved.length === 0 ? (
        <Reveal style={{ border: "1px dashed var(--lineStrong)", borderRadius: 16, background: "var(--panel)", padding: "30px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 12 }}>
            None of your {jobsAll.length} saved roles are at {effMinFit}+ fit.
          </div>
          <Chip size="sm" label="Show all fits" on={false} onClick={() => setMinFit(0)} />
        </Reveal>
      ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {shownSaved.map((j, i) => (
          <Reveal key={`${j.company}-${j.role}-${i}`} style={{}}>
            <div
              onClick={() => s.openJob(j.company, j.role)}
              role="button"
              tabIndex={0}
              aria-label={`Open ${j.role} at ${j.company}`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.openJob(j.company, j.role); } }}
              className="pf-hover-border"
              style={{ cursor: "pointer", border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel)", padding: "22px 24px", transition: "transform .3s var(--ease),box-shadow .3s var(--ease),border-color .3s var(--ease)" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>{j.company}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{j.role}</div>
                  <JobMeta meta={j.meta} postedAt={j.postedAt} />
                  <FreshnessNote status={j.url ? freshness[j.url] : undefined} />
                </div>
                <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                  <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="28" cy="28" r="23" fill="none" stroke="var(--panel3)" strokeWidth="5" />
                    <circle cx="28" cy="28" r="23" fill="none" stroke={j.tone} strokeWidth="5" strokeLinecap="round" strokeDasharray="144" strokeDashoffset={j.dash} />
                  </svg>
                  <div className="pf-mono" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: j.tone }}>{j.fitKnown === false ? "—" : j.fit}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <RoleTag role={j.role} />
                {j.tags.map((tg) => (
                  <span key={tg} className="pf-mono" style={{ fontSize: 10, color: "var(--muted)", border: "1px solid var(--line)", background: "var(--panel2)", borderRadius: 6, padding: "3px 8px" }}>{tg}</span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--line2)", paddingTop: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: j.tone }}>{j.verdict}</span>
                <span className="pf-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>Open →</span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      )}
    </div>
  );
}
