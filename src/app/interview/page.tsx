"use client";

/**
 * Phase 05 — Interview Preparation. LeetCode pattern tracker, STAR story
 * builder, likely questions, company briefing and post-interview reflections.
 */

import { IV_TABS } from "@/lib/pf/data";
import { usePfStore } from "@/lib/pf/store";
import { STORY_TARGET } from "@/lib/pf/progress";
import { PageHeader, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";
import { StarTab } from "@/components/pf/interview/star-tab";
import { QuestionsTab } from "@/components/pf/interview/questions-tab";
import { BriefingTab } from "@/components/pf/interview/briefing-tab";
import { LeetTab } from "@/components/pf/interview/leetcode-tab";
import { AnswerGuides } from "@/components/pf/interview/answer-guides";
import { PracticePanel } from "@/components/pf/interview/practice-panel";
import { FeedbackAnalysis } from "@/components/pf/interview/feedback-analysis";

function FeedbackTab() {
  const s = usePfStore();
  const canSave = !!(s.fbCompany.trim() && s.fbRating);
  // Interview-stage tracker cards, so the reflection names the same company the board does.
  const interviewCards = s.board.flatMap((col) => col.cards.filter((c) => col.id === "interview" || c.reachedInterview));
  return (
    <Reveal style={{ maxWidth: 720 }}>
      <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 16 }}>
        <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 4px" }}>Log a post-interview reflection</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Captured while it&apos;s fresh. Patterns emerge after 3+ entries</span>
        {interviewCards.length > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
            {interviewCards.map((c) => {
              const label = `${c.company} · ${c.role}`;
              const on = s.fbCompany === label;
              return (
                <button
                  key={c.key}
                  onClick={() => s.set({ fbCompany: label })}
                  style={{
                    cursor: "pointer", height: 30, padding: "0 12px", borderRadius: 9,
                    border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                    background: on ? "var(--accentSoft)" : "var(--panel2)",
                    color: on ? "var(--accentText)" : "var(--muted)",
                    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  }}
                >
                  {c.company}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, margin: "16px 0 12px", alignItems: "center" }}>
          <input
            value={s.fbCompany}
            onChange={(e) => s.set({ fbCompany: e.target.value })}
            placeholder="Company · role"
            className="pf-input"
            style={{ height: 44, padding: "0 15px" }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => s.set({ fbRating: n })}
                role="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                style={{ cursor: "pointer", fontSize: 22, color: s.fbRating >= n ? "var(--warn)" : "var(--faint)" }}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <textarea
          value={s.fbNote}
          onChange={(e) => s.set({ fbNote: e.target.value })}
          placeholder="What went well? What question caught you out?"
          className="pf-input"
          style={{ width: "100%", minHeight: 70, padding: "12px 15px", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
        />
        <button className="pf-shine"
          onClick={s.saveFeedback}
          disabled={!canSave}
          style={{ cursor: canSave ? "pointer" : "default", marginTop: 12, height: 42, padding: "0 20px", borderRadius: 11, border: "none", background: canSave ? "var(--accent)" : "var(--panel3)", color: canSave ? "var(--onAccent)" : "var(--faint)", fontSize: 13, fontWeight: 600 }}
        >
          Save reflection
        </button>
      </div>

      <FeedbackAnalysis />

      {s.ivFeedback.length === 0 && (
        <div style={{ border: "1px dashed var(--lineStrong)", borderRadius: 14, padding: "18px 20px", fontSize: 13, color: "var(--muted)" }}>
          No reflections yet. Your first interview is data: log it here within 24 hours while the questions are fresh.
        </div>
      )}
      {s.ivFeedback.map((f, i) => (
        <div key={f.company + f.date + i} style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", padding: "15px 18px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{f.company}</span>
            <span style={{ fontSize: 13, color: "var(--warn)" }}>{"★★★★★".slice(0, f.rating)}</span>
            <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--faint)" }}>{f.date}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>{f.note}</div>
        </div>
      ))}
    </Reveal>
  );
}

export default function InterviewPage() {
  const ivTab = usePfStore((s) => s.ivTab);
  const set = usePfStore((s) => s.set);
  const stories = usePfStore((s) => s.savedStories.length);

  return (
    <div>
      <PageHeader label="Phase 05 · Mastery" title="Interview Preparation">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "56ch" }}>
          Pattern-based technical prep plus {STORY_TARGET} prepared <span style={{ color: "var(--fg)", fontWeight: 600 }}>STARL</span> stories
          {" "}(<span className="pf-mono" style={{ color: "var(--fg)" }}>{stories} of {STORY_TARGET}</span> saved so far). Confidence is built, not summoned.
        </p>
      </PageHeader>

      <NextStep />

      <Reveal style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {IV_TABS.map(([k, label]) => {
          const on = ivTab === k;
          return (
            <button
              key={k}
              onClick={() => set({ ivTab: k })}
              style={{
                cursor: "pointer", height: 38, padding: "0 18px", borderRadius: 10,
                border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                background: on ? "var(--accent)" : "var(--panel)",
                color: on ? "var(--onAccent)" : "var(--muted)",
                fontSize: 13, fontWeight: 600, transition: "background-color .2s var(--ease), border-color .2s var(--ease), color .2s var(--ease), transform .16s cubic-bezier(.23,1,.32,1)",
              }}
            >
              {label}
            </button>
          );
        })}
      </Reveal>

      {ivTab === "leetcode" && (
        <>
          <LeetTab />
          <PracticePanel />
        </>
      )}
      {ivTab === "star" && <StarTab />}
      {ivTab === "questions" && (
        <>
          <QuestionsTab />
          <AnswerGuides />
        </>
      )}
      {ivTab === "briefing" && <BriefingTab />}
      {ivTab === "feedback" && <FeedbackTab />}
    </div>
  );
}
