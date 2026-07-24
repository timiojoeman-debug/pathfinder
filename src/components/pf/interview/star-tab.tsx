"use client";

/**
 * STAR story builder. The four prompts were previously scaffolding only — text
 * to read, nothing to write into. Now the student drafts each beat and the
 * builder tightens it against the methodology, returning a 60–90 second version
 * plus the questions that story actually answers.
 *
 * `/api/interview/star-builder` builds its prompt from `rawStory.situation`
 * etc., so the body must carry the four beats as an object. Sending a single
 * string produces a prompt full of "undefined" and a confidently wrong result.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

/** Mirrors `storyCategories` in lib/methodology/interview-prep.ts. */
const CATEGORIES = [
  { id: "challenge", name: "Challenge overcome" },
  { id: "teamwork", name: "Teamwork" },
  { id: "leadership", name: "Leadership" },
  { id: "failure", name: "Failure & learning" },
  { id: "time_pressure", name: "Time pressure" },
] as const;

const BEATS = [
  { k: "situation", mark: "S", label: "Situation", prompt: "Set the scene in one sentence — where were you and what was at stake?" },
  { k: "task", mark: "T", label: "Task", prompt: "What was your specific responsibility or goal?" },
  { k: "action", mark: "A", label: "Action", prompt: 'What did you do? Lead with "I…" verbs and be concrete.' },
  { k: "result", mark: "R", label: "Result", prompt: "The measurable outcome — a number, or what changed because of you." },
] as const;

type BeatKey = (typeof BEATS)[number]["k"];
type RawStory = Record<BeatKey, string>;

const EMPTY_STORY: RawStory = { situation: "", task: "", action: "", result: "" };

interface StarData {
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  mappedQuestions?: string[];
  estimatedDuration?: string;
  tips?: string[];
}

const QUALITY_TONE: Record<string, string> = {
  strong: "var(--strong)",
  good: "var(--strong)",
  vague: "var(--warn)",
  weak: "var(--risk)",
  poor: "var(--risk)",
};

function toneFor(quality: string | undefined): string {
  if (!quality) return "var(--muted)";
  const key = Object.keys(QUALITY_TONE).find((k) => quality.toLowerCase().includes(k));
  return key ? QUALITY_TONE[key] : "var(--muted)";
}

export function StarTab() {
  const emit = usePfStore((s) => s.emit);
  const [story, setStory] = useState<RawStory>(EMPTY_STORY);
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);

  const { data, loading, error, needsAuth, run } = useAiTask<
    AiEnvelope<StarData> & { inputQuality?: string; inputQualityExplanation?: string }
  >("/api/interview/star-builder");
  const built = data?.data;

  // The result beat carries the whole story's weight — a draft without it is
  // the single most common failure the methodology calls out, so require the
  // other three but nudge rather than block on this one.
  const hasEnough = story.situation.trim().length > 10 && story.action.trim().length > 10;

  const build = async () => {
    if (!hasEnough) return;
    const result = await run({ rawStory: story, category });
    if (result?.data?.situation) {
      const name = CATEGORIES.find((c) => c.id === category)?.name ?? category;
      emit("AiConsulted", "interview", `Structured a STAR story — ${name}`);
    }
  };

  return (
    <Reveal style={{ maxWidth: 720 }}>
      <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>STAR story builder</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "52ch" }}>
          Draft each beat roughly — messy is fine. The builder tightens it to 60–90 seconds and tells you which questions it answers.
        </span>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "15px 0 4px" }}>
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                style={{
                  cursor: "pointer", height: 32, padding: "0 13px", borderRadius: 9,
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  background: on ? "var(--accentSoft)" : "var(--panel2)",
                  color: on ? "var(--accentText)" : "var(--muted)",
                  fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  transition: "all .2s var(--ease)",
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {BEATS.map((b) => (
            <div key={b.k} style={{ border: "1px solid var(--line)", borderRadius: 11, padding: "12px 14px", background: "var(--panel2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                <span
                  className="pf-mono"
                  style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "#F7F1E4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                >
                  {b.mark}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{b.label}</span>
              </div>
              <textarea
                value={story[b.k]}
                onChange={(e) => setStory((s) => ({ ...s, [b.k]: e.target.value }))}
                placeholder={b.prompt}
                className="pf-input"
                style={{ width: "100%", minHeight: 58, padding: "10px 13px", fontSize: 12.5, lineHeight: 1.6, resize: "vertical" }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          <GenerateButton onClick={build} loading={loading} disabled={!hasEnough} loadingLabel="Structuring…">
            {built ? "Rebuild story" : "Build my story"}
          </GenerateButton>
          {!hasEnough && (
            <span style={{ fontSize: 12, color: "var(--faint)" }}>Sketch the situation and what you did, and this unlocks.</span>
          )}
          {hasEnough && !story.result.trim() && (
            <span style={{ fontSize: 12, color: "var(--warn)" }}>No result yet — that&apos;s the beat interviewers remember.</span>
          )}
        </div>

        <AiError message={error} needsAuth={needsAuth} />
      </div>

      {built && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Your story, tightened</h3>
            {data?.inputQuality && <AiTag tone={toneFor(data.inputQuality)}>{data.inputQuality}</AiTag>}
            {built.estimatedDuration && <AiTag tone="var(--muted)">{built.estimatedDuration}</AiTag>}
          </div>
          {data?.inputQualityExplanation && (
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "4px 0 0" }}>{data.inputQualityExplanation}</p>
          )}

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {BEATS.map((b) => {
              const text = built[b.k];
              if (!text) return null;
              return (
                <div key={b.k} style={{ border: "1px solid var(--line)", borderRadius: 11, padding: "12px 14px", background: "var(--panel2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                    <span
                      className="pf-mono"
                      style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "#F7F1E4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                    >
                      {b.mark}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{b.label}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65 }}>{text}</div>
                </div>
              );
            })}
          </div>

          {built.mappedQuestions?.length ? (
            <AiSection title="Questions this story answers"><AiList items={built.mappedQuestions} marker="?" /></AiSection>
          ) : null}

          {data?.feedback?.length ? (
            <AiSection title="What to fix">
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {data.feedback.map((f, i) => (
                  <div key={`${i}-${f.issue ?? ""}`} style={{ borderLeft: "2px solid var(--lineStrong)", paddingLeft: 12 }}>
                    {f.issue && <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{f.issue}</div>}
                    {f.suggestedFix && <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>{f.suggestedFix}</div>}
                  </div>
                ))}
              </div>
            </AiSection>
          ) : null}

          {built.tips?.length ? <AiSection title="Delivery"><AiList items={built.tips} /></AiSection> : null}

          <AiCaveat>
            Say it out loud once before you accept it — if a phrase isn&apos;t yours, it will sound like it isn&apos;t yours.
          </AiCaveat>
        </div>
      )}
    </Reveal>
  );
}
