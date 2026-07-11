"use client";

/**
 * Phase 05 — Interview Preparation. LeetCode pattern tracker, STAR story
 * builder, likely questions, company briefing and post-interview reflections.
 */

import {
  COMPANY_BRIEFING,
  INTERVIEW_QUESTIONS,
  IV_TABS,
  LEETCODE_BASE_SOLVED,
  LEETCODE_PATTERNS,
  STAR_STORY,
} from "@/lib/pf/data";
import { usePfStore } from "@/lib/pf/store";
import { PageHeader, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";

function LeetTab() {
  const s = usePfStore();
  let solvedSum = LEETCODE_BASE_SOLVED;
  const rows = LEETCODE_PATTERNS.map(([name, total, def]) => {
    const cur = Math.min(total, s.ivSolved[name] ?? def);
    solvedSum += cur;
    const r = cur / total;
    return {
      name, total, def,
      count: cur + "/" + total,
      pct: Math.round(r * 100) + "%",
      tone: r >= 0.65 ? "var(--strong)" : r >= 0.4 ? "var(--warn)" : "var(--risk)",
    };
  });

  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden", maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "20px 24px 12px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>LeetCode patterns · NeetCode 75</h2>
        <span className="pf-mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>{solvedSum} / 75 solved</span>
      </div>
      {rows.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 13, padding: "9px 24px", borderTop: "1px solid var(--line2)" }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
          <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--panel3)", overflow: "hidden", maxWidth: 150 }}>
            <span className="pf-anim-grow" style={{ display: "block", height: "100%", width: p.pct, background: p.tone }} />
          </span>
          <span className="pf-mono" style={{ fontSize: 11.5, fontWeight: 700, color: p.tone, width: 44, textAlign: "right" }}>{p.count}</span>
          <button
            onClick={() => s.bumpPattern(p.name, p.total, p.def)}
            title="Log a solved problem"
            className="pf-mono"
            style={{ cursor: "pointer", width: 28, height: 28, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--accent)", fontSize: 14, fontWeight: 700 }}
          >
            +
          </button>
        </div>
      ))}
      <div style={{ padding: "12px 24px", fontSize: 11.5, color: "var(--faint)" }}>
        Tick <span className="pf-mono" style={{ color: "var(--accent)" }}>+</span> each time you solve a problem — progress persists between sessions.
      </div>
    </Reveal>
  );
}

function StarTab() {
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", maxWidth: 720 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>STAR story builder</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>&quot;Tell me about a time you handled conflict&quot;</span>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {STAR_STORY.map((st) => (
          <div key={st.k} style={{ border: "1px solid var(--line)", borderRadius: 11, padding: "12px 14px", background: "var(--panel2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
              <span className="pf-mono" style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "#F7F1E4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{st.k}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>{st.text}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function QuestionsTab() {
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden", maxWidth: 720 }}>
      <div style={{ padding: "20px 24px 12px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Likely questions · tailored to your direction</h2>
      </div>
      {INTERVIEW_QUESTIONS.map((q) => (
        <div key={q.q} style={{ padding: "14px 24px", borderTop: "1px solid var(--line2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
            <span className="pf-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", color: q.tone, border: `1px solid color-mix(in srgb, ${q.tone} 32%, transparent)`, borderRadius: 5, padding: "2px 8px" }}>{q.type}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{q.q}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>{q.a}</div>
        </div>
      ))}
    </Reveal>
  );
}

function BriefingTab() {
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Company briefing · Skyscanner</h2>
        <span className="pf-mono" style={{ fontSize: 10.5, color: "var(--accent)" }}>auto-generated</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {COMPANY_BRIEFING.map((b) => (
          <div key={b.label} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", background: "var(--panel2)" }}>
            <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 7 }}>{b.label}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{b.text}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function FeedbackTab() {
  const s = usePfStore();
  const canSave = !!(s.fbCompany.trim() && s.fbRating);
  return (
    <Reveal style={{ maxWidth: 720 }}>
      <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Log a post-interview reflection</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Captured while it&apos;s fresh — patterns emerge after 3+ entries</span>
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
        <button
          onClick={s.saveFeedback}
          disabled={!canSave}
          style={{ cursor: canSave ? "pointer" : "default", marginTop: 12, height: 42, padding: "0 20px", borderRadius: 11, border: "none", background: canSave ? "var(--accent)" : "var(--panel3)", color: "#F7F1E4", fontSize: 13, fontWeight: 600 }}
        >
          Save reflection
        </button>
      </div>

      {s.ivFeedback.length === 0 && (
        <div style={{ border: "1px dashed var(--lineStrong)", borderRadius: 14, padding: "18px 20px", fontSize: 13, color: "var(--muted)" }}>
          No reflections yet. Your first interview is data — log it here within 24 hours while the questions are fresh.
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

  return (
    <div>
      <PageHeader label="Phase 05 · Mastery" title="Interview Preparation">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "56ch" }}>
          Pattern-based technical prep plus five prepared <span style={{ color: "var(--fg)", fontWeight: 600 }}>STAR</span> stories. Confidence is built, not summoned.
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
                color: on ? "#F7F1E4" : "var(--muted)",
                fontSize: 13, fontWeight: 600, transition: "all .2s var(--ease)",
              }}
            >
              {label}
            </button>
          );
        })}
      </Reveal>

      {ivTab === "leetcode" && <LeetTab />}
      {ivTab === "star" && <StarTab />}
      {ivTab === "questions" && <QuestionsTab />}
      {ivTab === "briefing" && <BriefingTab />}
      {ivTab === "feedback" && <FeedbackTab />}
    </div>
  );
}
