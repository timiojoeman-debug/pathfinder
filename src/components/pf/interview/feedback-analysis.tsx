"use client";

/**
 * AI analysis of a post-interview reflection.
 *
 * This sits under the local reflection log rather than replacing it. Logging is
 * the habit worth building and it must keep working offline and logged-out;
 * the analysis is the optional layer on top.
 *
 * Previously logged reflections are passed as context, because the useful
 * output here is the pattern across interviews — one interview analysed alone
 * mostly restates what the student already wrote. The panel says how many
 * interviews the pattern is drawn from, so a "pattern" spotted across a single
 * entry is not read as a trend.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { AiCaveat, AiError, AiList, AiSection, GenerateButton } from "@/components/pf/ai-panel";

const mono = "'JetBrains Mono',monospace";

/** How many past reflections to send. Enough for a pattern, short enough to
 *  leave the prompt room for the interview being analysed. */
const CONTEXT_LIMIT = 6;

const TYPES = ["Behavioural", "Technical", "System design", "Mixed / screen"] as const;

interface FeedbackData {
  analysis?: string;
  patternDetection?: string[];
  prepRecommendations?: string[];
  followUpEmail?: string;
}

export function FeedbackAnalysis() {
  const ivFeedback = usePfStore((s) => s.ivFeedback);
  const emit = usePfStore((s) => s.emit);

  const [type, setType] = useState<string>(TYPES[0]);
  const [questions, setQuestions] = useState("");
  const [wentWell, setWentWell] = useState("");
  const [wouldChange, setWouldChange] = useState("");

  const { data, loading, error, needsAuth, run } = useAiTask<AiEnvelope<FeedbackData>>(
    "/api/interview/feedback",
  );
  const result = data?.data;

  const ready = questions.trim().length > 0 || wentWell.trim().length > 0;

  const generate = async () => {
    if (!ready) return;
    const previous = ivFeedback
      .slice(0, CONTEXT_LIMIT)
      .map((f) => `${f.company} (${f.rating}/5, ${f.date}): ${f.note}`)
      .join("\n");

    const res = await run({
      interviewType: type,
      questionsAsked: questions.trim(),
      // Self-ratings come from the reflections already logged, not from a
      // second set of sliders asking the same question again.
      selfRatings: Object.fromEntries(ivFeedback.slice(0, CONTEXT_LIMIT).map((f) => [f.company, f.rating])),
      wentWell: wentWell.trim(),
      wouldChange: wouldChange.trim(),
      previousInterviews: previous,
    });
    if (res?.data?.analysis) emit("AiConsulted", "interview", `Analysed a ${type.toLowerCase()} interview`);
  };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>Analyse what happened</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch" }}>
        Connects the questions you were asked to the gaps in your prep, and drafts the thank-you note
        while the conversation is still fresh.
      </span>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 15 }}>
        {TYPES.map((t) => {
          const on = type === t;
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                cursor: "pointer", height: 32, padding: "0 13px", borderRadius: 9,
                border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                background: on ? "var(--accentSoft)" : "var(--panel2)",
                color: on ? "var(--accentText)" : "var(--muted)",
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", transition: "all .2s var(--ease)",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <textarea
        value={questions}
        onChange={(e) => setQuestions(e.target.value)}
        placeholder="What did they actually ask? One per line is fine."
        className="pf-input"
        style={{ width: "100%", minHeight: 80, marginTop: 12, padding: "12px 15px", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
      />
      <textarea
        value={wentWell}
        onChange={(e) => setWentWell(e.target.value)}
        placeholder="What went well?"
        className="pf-input"
        style={{ width: "100%", minHeight: 60, marginTop: 10, padding: "12px 15px", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
      />
      <textarea
        value={wouldChange}
        onChange={(e) => setWouldChange(e.target.value)}
        placeholder="What would you do differently?"
        className="pf-input"
        style={{ width: "100%", minHeight: 60, marginTop: 10, padding: "12px 15px", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <GenerateButton onClick={generate} loading={loading} disabled={!ready} loadingLabel="Analysing…">
          {result ? "Re-analyse" : "Analyse this interview"}
        </GenerateButton>
        {!ready && (
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
            Add the questions or what went well.
          </span>
        )}
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {result && (
        <div style={{ marginTop: 18 }}>
          {result.analysis && (
            <AiSection title="What this tells you">
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{result.analysis}</p>
            </AiSection>
          )}

          {result.patternDetection?.length ? (
            <AiSection
              title={
                ivFeedback.length > 1
                  ? `Patterns across ${ivFeedback.length} logged interviews`
                  : "Possible patterns — only one interview logged"
              }
            >
              <AiList items={result.patternDetection} />
            </AiSection>
          ) : null}

          {result.prepRecommendations?.length ? (
            <AiSection title="Change in your prep"><AiList items={result.prepRecommendations} /></AiSection>
          ) : null}

          {result.followUpEmail && (
            <AiSection title="Thank-you note">
              <div
                style={{
                  border: "1px dashed var(--lineStrong)", background: "var(--panel2)", borderRadius: 12,
                  padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "var(--fg)", whiteSpace: "pre-wrap",
                }}
              >
                {result.followUpEmail}
              </div>
            </AiSection>
          )}

          {ivFeedback.length < 3 && (
            <div className="pf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 13, lineHeight: 1.5, fontFamily: mono }}>
              {ivFeedback.length === 0 ? "No" : ivFeedback.length} reflection
              {ivFeedback.length === 1 ? "" : "s"} logged — patterns get real at three or more.
            </div>
          )}

          <AiCaveat>
            This reads only what you wrote down, so it inherits your memory of the room. It cannot
            tell you why you were or were not moved forward.
          </AiCaveat>
        </div>
      )}
    </div>
  );
}
