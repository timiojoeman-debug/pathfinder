"use client";

/**
 * AI read of the saved pipeline: why each role fits, and the three moves with
 * the most leverage right now.
 *
 * Two things make this route different from the rest of the AI surfaces:
 *
 *  - It is not an envelope. `/api/intel/analyze` uses `aiShape`, so `roles` and
 *    `priorityMoves` come back at the root.
 *  - It degrades to HTTP 200. On any failure it answers
 *    `{source:"heuristic", roles:[], priorityMoves:[]}` rather than an error, so
 *    `useAiTask` sees a success and reports nothing. An empty panel would be
 *    the exact silent failure this codebase keeps getting bitten by, so the
 *    `source` field is checked explicitly and a degraded answer is stated.
 *
 * Only saved jobs that carry real job-description text are sent. Asking the
 * model which skills a role requires without giving it the advert produces a
 * confident list of invented requirements.
 */

import { useState } from "react";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { studentProfileLine } from "@/lib/pf/ai-context";
import { useAiTask } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

const mono = "'JetBrains Mono',monospace";

interface IntelRole {
  company: string;
  fitReason: string;
  recommendedMove: string;
  requiredSkills?: string[];
}

interface PriorityMove {
  action: string;
  why: string;
  impact: string;
  kind: string;
}

interface IntelResult {
  source?: "ai" | "heuristic";
  roles?: IntelRole[];
  priorityMoves?: PriorityMove[];
}

const KIND_TONE: Record<string, string> = {
  cv: "var(--warn)",
  networking: "var(--accent)",
  jobs: "var(--active)",
  interview: "var(--strong)",
  direction: "var(--muted)",
};

export function IntelAnalysisPanel() {
  const savedJobs = usePfStore((s) => s.savedJobs);
  const cvText = usePfStore((s) => s.cvText);
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const [degraded, setDegraded] = useState(false);

  const { data, loading, error, needsAuth, run } = useAiTask<IntelResult>("/api/intel/analyze");

  // Only roles with a real advert behind them.
  const analysable = savedJobs.filter((j) => (j.jdText ?? "").trim().length > 0);
  const ready = analysable.length > 0;

  const generate = async () => {
    setDegraded(false);
    const result = await run({
      roles: analysable.slice(0, 12).map((j) => ({
        company: j.company,
        role: j.role,
        jobDescription: (j.jdText ?? "").slice(0, 600),
      })),
      cvSummary: cvText.trim() || studentProfileLine(profile),
      direction: profile.directionStatement ?? "",
    });

    // A 200 with `source: "heuristic"` is the route's failure path, not a result.
    if (result && result.source !== "ai") {
      setDegraded(true);
      return;
    }
    if (result?.priorityMoves?.length) {
      emit("AiConsulted", "jobs", `Analysed ${analysable.length} saved roles for priority moves`);
    }
  };

  const roles = data?.source === "ai" ? (data.roles ?? []) : [];
  const moves = data?.source === "ai" ? (data.priorityMoves ?? []) : [];

  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 className="pf-display-sm" style={{ fontSize: 24, margin: 0 }}>Priority moves</h2>
        <span style={{ fontFamily: mono, fontSize: 11, color: "var(--faint)" }}>
          {ready ? `${analysable.length} role${analysable.length === 1 ? "" : "s"} with a full advert` : "needs saved roles"}
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "58ch", marginTop: 4 }}>
        Reads your saved adverts against your CV and direction, then ranks the three actions with the
        most leverage on the pipeline you actually have.
      </span>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
        <GenerateButton onClick={generate} loading={loading} disabled={!ready} loadingLabel="Analysing…">
          {moves.length ? "Re-analyse pipeline" : "Analyse my pipeline"}
        </GenerateButton>
        {!ready && (
          <span style={{ fontSize: 11.5, color: "var(--faint)", maxWidth: "42ch", lineHeight: 1.5 }}>
            {savedJobs.length > 0
              ? "Your saved roles have no job-description text yet. Save a role with its full advert to analyse it."
              : "Save a role in Opportunity Discovery first."}
          </span>
        )}
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {degraded && (
        <div
          role="alert"
          style={{
            marginTop: 12, border: "1px solid color-mix(in srgb,var(--warn) 34%,transparent)",
            background: "color-mix(in srgb,var(--warn) 8%,transparent)", borderRadius: 11,
            padding: "11px 14px", fontSize: 12.5, lineHeight: 1.55, color: "var(--fg)",
          }}
        >
          The analyser couldn&apos;t read your pipeline this time and returned nothing rather than
          guessing. Your ranked pipeline below is unaffected. Try again in a moment.
        </div>
      )}

      {moves.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {moves.map((m, i) => {
            const tone = KIND_TONE[m.kind] ?? "var(--accent)";
            return (
              <div
                key={m.action}
                style={{
                  border: "1px solid var(--line)", borderRadius: 13, background: "var(--panel2)",
                  padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start",
                }}
              >
                <span
                  className="pf-mono"
                  style={{
                    fontSize: 11, fontWeight: 700, color: tone, flexShrink: 0, paddingTop: 1, fontFamily: mono,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.action}</span>
                    <AiTag tone={tone}>{m.kind}</AiTag>
                    {m.impact && (
                      <span className="pf-mono" style={{ fontSize: 10.5, fontWeight: 700, color: tone, fontFamily: mono }}>
                        {m.impact}
                      </span>
                    )}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>{m.why}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {roles.length > 0 && (
        <AiSection title="Role by role">
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {roles.map((r) => (
              <div key={r.company} style={{ borderLeft: "2px solid var(--lineStrong)", paddingLeft: 12 }}>
                <div style={{ display: "flex", gap: 9, alignItems: "baseline", flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{r.company}</span>
                  {r.recommendedMove && (
                    <span className="pf-mono" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent)", fontFamily: mono }}>
                      {r.recommendedMove}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>{r.fitReason}</div>
                {r.requiredSkills?.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                    {r.requiredSkills.map((s) => <AiTag key={s} tone="var(--active)">{s}</AiTag>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </AiSection>
      )}

      {moves.length > 0 && (
        <AiCaveat>
          Ranked from the adverts you saved and the CV text you pasted, not from any knowledge of who
          else applied. Treat the ordering as a prompt to think, not a verdict.
        </AiCaveat>
      )}
    </Reveal>
  );
}
