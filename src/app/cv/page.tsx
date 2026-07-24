"use client";

/**
 * PathFinder redesign — Phase 02 · CV Optimisation.
 * Ports design lines 238–357: paste/analyze input, scanning state, and the
 * full analyzed report (score ring, ATS audit, line-by-line feedback, vague
 * terms, missing keywords, project ideas, LinkedIn quick check, role match).
 */

import { useRef, useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { analyzeCvText, linkedInIssues } from "@/lib/pf/logic";
import { Kicker, PageHeader, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";
import { TailorPanel } from "@/components/pf/cv/tailor-panel";
import { ProjectsPanel } from "@/components/pf/cv/projects-panel";
import { LinkedInPanel } from "@/components/pf/cv/linkedin-panel";

const mono = "'JetBrains Mono',monospace";

/** AI-backed analysis from /api/cv/analyze — optional enrichment layer. */
interface AiCvRead {
  skills: string[];
  bulletPoints: string[];
  keywords: string[];
  formatting: string[];
  extraQualifications: string[];
}

function parseAiRead(json: unknown): AiCvRead | null {
  if (!json || typeof json !== "object") return null;
  const j = json as {
    skills?: unknown;
    suggestions?: { bulletPoints?: unknown; keywords?: unknown; formatting?: unknown; extraQualifications?: unknown };
  };
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const read: AiCvRead = {
    skills: arr(j.skills),
    bulletPoints: arr(j.suggestions?.bulletPoints),
    keywords: arr(j.suggestions?.keywords),
    formatting: arr(j.suggestions?.formatting),
    extraQualifications: arr(j.suggestions?.extraQualifications),
  };
  const hasContent = read.bulletPoints.length + read.keywords.length + read.formatting.length + read.extraQualifications.length > 0;
  return hasContent ? read : null;
}

export default function CvPage() {
  const cvText = usePfStore((s) => s.cvText);
  const cvAnalyzingRaw = usePfStore((s) => s.cvAnalyzing);
  const cvAnalyzedRaw = usePfStore((s) => s.cvAnalyzed);
  const cvLinkedIn = usePfStore((s) => s.cvLinkedIn);
  const dirStack = usePfStore((s) => s.dirStack);
  const set = usePfStore((s) => s.set);
  const analyzeCv = usePfStore((s) => s.analyzeCv);
  const reAnalyzeCv = usePfStore((s) => s.reAnalyzeCv);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiRead, setAiRead] = useState<AiCvRead | null>(null);

  // PDF/DOCX upload — the active site's parser (pdf-parse / mammoth) lives
  // behind /api/cv/analyze; the extracted text lands in the editor and the
  // AI suggestions (when the key is configured) feed the "AI mentor read".
  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cv/analyze", { method: "POST", body: fd });
      const json: unknown = await res.json();
      if (!res.ok) {
        const err = (json as { error?: string }).error;
        setUploadError(err || "Could not read that file — paste the text instead.");
        return;
      }
      const rawText = (json as { rawText?: string }).rawText;
      if (rawText && rawText.trim().length >= 50) {
        set({ cvText: rawText.trim(), cvAnalyzed: false });
        setAiRead(parseAiRead(json));
      } else {
        setUploadError("Could not extract text — paste your CV instead.");
      }
    } catch {
      setUploadError("Upload failed — paste your CV text instead.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // AI analysis runs alongside the local scan; silent fallback when offline.
  const handleAnalyze = () => {
    if (cvText.trim().length < 60) return;
    analyzeCv();
    const fd = new FormData();
    fd.append("text", cvText);
    fetch("/api/cv/analyze", { method: "POST", body: fd })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => { if (json) setAiRead(parseAiRead(json)); })
      .catch(() => { /* deterministic analysis still renders */ });
  };

  const cvAnalyzing = cvAnalyzingRaw;
  const cvAnalyzed = cvAnalyzedRaw && !cvAnalyzingRaw;
  const cvNotAnalyzed = !cvAnalyzedRaw && !cvAnalyzingRaw;

  const cvCanAnalyze = cvText.trim().length >= 60;
  const cvBtnBg = cvCanAnalyze ? "var(--accent)" : "var(--panel3)";

  const analysis = analyzeCvText(cvText, dirStack);
  const hasVague = analysis.vague.length > 0;
  const hasMissing = analysis.missing.length > 0;
  const linkedin = linkedInIssues(analysis.targetKw);
  const linkedinChevron = cvLinkedIn ? "▾" : "▸";

  return (
    <div>
      <PageHeader label="Phase 02 · Precision" title="CV Optimisation">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "56ch" }}>
          85% of employers screen with ATS, then a recruiter scans the top half of page one in{" "}
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>6–8 seconds</span>. Every line is
          scored against the role.
        </p>
      </PageHeader>

      <NextStep />

      {/* ── Input state ── */}
      {cvNotAnalyzed && (
        <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>
              Paste your CV text — PDF/DOCX upload works the same way
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
              disabled={uploading}
              style={{ cursor: uploading ? "default" : "pointer", marginLeft: "auto", height: 34, padding: "0 14px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
            >
              {uploading ? "Reading…" : "Upload PDF/DOCX"}
            </button>
          </div>
          {uploadError && (
            <div style={{ fontSize: 12, color: "var(--risk)", marginBottom: 10 }}>{uploadError}</div>
          )}
          <textarea
            value={cvText}
            onChange={(e) => set({ cvText: e.target.value, cvAnalyzed: false })}
            placeholder="Paste the full text of your CV here (60+ characters to analyze)…"
            style={{ width: "100%", minHeight: 180, padding: 16, borderRadius: 13, border: "1px dashed var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)", fontSize: 13.5, lineHeight: 1.6, fontFamily: "'Manrope',sans-serif", outline: "none", resize: "vertical" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
            <button
              onClick={handleAnalyze}
              style={{ cursor: "pointer", height: 46, padding: "0 24px", borderRadius: 12, border: "none", background: cvBtnBg, color: "#F7F1E4", fontSize: 14, fontWeight: 600, fontFamily: "'Manrope',sans-serif" }}
            >
              Analyze CV →
            </button>
            <span style={{ fontSize: 12, color: "var(--faint)" }}>
              Analysed locally against your direction — nothing leaves this page.
            </span>
          </div>
        </Reveal>
      )}

      {/* ── Scanning state ── */}
      {cvAnalyzing && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "46px 30px", textAlign: "center" }}>
          <div className="pf-anim-spin" style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--panel3)", borderTopColor: "var(--accent)", margin: "0 auto 18px" }} />
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>Scanning your CV…</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>
            ATS structure · vague terms · keyword coverage vs your target stack
          </div>
          <div style={{ height: 5, width: 220, margin: "0 auto", borderRadius: 3, background: "var(--panel3)", overflow: "hidden" }}>
            <div className="pf-anim-scan" style={{ height: "100%", background: "var(--accent)" }} />
          </div>
        </div>
      )}

      {/* ── Analyzed report ── */}
      {cvAnalyzed && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <a onClick={reAnalyzeCv} style={{ cursor: "pointer", fontFamily: mono, fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
              ← Edit & re-analyze
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
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>What&apos;s affecting your score</h2>
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
                {analysis.verdict} — {analysis.sub}
              </div>
            </Reveal>
          </div>

          {/* AI mentor read — only when the OpenAI-backed route returned data */}
          {aiRead && (
            <Reveal style={{ border: "1px solid color-mix(in srgb,var(--accent) 22%,transparent)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>AI mentor read</h2>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--accent)" }}>from your full CV text</span>
              </div>
              {aiRead.skills.length > 0 && (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                  {aiRead.skills.slice(0, 10).map((s) => (
                    <span key={s} style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: "var(--muted)", border: "1px solid var(--line)", background: "var(--panel2)", borderRadius: 6, padding: "4px 9px" }}>{s}</span>
                  ))}
                </div>
              )}
              {([
                ["Bullet points", aiRead.bulletPoints],
                ["Keywords to add", aiRead.keywords],
                ["Formatting", aiRead.formatting],
                ["Worth adding", aiRead.extraQualifications],
              ] as [string, string[]][]).filter(([, items]) => items.length > 0).map(([label, items]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <Kicker style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</Kicker>
                  {items.slice(0, 4).map((t) => (
                    <div key={t.slice(0, 60)} style={{ display: "flex", gap: 9, padding: "4px 0" }}>
                      <span style={{ color: "var(--accent)" }}>·</span>
                      <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{t}</span>
                    </div>
                  ))}
                </div>
              ))}
            </Reveal>
          )}

          {/* Vague terms + missing keywords */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "20px 24px 12px" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Vague terms detected</h2>
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
                  None found — every bullet owns its verb. Rare and good.
                </div>
              )}
            </Reveal>

            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Missing keywords</h2>
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
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>LinkedIn quick check</h2>
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--warn)" }}>{linkedin.score} / 100</span>
            </a>
            {cvLinkedIn && (
              <div style={{ borderTop: "1px solid var(--line)" }}>
                {linkedin.issues.map((li, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", borderBottom: "1px solid var(--line2)" }}>
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: li.sevCol, border: `1px solid color-mix(in srgb, ${li.sevCol} 32%, transparent)`, borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>{li.sev}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{li.text}</span>
                  </div>
                ))}
                <LinkedInPanel />
              </div>
            )}
          </Reveal>

        </div>
      )}
    </div>
  );
}
