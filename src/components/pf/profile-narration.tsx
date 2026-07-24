"use client";

/**
 * The AI's narration of the derived profile.
 *
 * Strictly a presentation layer over `deriveProfile()`. The facts sent to the
 * route are already-derived values, the progress figures are pre-rendered from
 * `progress.ts` before they leave the client, and nothing that comes back is
 * written to the store or read by any derivation. That separation is the whole
 * design: `computeProgress()` stays evidence-derived, and the model only gets
 * to rephrase what the evidence already said.
 *
 * It is labelled as narration in the UI for the same reason. A paragraph of
 * fluent prose about someone's career reads as authoritative, and a student
 * should be able to tell at a glance which parts of this page are computed
 * from their work and which part is a model retelling it.
 */

import { useProfile, useProgress, usePfStore } from "@/lib/pf/store";
import { useAiTask } from "@/lib/pf/use-ai";
import { relativeTime } from "@/lib/pf/events";
import { AiError, GenerateButton } from "@/components/pf/ai-panel";

const mono = "var(--font-mono), 'JetBrains Mono', monospace";

/** Events summarised as context. Enough for a sense of momentum, not so many
 *  that the model starts narrating the log instead of the profile. */
const RECENT_LIMIT = 8;

interface Narration {
  narration?: string;
  focus?: string;
}

export function ProfileNarration() {
  const profile = useProfile();
  const progress = useProgress();
  const emit = usePfStore((s) => s.emit);

  const { data, loading, error, needsAuth, run } = useAiTask<Narration>("/api/mentor/narrate");

  // There is no point narrating an empty profile — the model would be asked to
  // make something of nothing, which is exactly when it invents.
  const hasSubstance =
    profile.directionSet ||
    profile.cvAnalyzed ||
    profile.strengths.length > 0 ||
    profile.events.length > 0;

  const generate = async () => {
    const result = await run({
      directionStatement: profile.directionStatement ?? undefined,
      targetRole: profile.targetRole ?? undefined,
      currentPhase: profile.currentPhase,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      currentSkills: profile.currentSkills.slice(0, 20),
      missingSkills: profile.missingSkills.slice(0, 20),
      // Rendered here, so the model quotes figures rather than deriving them.
      progressLines: [
        `${progress.overall}% overall (${progress.band})`,
        ...progress.phases.map((p) => `${p.pct}% ${p.label}`),
      ],
      recentActivity: profile.events
        .slice(0, RECENT_LIMIT)
        .map((e) => `${e.label} (${relativeTime(e.ts)})`),
    });
    if (result?.narration) emit("AiConsulted", "direction", "Asked for a read of the whole profile");
  };

  const narration = data?.narration;

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
        <span
          style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}
        >
          In the mentor&apos;s words
        </span>
        <GenerateButton
          onClick={generate}
          loading={loading}
          disabled={!hasSubstance}
          loadingLabel="Reading…"
          variant="ghost"
        >
          {narration ? "Read it again" : "Have the mentor read it back"}
        </GenerateButton>
        {!hasSubstance && (
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
            Not enough here to narrate yet — set your direction first.
          </span>
        )}
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {narration && (
        <div
          style={{
            marginTop: 12,
            borderLeft: "2px solid color-mix(in srgb,var(--accent) 45%,transparent)",
            paddingLeft: 14,
          }}
        >
          {narration.split(/\n{2,}|\n/).map((para, i) => (
            <p
              key={i}
              style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg)", margin: i === 0 ? "0 0 10px" : "0 0 10px" }}
            >
              {para.trim()}
            </p>
          ))}

          {data?.focus && (
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--muted)", margin: "0 0 10px", fontWeight: 600 }}>
              {data.focus}
            </p>
          )}

          <div style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, fontStyle: "italic" }}>
            A retelling of the panel above, not a separate assessment. Every figure it quotes is
            computed from your logged work — the wording is the only part the model chose.
          </div>
        </div>
      )}
    </div>
  );
}
