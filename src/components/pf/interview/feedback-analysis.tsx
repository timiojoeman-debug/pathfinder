"use client";

/**
 * AI analysis of a post-interview reflection.
 *
 * This sits under the local reflection log rather than replacing it. Logging is
 * the habit worth building and it must keep working offline and logged-out;
 * the analysis is the optional layer on top.
 *
 * It analyses one reflection: the one being written above (company, stars and
 * notes come from that form, not a second copy of it), or, when that form is
 * empty, the most recently saved one. Its company and star rating are sent as
 * this interview's, so the thank-you note can name the company. Earlier
 * reflections go only into the pattern context, never as this interview's ratings.
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

/** What `saveFeedback` stores when the note was left blank. Not a reflection. */
const EMPTY_NOTE = "No reflections logged.";

interface FeedbackData {
  analysis?: string;
  patternDetection?: string[];
  prepRecommendations?: string[];
  followUpEmail?: string;
}

export function FeedbackAnalysis() {
  const ivFeedback = usePfStore((s) => s.ivFeedback);
  const fbCompany = usePfStore((s) => s.fbCompany);
  const fbRating = usePfStore((s) => s.fbRating);
  const fbNote = usePfStore((s) => s.fbNote);
  const emit = usePfStore((s) => s.emit);

  const [type, setType] = useState<string>(TYPES[0]);
  const [questions, setQuestions] = useState("");
  const [wouldChange, setWouldChange] = useState("");

  // The reflection being analysed: the draft above, else the latest saved one.
  const draft = fbCompany.trim() ? { company: fbCompany.trim(), rating: fbRating, note: fbNote.trim(), date: null as string | null } : null;
  const latest = ivFeedback[0];
  const subject = draft ?? (latest ? { ...latest, note: latest.note === EMPTY_NOTE ? "" : latest.note } : null);
  const earlier = draft ? ivFeedback : ivFeedback.slice(1);
  const totalLogged = subject ? earlier.length + 1 : 0;

  const { data, loading, error, needsAuth, run } = useAiTask<AiEnvelope<FeedbackData>>(
    "/api/interview/feedback",
  );
  const result = data?.data;

  const ready = !!subject && (questions.trim().length > 0 || subject.note.length > 0);

  const generate = async () => {
    if (!ready || !subject) return;
    const previous = earlier
      .slice(0, CONTEXT_LIMIT)
      .map((f) => `${f.company} (${f.rating}/5, ${f.date}): ${f.note}`)
      .join("\n");

    const res = await run({
      interviewType: type,
      company: subject.company,
      questionsAsked: questions.trim(),
      // This interview's own stars, from the reflection form. Not a second
      // set of sliders asking the same question again.
      selfRatings: subject.rating ? { overall: subject.rating } : {},
      wentWell: subject.note,
      wouldChange: wouldChange.trim(),
      previousInterviews: previous,
    });
    if (res?.data?.analysis) emit("AiConsulted", "interview", `Analysed a ${type.toLowerCase()} interview · ${subject.company}`);
  };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 16 }}>
      <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 3px" }}>Analyse what happened</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch" }}>
        Connects the questions you were asked to the gaps in your prep, and drafts the thank-you note
        while the conversation is still fresh.
      </span>

      <div style={{ fontSize: 12.5, marginTop: 12, color: subject ? "var(--fg)" : "var(--faint)" }}>
        {subject ? (
          <>
            Analysing <strong>{subject.company}</strong>
            {subject.rating ? <span style={{ color: "var(--warn)" }}> {"★★★★★".slice(0, subject.rating)}</span> : null}
            <span style={{ color: "var(--faint)" }}>{subject.date ? ` · saved ${subject.date}` : " · from the form above, not saved yet"}</span>
          </>
        ) : (
          "Fill in the reflection above (company and how it went) and the analysis reads it from there."
        )}
      </div>

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
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", transition: "background-color .2s var(--ease), border-color .2s var(--ease), color .2s var(--ease), transform .16s cubic-bezier(.23,1,.32,1)",
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
        {!ready && subject && (
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
            Add the questions they asked, or notes in the reflection above.
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
                totalLogged > 1
                  ? `Patterns across ${totalLogged} interviews`
                  : "Possible patterns (only one interview logged)"
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

          {totalLogged < 3 && (
            <div className="pf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 13, lineHeight: 1.5, fontFamily: mono }}>
              {totalLogged === 0 ? "No" : totalLogged} interview
              {totalLogged === 1 ? "" : "s"} to compare: patterns get real at three or more.
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
