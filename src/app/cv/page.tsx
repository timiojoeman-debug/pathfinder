"use client";

/**
 * PathFinder redesign — Phase 02 · CV Optimisation.
 * Ports design lines 238–357: paste/analyze input, scanning state, and the
 * full analyzed report (score ring, ATS audit, line-by-line feedback, vague
 * terms, missing keywords, project ideas, LinkedIn quick check, role match).
 */

import { useRef, useState } from "react";
import { usePfStore, type CvAiRead } from "@/lib/pf/store";
import { analyzeCvText } from "@/lib/pf/logic";
import { useAiTask } from "@/lib/pf/use-ai";
import { PageHeader, Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";
import { NextStep } from "@/components/pf/next-step";
import { TailorPanel } from "@/components/pf/cv/tailor-panel";
import { ProjectsPanel } from "@/components/pf/cv/projects-panel";
import { LinkedInPanel } from "@/components/pf/cv/linkedin-panel";
import { PortfolioPanel } from "@/components/pf/cv/portfolio-panel";
import { CareerGapCard } from "@/components/pf/cv/career-gap-card";

const mono = "'JetBrains Mono',monospace";
const MIN_CV = 60;

/** /api/cv/analyze: the extracted text, plus the methodology envelope from
 *  buildCVAnalysisPrompt (feedback/strengths/nextSteps at the root, skills
 *  under `data`), or `aiUnavailable` when the AI read failed. */
interface CvAnalyzeResponse {
  rawText?: string;
  aiUnavailable?: boolean;
  aiMessage?: string;
  feedback?: { issue?: string; suggestedFix?: string }[];
  strengths?: string[];
  nextSteps?: string[];
  data?: { skills?: string[] };
}

function toAiRead(r: CvAnalyzeResponse): CvAiRead | null {
  if (r.aiUnavailable) return null;
  const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);
  const read: CvAiRead = {
    skills: strs(r.data?.skills),
    strengths: strs(r.strengths),
    nextSteps: strs(r.nextSteps),
    feedback: (r.feedback ?? [])
      .map((f) => ({ issue: f.issue?.trim() ?? "", suggestedFix: f.suggestedFix?.trim() ?? "" }))
      .filter((f) => f.issue),
  };
  return read.skills.length + read.strengths.length + read.nextSteps.length + read.feedback.length ? read : null;
}

export default function CvPage() {
  const cvText = usePfStore((s) => s.cvText);
  const cvAnalyzed = usePfStore((s) => s.cvAnalyzed);
  const cvLinkedIn = usePfStore((s) => s.cvLinkedIn);
  const aiRead = usePfStore((s) => s.cvAiRead);
  const dirStack = usePfStore((s) => s.dirStack);
  const set = usePfStore((s) => s.set);
  const emit = usePfStore((s) => s.emit);
  const keepCvAiRead = usePfStore((s) => s.keepCvAiRead);
  const analyzeCv = usePfStore((s) => s.analyzeCv);
  const reAnalyzeCv = usePfStore((s) => s.reAnalyzeCv);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const upload = useAiTask<CvAnalyzeResponse>("/api/cv/analyze");
  const reader = useAiTask<CvAnalyzeResponse>("/api/cv/analyze");
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  /** Keep a real read of `forText`; say so plainly when the route reports it failed.
   *  A read that lands after the CV was edited is dropped by the store. */
  const keepRead = (json: CvAnalyzeResponse, forText: string) => {
    const read = toAiRead(json);
    if (read) {
      if (!keepCvAiRead(read, forText)) return;
      setAiNote(null);
      emit("AiConsulted", "cv", "AI mentor read of the CV");
    } else {
      setAiNote(json.aiMessage ?? "The AI read came back empty. Try again in a minute.");
    }
  };

  // PDF/DOCX upload: the parser (pdf-parse / mammoth) lives behind
  // /api/cv/analyze, and the same call returns the AI read of the text.
  const handleUpload = async (file: File) => {
    setUploadNote(null);
    const fd = new FormData();
    fd.append("file", file);
    const json = await upload.run(fd);
    if (fileRef.current) fileRef.current.value = "";
    if (!json) return;
    const rawText = json.rawText?.trim() ?? "";
    if (rawText.length < 50) {
      setUploadNote("Could not extract text. Paste your CV instead.");
      return;
    }
    set({ cvText: rawText, cvAnalyzed: false, cvAiRead: null });
    keepRead(json, rawText);
  };

  // The ATS read is local and instant; the AI read is a server call that needs
  // an account, so it can fail on its own without taking the local read with it.
  const runAiRead = async () => {
    const forText = usePfStore.getState().cvText;
    const fd = new FormData();
    fd.append("text", forText);
    const json = await reader.run(fd);
    if (json) keepRead(json, forText);
  };

  const handleAnalyze = () => {
    if (cvText.trim().length < MIN_CV) return;
    analyzeCv();
    // An upload already read this exact text; editing it clears the read.
    if (!aiRead) void runAiRead();
  };

  const cvNotAnalyzed = !cvAnalyzed;
  const cvCanAnalyze = cvText.trim().length >= MIN_CV;
  const cvBtnBg = cvCanAnalyze ? "var(--accent)" : "var(--panel3)";

  const analysis = analyzeCvText(cvText, dirStack);
  const hasVague = analysis.vague.length > 0;
  const hasMissing = analysis.missing.length > 0;
  const linkedinChevron = cvLinkedIn ? "▾" : "▸";

  return (
    <div>
      <PageHeader label="Phase 02 · Precision" title="CV Optimisation">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "56ch" }}>
          Most employers filter applications through an ATS before a person reads them, and then a
          recruiter skims the top half of page one in{" "}
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>a few seconds</span>. Every line is
          scored against the role.
        </p>
      </PageHeader>

      <NextStep />

      {/* ── Input state ── */}
      {cvNotAnalyzed && (
        <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>
              Paste your CV text (PDF and DOCX upload work the same way)
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={upload.loading}
              style={{ cursor: upload.loading ? "default" : "pointer", marginLeft: "auto", height: 34, padding: "0 14px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
            >
              {upload.loading ? "Reading…" : "Upload PDF/DOCX"}
            </button>
          </div>
          {/* Reading a file happens on the server, so it needs an account; pasting doesn't. */}
          <AiError
            message={upload.needsAuth ? "Reading a file needs an account. Sign in, or paste your CV text below: the local read works without one." : upload.error ?? uploadNote}
            needsAuth={upload.needsAuth}
          />
          <textarea
            value={cvText}
            onChange={(e) => set({ cvText: e.target.value, cvAnalyzed: false, cvAiRead: null })}
            placeholder="Paste the full text of your CV here (60+ characters to analyse)…"
            style={{ width: "100%", minHeight: 180, marginTop: 10, padding: 16, borderRadius: 13, border: "1px dashed var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)", fontSize: 13.5, lineHeight: 1.6, fontFamily: "'Manrope',sans-serif", outline: "none", resize: "vertical" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            <button className="pf-shine"
              onClick={handleAnalyze}
              disabled={!cvCanAnalyze}
              style={{ cursor: cvCanAnalyze ? "pointer" : "default", height: 46, padding: "0 24px", borderRadius: 12, border: "none", background: cvBtnBg, color: cvCanAnalyze ? "var(--onAccent)" : "var(--faint)", fontSize: 14, fontWeight: 600, fontFamily: "'Manrope',sans-serif" }}
            >
              Analyse CV →
            </button>
            <span style={{ fontSize: 12, color: "var(--faint)", lineHeight: 1.5, flex: "1 1 260px" }}>
              {cvCanAnalyze
                ? "The ATS read runs in your browser. The AI mentor read sends your CV text to PathFinder's server and OpenAI, and needs you signed in."
                : `Add ${MIN_CV - cvText.trim().length} more characters to analyse.`}
            </span>
          </div>
        </Reveal>
      )}

      {/* ── Analyzed report ── */}
      {cvAnalyzed && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <a onClick={reAnalyzeCv} style={{ cursor: "pointer", fontFamily: mono, fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
              ← Edit & re-analyse
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 18, marginBottom: 18 }}>
            {/* Score ring */}
            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: 26, textAlign: "center" }}>
              <div style={{ position: "relative", width: 150, height: 150, margin: "6px auto 14px" }}>
                <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="75" cy="75" r="64" fill="none" stroke="var(--panel3)" strokeWidth="11" />
                  <circle cx="75" cy="75" r="64" fill="none" stroke={analysis.tone} strokeWidth="11" strokeLinecap="round" strokeDasharray="402" strokeDashoffset={analysis.dash} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: mono, fontSize: 44, fontWeight: 700, lineHeight: 1, color: analysis.tone }}>{analysis.score}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", marginTop: 4 }}>/ 100</span>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{analysis.verdict}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{analysis.sub}</div>
            </Reveal>

            {/* Score breakdown — derived from the analysis, not preset */}
            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "20px 24px 12px" }}>
                <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>What&apos;s affecting your score</h2>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: (hasVague || hasMissing) ? "var(--warn)" : "var(--strong)" }}>
                  {analysis.vague.length + analysis.missing.length} to fix
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 24px", borderTop: "1px solid var(--line2)" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: hasVague ? "var(--warn)" : "var(--strong)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>{hasVague ? "!" : "✓"}</span>
                <span style={{ flex: 1, fontSize: 13 }}>Vague, unquantified phrasing</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: hasVague ? "var(--warn)" : "var(--strong)" }}>{analysis.vague.length} found</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 24px", borderTop: "1px solid var(--line2)" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: hasMissing ? "var(--warn)" : "var(--strong)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>{hasMissing ? "!" : "✓"}</span>
                <span style={{ flex: 1, fontSize: 13 }}>Target-stack keyword coverage</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: hasMissing ? "var(--warn)" : "var(--strong)" }}>{analysis.missing.length} missing</span>
              </div>
              <div style={{ padding: "12px 24px", borderTop: "1px solid var(--line2)", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                {analysis.verdict}: {analysis.sub}
              </div>
            </Reveal>
          </div>

          {/* AI mentor read: a real read of this text, or a plain note saying why there isn't one */}
          <Reveal style={{ border: "1px solid color-mix(in srgb,var(--accent) 22%,transparent)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>AI mentor read</h2>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--accent)" }}>
                {aiRead ? "from your full CV text" : "sends your CV text to the server"}
              </span>
            </div>
            {aiRead ? (
              <>
                {aiRead.skills.length > 0 && (
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
                    {aiRead.skills.slice(0, 12).map((s) => <AiTag key={s} tone="var(--muted)">{s}</AiTag>)}
                  </div>
                )}
                {aiRead.feedback.length > 0 && (
                  <AiSection title="Fix first">
                    <AiList items={aiRead.feedback.slice(0, 5).map((f) => (f.suggestedFix ? `${f.issue}: ${f.suggestedFix}` : f.issue))} />
                  </AiSection>
                )}
                {aiRead.strengths.length > 0 && (
                  <AiSection title="Already working"><AiList items={aiRead.strengths.slice(0, 4)} /></AiSection>
                )}
                {aiRead.nextSteps.length > 0 && (
                  <AiSection title="Next steps"><AiList items={aiRead.nextSteps.slice(0, 4)} /></AiSection>
                )}
                <AiCaveat>
                  One model&apos;s read of your CV text, as a first draft. Only skills your CV actually
                  names count towards your profile.
                </AiCaveat>
              </>
            ) : (
              <div style={{ marginTop: 12 }}>
                {aiNote && !reader.loading && (
                  <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 12px" }}>
                    AI read unavailable. {aiNote}
                  </p>
                )}
                <GenerateButton onClick={() => void runAiRead()} loading={reader.loading} loadingLabel="Reading your CV…">
                  {aiNote ? "Try the AI read again" : "Get the AI mentor read"}
                </GenerateButton>
                <AiError message={reader.error} needsAuth={reader.needsAuth} />
              </div>
            )}
          </Reveal>

          {/* Vague terms + missing keywords */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "20px 24px 12px" }}>
                <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>Vague terms detected</h2>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--risk)" }}>weaken every bullet</span>
              </div>
              {hasVague ? (
                analysis.vague.map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 24px", borderTop: "1px solid var(--line2)" }}>
                    <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: "var(--risk)", textDecoration: "line-through", whiteSpace: "nowrap" }}>{v.term}</span>
                    <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{v.fix}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "14px 24px", fontSize: 12.5, color: "var(--muted)", borderTop: "1px solid var(--line2)" }}>
                  None found. Every bullet owns its verb: rare, and good.
                </div>
              )}
            </Reveal>

            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>Missing keywords</h2>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--warn)" }}>vs your target stack</span>
              </div>
              {hasMissing && (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {analysis.missing.map((k, i) => (
                      <span key={i} style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 600, color: "var(--warn)", border: "1px solid color-mix(in srgb,var(--warn) 32%,transparent)", background: "color-mix(in srgb,var(--warn) 8%,transparent)", borderRadius: 7, padding: "5px 11px" }}>{k.label}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
                    Each missing keyword is an ATS filter you fail silently. Add them to Skills and evidence each in one bullet.
                  </div>
                </>
              )}
            </Reveal>
          </div>

          {/* Tailoring + project ideas — the AI layer over the local analysis */}
          <TailorPanel />
          <ProjectsPanel />

          {/* LinkedIn quick check */}
          <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden", marginBottom: 18 }}>
            <a onClick={() => set({ cvLinkedIn: !cvLinkedIn })} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", textDecoration: "none", color: "var(--fg)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{linkedinChevron}</span>
                <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>LinkedIn quick check</h2>
              </span>
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--faint)" }}>paste yours to review</span>
            </a>
            {cvLinkedIn && (
              <div style={{ borderTop: "1px solid var(--line)" }}>
                <LinkedInPanel />
              </div>
            )}
          </Reveal>

          {/* Portfolio review — the "GitHub, portfolio" half of Positioning */}
          <PortfolioPanel />
          <CareerGapCard />

        </div>
      )}
    </div>
  );
}
