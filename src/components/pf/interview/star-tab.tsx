"use client";

/**
 * STARL story builder (Situation, Task, Action, Result, plus an optional Learnings beat).
 * The prompts were previously scaffolding only: text to read, nothing to write into. Now the
 * student drafts each beat and the builder tightens it against the methodology, returning a
 * version that fits a 3-5 minute answer plus the questions that story actually answers.
 *
 * `/api/interview/star-builder` builds its prompt from `rawStory.situation`
 * etc., so the body must carry the beats as an object. Sending a single
 * string produces a prompt full of "undefined" and a confidently wrong result.
 *
 * Saved stories are the evidence behind "stories prepared": the page header
 * counts them and they feed interview readiness. A story is saveable only with
 * the four required beats written, either the student's draft or the tightened version.
 * Learnings is optional, and stories saved with four beats still render.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { STORY_TARGET } from "@/lib/pf/progress";
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
  { id: "ai_usage", name: "AI usage" },
] as const;

const BEATS = [
  { k: "situation", mark: "S", label: "Situation", prompt: "Set the scene briefly: where were you and what was at stake?" },
  { k: "task", mark: "T", label: "Task", prompt: "What was your specific responsibility or goal?" },
  { k: "action", mark: "A", label: "Action", prompt: 'What did you do? Lead with "I…" verbs and be concrete.' },
  { k: "result", mark: "R", label: "Result", prompt: "The measurable outcome. Quantify where you can: numbers make it even better." },
  { k: "learnings", mark: "L", label: "Learnings (optional)", prompt: "What would you do differently, and what did you take into later work?" },
] as const;

type BeatKey = (typeof BEATS)[number]["k"];
type RawStory = Record<BeatKey, string>;

const EMPTY_STORY: RawStory = { situation: "", task: "", action: "", result: "", learnings: "" };

/** The four beats a story needs before it can be saved. Learnings is optional. */
const REQUIRED_BEATS = BEATS.filter((b) => b.k !== "learnings");

interface StarData {
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  learnings?: string;
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

const complete = (s: Partial<RawStory>): boolean => REQUIRED_BEATS.every((b) => !!s[b.k]?.trim());

/** Drops an empty learnings beat so a four-beat story is saved exactly as before. */
const withLearnings = (beats: Omit<RawStory, "learnings">, learnings?: string): Omit<RawStory, "learnings"> & { learnings?: string } =>
  learnings?.trim() ? { ...beats, learnings } : beats;

function SavedStories() {
  const savedStories = usePfStore((s) => s.savedStories);
  const deleteStory = usePfStore((s) => s.deleteStory);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Your prepared stories</h3>
        <span className="pf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{savedStories.length} / {STORY_TARGET}</span>
      </div>
      {savedStories.length === 0 && (
        <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "8px 0 0" }}>
          None saved yet. Write the four main beats and save it: aim for {STORY_TARGET} stories that cover different questions.
        </p>
      )}
      {savedStories.map((st) => (
        <details key={st.id} style={{ borderTop: "1px solid var(--line2)", padding: "11px 0 3px", marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>{st.title}</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" }}>
            {BEATS.map((b) => (st[b.k] ? (
              <div key={b.k} style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                <strong>{b.mark}.</strong> <span style={{ color: "var(--muted)" }}>{st[b.k]}</span>
              </div>
            ) : null))}
          </div>
          {confirmId === st.id ? (
            <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              Delete this story?
              <button onClick={() => deleteStory(st.id)} style={{ cursor: "pointer", border: "none", background: "var(--risk)", color: "var(--onAccent)", borderRadius: 8, height: 28, padding: "0 11px", fontSize: 12, fontWeight: 600 }}>Delete</button>
              <button onClick={() => setConfirmId(null)} style={{ cursor: "pointer", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)", borderRadius: 8, height: 28, padding: "0 11px", fontSize: 12, fontWeight: 600 }}>Keep</button>
            </span>
          ) : (
            <button onClick={() => setConfirmId(st.id)} style={{ cursor: "pointer", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--risk)", borderRadius: 8, height: 28, padding: "0 11px", fontSize: 12, fontWeight: 600 }}>
              Delete
            </button>
          )}
        </details>
      ))}
    </div>
  );
}

export function StarTab() {
  const emit = usePfStore((s) => s.emit);
  const saveStory = usePfStore((s) => s.saveStory);
  const [story, setStory] = useState<RawStory>(EMPTY_STORY);
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [title, setTitle] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const categoryName = CATEGORIES.find((c) => c.id === category)?.name ?? category;
  const save = (beats: RawStory, which: string) => {
    const { learnings, ...core } = beats;
    if (saveStory({ title: title.trim() || categoryName, ...withLearnings(core, learnings) })) setSavedMsg(`Saved ${which}.`);
  };

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
      emit("AiConsulted", "interview", `Structured a STAR story: ${name}`);
    }
  };

  return (
    <Reveal style={{ maxWidth: 720 }}>
      <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
        <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 3px" }}>STARL story builder</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "52ch" }}>
          Draft each beat roughly; messy is fine. The builder tightens it to an answer that fits 3–5 minutes and tells you which questions it answers.
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
                  transition: "background-color .2s var(--ease), border-color .2s var(--ease), color .2s var(--ease), transform .16s cubic-bezier(.23,1,.32,1)",
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
                  style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "var(--onAccent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
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

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Title (defaults to "${categoryName}")`}
          aria-label="Story title"
          className="pf-input"
          style={{ width: "100%", height: 40, padding: "0 13px", fontSize: 12.5, marginTop: 10 }}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          <GenerateButton onClick={build} loading={loading} disabled={!hasEnough} loadingLabel="Structuring…">
            {built ? "Rebuild story" : "Build my story"}
          </GenerateButton>
          {!hasEnough && (
            <span style={{ fontSize: 12, color: "var(--faint)" }}>Sketch the situation and what you did, and this unlocks.</span>
          )}
          {hasEnough && !story.result.trim() && (
            <span style={{ fontSize: 12, color: "var(--warn)" }}>No result yet, and that&apos;s the beat interviewers remember.</span>
          )}
          <button
            onClick={() => save(story, "your draft")}
            disabled={!complete(story)}
            title={complete(story) ? undefined : "Write the four main beats to save"}
            style={{ cursor: complete(story) ? "pointer" : "default", height: 40, padding: "0 16px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: complete(story) ? "var(--fg)" : "var(--faint)", fontSize: 13, fontWeight: 600 }}
          >
            Save my draft
          </button>
        </div>
        {savedMsg && <div role="status" style={{ fontSize: 12, color: "var(--strong)", marginTop: 8 }}>{savedMsg}</div>}

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
                      style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "var(--onAccent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
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

          {complete(built) && (
            <button
              onClick={() => save({ situation: built.situation!, task: built.task!, action: built.action!, result: built.result!, learnings: built.learnings ?? story.learnings }, "the tightened version")}
              style={{ cursor: "pointer", marginTop: 14, height: 40, padding: "0 16px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--onAccent)", fontSize: 13, fontWeight: 600 }}
            >
              Save the tightened version
            </button>
          )}

          <AiCaveat>
            A starting structure, not your answer. Rewrite it in your own words and practise it out loud.
          </AiCaveat>
        </div>
      )}

      <SavedStories />
    </Reveal>
  );
}
