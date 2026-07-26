"use client";

/**
 * AI review of the student's project portfolio.
 *
 * Companion to the LinkedIn review: the student pastes their project
 * descriptions / GitHub READMEs (a portfolio or GitHub URL is optional and used
 * only as context — the app does not scrape it), and gets back an honest read
 * against the standout-project qualities plus the highest-impact fixes.
 *
 * It never claims to have visited a link. Everything it says is grounded in the
 * text the student pasted, and the route fails visibly rather than inventing a
 * project that isn't there — a fabricated portfolio is the same credibility
 * problem as a fabricated CV.
 */

import { useState } from "react";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

interface ProjectFeedback {
  name: string;
  verdict?: string;
  missing?: string[];
}

interface PortfolioData {
  overallImpression?: string;
  strengths?: string[];
  gaps?: string[];
  projectFeedback?: ProjectFeedback[];
  topFixes?: string[];
}

export function PortfolioPanel() {
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const { data, loading, error, needsAuth, run } = useAiTask<AiEnvelope<PortfolioData>>("/api/portfolio/review");
  const review = data?.data;

  const ready = text.trim().length >= 40;

  const generate = async () => {
    if (!ready) return;
    const result = await run({
      portfolioText: text.trim(),
      portfolioUrl: url.trim() || undefined,
      targetRole: profile.targetRole || "Software Engineer",
      techStack: profile.targetKeywords,
    });
    if (result?.data?.overallImpression) emit("AiConsulted", "cv", "Reviewed the project portfolio");
  };

  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>Portfolio review</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch" }}>
        Paste your project descriptions or GitHub READMEs for an honest read against the standout-project
        qualities recruiters look for. A link is optional — it&apos;s context only, nothing is scraped.
      </span>

      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Portfolio or GitHub URL (optional)"
        className="pf-input"
        style={{ height: 44, padding: "0 15px", width: "100%", marginTop: 14 }}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your project descriptions / READMEs — what each project does, the stack, whether it's deployed, tested, documented…"
        style={{
          width: "100%", minHeight: 120, marginTop: 10, padding: 14, borderRadius: 13,
          border: "1px dashed var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)",
          fontSize: 13, lineHeight: 1.6, fontFamily: "'Manrope',sans-serif", outline: "none", resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <GenerateButton onClick={generate} loading={loading} disabled={!ready} loadingLabel="Reading…">
          {review ? "Re-review portfolio" : "Review my portfolio"}
        </GenerateButton>
        {!ready && (
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Paste at least one project description first.</span>
        )}
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {review && (
        <div style={{ marginTop: 18 }}>
          {review.overallImpression && (
            <AiSection title="Overall">
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{review.overallImpression}</p>
            </AiSection>
          )}
          {review.strengths?.length ? (
            <AiSection title="What's working"><AiList items={review.strengths} /></AiSection>
          ) : null}
          {review.gaps?.length ? (
            <AiSection title="Qualities most often missing"><AiList items={review.gaps} marker="!" /></AiSection>
          ) : null}

          {review.projectFeedback?.length ? (
            <AiSection title="Per project">
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {review.projectFeedback.map((p) => (
                  <div key={p.name} style={{ border: "1px solid var(--line2)", borderRadius: 11, background: "var(--panel2)", padding: "12px 14px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{p.name}</div>
                    {p.verdict && <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginBottom: p.missing?.length ? 8 : 0 }}>{p.verdict}</div>}
                    {p.missing?.length ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {p.missing.map((m) => <AiTag key={m} tone="var(--warn)">{m}</AiTag>)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </AiSection>
          ) : null}

          {review.topFixes?.length ? (
            <AiSection title="Highest-impact fixes"><AiList items={review.topFixes} /></AiSection>
          ) : null}

          <AiCaveat>
            Grounded only in what you pasted — it hasn&apos;t opened any link. Fix the gaps in the projects
            themselves, not just the wording.
          </AiCaveat>
        </div>
      )}
    </Reveal>
  );
}
