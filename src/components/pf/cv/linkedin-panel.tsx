"use client";

/**
 * AI review of the LinkedIn headline and About section.
 *
 * This sits under the deterministic quick-check rather than replacing it. The
 * local check catches the rules that never need a model ("Aspiring", third
 * person, no stack); this one reads what the student actually wrote and returns
 * the recruiter keywords for their specific target role.
 *
 * The suggested headline and opener are offered as text to react to, not to
 * paste unread — a profile written entirely by a model is the same credibility
 * problem as a CV written entirely by one.
 */

import { useState } from "react";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

const mono = "'JetBrains Mono',monospace";

interface LinkedInData {
  headlineScore?: number;
  aboutScore?: number;
  suggestedHeadline?: string;
  suggestedAboutOpener?: string;
}

interface KeywordRow {
  keyword: string;
  priority?: "critical" | "important" | "helpful";
  foundInProfile?: boolean;
  suggestedPlacement?: string;
}

/** `keywordAnalysis` is returned beside the envelope, not inside `data`. */
type LinkedInEnvelope = AiEnvelope<LinkedInData> & {
  keywordAnalysis?: {
    totalKeywords?: number;
    foundInProfile?: number;
    keywords?: KeywordRow[];
  };
};

const PRIORITY_TONE = {
  critical: "var(--risk)",
  important: "var(--warn)",
  helpful: "var(--faint)",
} as const;

function scoreTone(n: number): string {
  if (n >= 75) return "var(--strong)";
  if (n >= 50) return "var(--warn)";
  return "var(--risk)";
}

/** A read-only suggestion the student copies deliberately, rather than a field
 *  that silently overwrites what they wrote. */
function Suggestion({ label, text }: { label: string; text: string }) {
  return (
    <AiSection title={label}>
      <div
        style={{
          border: "1px solid var(--line)", background: "var(--panelSolid)", borderRadius: 11,
          padding: "12px 14px", fontSize: 13, lineHeight: 1.6, color: "var(--fg)",
        }}
      >
        {text}
      </div>
    </AiSection>
  );
}

export function LinkedInPanel() {
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");

  const { data, loading, error, needsAuth, run } = useAiTask<LinkedInEnvelope>("/api/linkedin/check");
  const review = data?.data;
  const keywords = data?.keywordAnalysis?.keywords ?? [];

  const ready = headline.trim().length > 0 || about.trim().length > 0;

  const generate = async () => {
    if (!ready) return;
    const result = await run({
      headline: headline.trim(),
      aboutSection: about.trim(),
      targetRole: profile.targetRole || "Software Engineer",
      techStack: profile.targetKeywords,
      industry: profile.targetIndustry || "Technology",
    });
    if (result?.data) emit("AiConsulted", "cv", "Reviewed the LinkedIn headline and About section");
  };

  return (
    <div style={{ padding: "18px 24px", borderTop: "1px solid var(--line)" }}>
      <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: "0 0 3px" }}>Review what you actually wrote</h3>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch" }}>
        Paste your current headline and About section for a read against your target role, plus the
        keywords recruiters search for it.
      </span>

      <input
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder="Your current LinkedIn headline"
        className="pf-input"
        style={{ height: 44, padding: "0 15px", width: "100%", marginTop: 14 }}
      />
      <textarea
        value={about}
        onChange={(e) => setAbout(e.target.value)}
        placeholder="Your current About section…"
        style={{
          width: "100%", minHeight: 110, marginTop: 10, padding: 14, borderRadius: 13,
          border: "1px dashed var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)",
          fontSize: 13, lineHeight: 1.6, fontFamily: "'Manrope',sans-serif", outline: "none", resize: "vertical",
        }}
      />

      <div style={{ marginTop: 12 }}>
        <GenerateButton onClick={generate} loading={loading} disabled={!ready} loadingLabel="Reading…">
          {review ? "Re-review profile" : "Review my profile"}
        </GenerateButton>
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {review && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {typeof review.headlineScore === "number" && (
              <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: scoreTone(review.headlineScore) }}>
                Headline {review.headlineScore} / 100
              </span>
            )}
            {typeof review.aboutScore === "number" && (
              <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: scoreTone(review.aboutScore) }}>
                About {review.aboutScore} / 100
              </span>
            )}
          </div>

          {data?.feedback?.length ? (
            <AiSection title="What to change">
              <AiList
                items={data.feedback
                  .map((f) => [f.issue, f.suggestedFix].filter(Boolean).join(": "))
                  .filter((s) => s.length > 0)}
              />
            </AiSection>
          ) : null}

          {review.suggestedHeadline && <Suggestion label="Suggested headline" text={review.suggestedHeadline} />}
          {review.suggestedAboutOpener && <Suggestion label="Suggested opener" text={review.suggestedAboutOpener} />}

          {keywords.length > 0 && (
            <AiSection title="Recruiter keywords for your target role">
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {keywords.map((k) => (
                  <div key={k.keyword} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: mono, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
                        color: k.foundInProfile ? "var(--strong)" : "var(--muted)",
                      }}
                    >
                      {k.foundInProfile ? "✓" : "×"} {k.keyword}
                    </span>
                    {k.priority && <AiTag tone={PRIORITY_TONE[k.priority] ?? "var(--faint)"}>{k.priority}</AiTag>}
                    {!k.foundInProfile && k.suggestedPlacement && (
                      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, flex: "1 1 200px" }}>
                        Add to your {k.suggestedPlacement}.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </AiSection>
          )}

          <AiCaveat>
            Keyword lists are inferred from the role you typed, not from LinkedIn&apos;s search index.
            Rewrite the suggestions in your own voice: a profile that does not sound like you falls
            apart in the first conversation.
          </AiCaveat>
        </div>
      )}
    </div>
  );
}
