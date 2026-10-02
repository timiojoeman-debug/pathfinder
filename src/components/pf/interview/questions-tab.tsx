"use client";

/**
 * Likely interview questions, generated against the student's own CV and
 * target role rather than a canned list. The route (`/api/interview/questions`)
 * serves a static fallback set when the model misbehaves, flagged
 * `source: "fallback"`; the panel says so rather than presenting generic
 * questions as ones generated for this student.
 */

import { useMemo } from "react";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { useAiTask } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiTag, GenerateButton } from "@/components/pf/ai-panel";

interface GeneratedQuestion {
  type: string;
  question: string;
  answerTemplate: string;
}

/** The route caps CV text implicitly via the model context; keep the payload
 *  sane so a 12-page CV does not blow the request size. */
const CV_CHARS = 4000;

const TYPE_TONE: Record<string, string> = {
  Behavioral: "var(--active)",
  Behavioural: "var(--active)",
  Technical: "var(--accent)",
  Situational: "var(--warn)",
  "CV-Specific": "var(--strong)",
  "AI usage": "var(--active)",
};

export function QuestionsTab() {
  const cvText = usePfStore((s) => s.cvText);
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const { data, loading, error, needsAuth, run } = useAiTask<{ questions?: GeneratedQuestion[]; source?: "ai" | "fallback" }>(
    "/api/interview/questions",
  );

  const targetRole = profile.targetRole ? `${profile.targetRole} Intern` : null;
  const questions = useMemo(() => data?.questions ?? [], [data]);
  const degraded = data?.source === "fallback";

  const generate = async (harder: boolean) => {
    const result = await run({
      cvSummary: cvText.slice(0, CV_CHARS),
      targetRole: targetRole ?? "Software Engineering Intern",
      more: harder,
      ...(harder ? { difficulty: "harder" } : {}),
    });
    // A served fallback is not a consult: nothing was generated for this student.
    if (result?.questions?.length && result.source !== "fallback") {
      emit(
        "AiConsulted",
        "interview",
        `Generated ${result.questions.length} likely questions${targetRole ? ` for ${targetRole}` : ""}`,
      );
    }
  };

  return (
    <Reveal style={{ maxWidth: 720 }}>
      <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
        <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 3px" }}>Likely questions</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "52ch" }}>
          {targetRole
            ? <>Behavioural, technical, situational and CV-specific questions for <strong style={{ color: "var(--fg)" }}>{targetRole}</strong>.</>
            : <>Set a career direction first and these sharpen to your target role. Until then they assume a software engineering internship.</>}
          {cvText.trim()
            ? " Your uploaded CV is used, so the CV-specific ones quote your actual projects."
            : " Upload a CV in Phase 02 and the CV-specific questions will quote your real projects instead of generic ones."}
        </span>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <GenerateButton onClick={() => generate(false)} loading={loading} loadingLabel="Thinking…">
            {questions.length ? "Regenerate" : "Generate questions"}
          </GenerateButton>
          {questions.length > 0 && !degraded && (
            <GenerateButton onClick={() => generate(true)} loading={loading} variant="ghost" loadingLabel="Thinking…">
              Give me harder ones
            </GenerateButton>
          )}
        </div>

        <AiError message={error} needsAuth={needsAuth} />
        {degraded && (
          <div role="status" style={{ marginTop: 12, fontSize: 12.5, color: "var(--warn)", lineHeight: 1.6 }}>
            The generator didn&apos;t answer, so these are four generic practice questions, not ones written
            from your CV or role. Try again in a minute for a tailored set.
          </div>
        )}
      </div>

      {questions.map((q, i) => (
        <div
          key={`${i}-${q.question.slice(0, 32)}`}
          style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", padding: "16px 18px", marginTop: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, flexWrap: "wrap" }}>
            <AiTag tone={TYPE_TONE[q.type] ?? "var(--muted)"}>{q.type}</AiTag>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, marginBottom: 9 }}>{q.question}</div>
          {q.answerTemplate && (
            <div style={{ borderLeft: "2px solid var(--lineStrong)", paddingLeft: 12, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
              {q.answerTemplate}
            </div>
          )}
        </div>
      ))}

      {questions.length > 0 && !degraded && (
        <AiCaveat>
          A first draft of what they are likely to ask, not the actual paper.
        </AiCaveat>
      )}

      {questions.some((q) => q.answerTemplate) && (
        <AiCaveat>
          A starting structure, not your answer. Rewrite it in your own words and practise it out loud.
        </AiCaveat>
      )}
    </Reveal>
  );
}
