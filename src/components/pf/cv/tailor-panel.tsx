"use client";

/**
 * Tailoring the CV to one specific job — the ATS audit and the match score.
 *
 * Both routes take the same two inputs (a job description and the CV text), so
 * they share one paste box rather than asking the student to paste the same
 * advert twice. They stay on separate buttons because each one spends a real
 * slice of the daily AI quota, and a student who only wants a keyword pass
 * should not be charged for a match assessment they did not ask for.
 *
 * The match route reports non-negotiables — years of experience, visa status,
 * a clearance — at the envelope root rather than under `data`. Those are the
 * one part of this panel worth reading before the score: a 78% match on a role
 * that requires three years of professional experience is not a 78% chance.
 */

import { usePfStore } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

const mono = "'JetBrains Mono',monospace";

/** Shortest advert worth spending a generation on. Below this the model is
 *  inventing requirements rather than reading them. */
const MIN_JD = 80;

interface AtsData {
  criticalKeywords?: {
    keyword: string;
    foundInCV?: boolean;
    cvSection?: string;
    suggestedPlacement?: string;
    priority?: "critical" | "important" | "nice-to-have";
  }[];
  atsChecklist?: { item: string; passed?: boolean; fix?: string }[];
  overallATSScore?: number;
  tailoringSuggestions?: string[];
  readyToApply?: boolean;
}

interface MatchData {
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  assessmentTier?: string;
  guidance?: string;
}

interface NonNegotiable {
  requirement: string;
  category: "experience" | "location" | "visa" | "certification" | "clearance" | "degree";
  studentMeets: boolean;
  explanation: string;
}

/** The match route adds its blocker verdict alongside the envelope, not inside
 *  `data` — see `buildMatchScorePrompt`. */
export type MatchEnvelope = AiEnvelope<MatchData> & {
  nonNegotiables?: NonNegotiable[];
  hasBlockers?: boolean;
  blockerWarning?: string | null;
};

export type AtsEnvelope = AiEnvelope<AtsData>;

const PRIORITY_TONE = {
  critical: "var(--risk)",
  important: "var(--warn)",
  "nice-to-have": "var(--faint)",
} as const;

function scoreTone(n: number): string {
  if (n >= 75) return "var(--strong)";
  if (n >= 50) return "var(--warn)";
  return "var(--risk)";
}

export function TailorPanel() {
  const cvText = usePfStore((s) => s.cvText);
  const emit = usePfStore((s) => s.emit);
  const keepTailorResult = usePfStore((s) => s.keepTailorResult);
  // The advert and the results run against it live in the store, so leaving the
  // page doesn't lose them, and the job drawer can hand an advert over.
  const jd = usePfStore((s) => s.cvTailorJD);
  const setJd = usePfStore((s) => s.setTailorJD);
  const atsResult = usePfStore((s) => s.cvTailorAts);
  const matchResult = usePfStore((s) => s.cvTailorMatch);

  const ats = useAiTask<AtsEnvelope>("/api/cv/ats-audit");
  const match = useAiTask<MatchEnvelope>("/api/cv/match");

  const jobDescription = jd.trim();
  const ready = jobDescription.length >= MIN_JD && cvText.trim().length > 0;

  // Results are kept only if the advert is unchanged when they land; the store drops stale ones.
  const runAts = async () => {
    const forJD = jd;
    const result = await ats.run({ jobDescription, cvData: cvText });
    if (result?.data && keepTailorResult("ats", result, forJD)) {
      emit("AiConsulted", "cv", "Ran an ATS audit against a job description");
    }
  };

  const runMatch = async () => {
    const forJD = jd;
    const result = await match.run({ jobDescription, cvData: cvText });
    if (result?.data && keepTailorResult("match", result, forJD)) {
      emit("AiConsulted", "cv", "Scored the CV against a job description");
    }
  };

  const audit = atsResult?.data;
  const score = matchResult?.data;
  const blockers = matchResult?.nonNegotiables?.filter((n) => !n.studentMeets) ?? [];

  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 18 }}>
      <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 3px" }}>Tailor to a specific job</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch" }}>
        Paste the advert. The ATS audit finds the keywords their filter is looking for; the match
        score tells you whether the role is worth the hour it takes to apply properly.
      </span>

      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job description here…"
        style={{
          width: "100%", minHeight: 130, marginTop: 14, padding: 14, borderRadius: 13,
          border: "1px dashed var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)",
          fontSize: 13, lineHeight: 1.6, fontFamily: "'Manrope',sans-serif", outline: "none", resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <GenerateButton onClick={runAts} loading={ats.loading} disabled={!ready} loadingLabel="Auditing…">
          {audit ? "Re-run ATS audit" : "Run ATS audit"}
        </GenerateButton>
        <GenerateButton onClick={runMatch} loading={match.loading} disabled={!ready} loadingLabel="Scoring…" variant="ghost">
          {score ? "Re-score match" : "Score the match"}
        </GenerateButton>
        {!ready && (
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
            {cvText.trim() ? "Paste the advert to enable these." : "Add your CV text first."}
          </span>
        )}
      </div>

      <AiError message={ats.error} needsAuth={ats.needsAuth} />
      <AiError message={match.error} needsAuth={match.needsAuth} />

      {/* ── ATS audit result ── */}
      {audit && (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>ATS audit</h3>
            {typeof audit.overallATSScore === "number" && (
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: scoreTone(audit.overallATSScore) }}>
                {audit.overallATSScore} / 100
              </span>
            )}
          </div>

          {audit.criticalKeywords?.length ? (
            <AiSection title="Keywords their filter is looking for">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {audit.criticalKeywords.map((k) => (
                  <div key={k.keyword} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: mono, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
                        color: k.foundInCV ? "var(--strong)" : "var(--risk)",
                      }}
                    >
                      {k.foundInCV ? "✓" : "×"} {k.keyword}
                    </span>
                    {k.priority && <AiTag tone={PRIORITY_TONE[k.priority] ?? "var(--faint)"}>{k.priority}</AiTag>}
                    <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, flex: "1 1 220px" }}>
                      {k.foundInCV
                        ? k.cvSection
                          ? `Already in your ${k.cvSection}.`
                          : "Already in your CV."
                        : k.suggestedPlacement
                          ? `Missing — add it to your ${k.suggestedPlacement}.`
                          : "Missing from your CV."}
                    </span>
                  </div>
                ))}
              </div>
            </AiSection>
          ) : null}

          {audit.atsChecklist?.length ? (
            <AiSection title="Format checks">
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {audit.atsChecklist.map((c) => (
                  <div key={c.item} style={{ display: "flex", gap: 9, fontSize: 12.5, lineHeight: 1.55 }}>
                    <span style={{ color: c.passed ? "var(--strong)" : "var(--warn)", flexShrink: 0 }}>
                      {c.passed ? "✓" : "!"}
                    </span>
                    <span style={{ color: "var(--muted)" }}>
                      {c.item}
                      {!c.passed && c.fix ? ` — ${c.fix}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </AiSection>
          ) : null}

          {audit.tailoringSuggestions?.length ? (
            <AiSection title="Before you send it"><AiList items={audit.tailoringSuggestions} /></AiSection>
          ) : null}

          <AiCaveat>
            Keyword advice is a first draft against this one advert. Only add a keyword you can
            evidence in a bullet — an ATS match you cannot talk about in the interview costs you more
            than the filter did.
          </AiCaveat>
        </div>
      )}

      {/* ── Match result ── */}
      {score && (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>Role match</h3>
            {typeof score.matchScore === "number" && (
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: scoreTone(score.matchScore) }}>
                {score.matchScore}%{score.assessmentTier ? ` · ${score.assessmentTier}` : ""}
              </span>
            )}
          </div>

          {/* Blockers first — a high score means nothing if a hard requirement rules you out. */}
          {blockers.length > 0 && (
            <div
              role="status"
              style={{
                marginTop: 13, border: "1px solid color-mix(in srgb,var(--risk) 34%,transparent)",
                background: "color-mix(in srgb,var(--risk) 8%,transparent)", borderRadius: 11, padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)", marginBottom: 7 }}>
                {matchResult?.blockerWarning || "Hard requirements you may not meet"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {blockers.map((n) => (
                  <div key={n.requirement} style={{ display: "flex", gap: 9, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <AiTag tone="var(--risk)">{n.category}</AiTag>
                    <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, flex: "1 1 220px" }}>
                      <strong style={{ color: "var(--fg)", fontWeight: 600 }}>{n.requirement}</strong> — {n.explanation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {score.guidance && (
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: "13px 0 0" }}>{score.guidance}</p>
          )}

          {score.matchedSkills?.length ? (
            <AiSection title="What lines up">
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {score.matchedSkills.map((s) => <AiTag key={s} tone="var(--strong)">{s}</AiTag>)}
              </div>
            </AiSection>
          ) : null}

          {score.missingSkills?.length ? (
            <AiSection title="What doesn't">
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {score.missingSkills.map((s) => <AiTag key={s} tone="var(--warn)">{s}</AiTag>)}
              </div>
            </AiSection>
          ) : null}

          {matchResult?.nextSteps?.length ? (
            <AiSection title="Next steps"><AiList items={matchResult.nextSteps} /></AiSection>
          ) : null}

          <AiCaveat>
            A match score is one model&apos;s reading of one advert, not a probability of getting the
            job. Treat a low score as a prompt to check the gaps, not as a reason not to apply.
          </AiCaveat>
        </div>
      )}
    </Reveal>
  );
}
