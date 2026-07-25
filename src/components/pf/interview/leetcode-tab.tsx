"use client";

/**
 * The LeetCode practice list — 18 categories, 100 real problems.
 *
 * This replaced a counter-per-pattern UI built on five invented categories.
 * Because the problems are now real, progress is tracked per problem rather
 * than as a number a student increments: they tick the ones they solved, and
 * the category counts are derived. That also means the page can link straight
 * out to the problem, which the old "+" button could not do because the
 * problems it was counting did not exist.
 *
 * Categories collapse by default — eighteen expanded lists is not a study aid.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { LEETCODE_CATEGORIES, LEETCODE_TOTAL, NEETCODE_URL, type LeetDifficulty } from "@/lib/pf/leetcode";
import { Reveal } from "@/components/pf/ui";

const mono = "'JetBrains Mono',monospace";

const DIFFICULTY_TONE: Record<LeetDifficulty, string> = {
  Easy: "var(--strong)",
  Medium: "var(--warn)",
  Hard: "var(--risk)",
};

function toneFor(ratio: number): string {
  if (ratio >= 0.65) return "var(--strong)";
  if (ratio >= 0.4) return "var(--warn)";
  return "var(--faint)";
}

export function LeetTab() {
  const ivProblems = usePfStore((s) => s.ivProblems);
  const toggleProblem = usePfStore((s) => s.toggleProblem);
  const [open, setOpen] = useState<string | null>(null);

  const rows = LEETCODE_CATEGORIES.map((c) => {
    const total = c.problems.length;
    const solved = c.problems.filter((p) => ivProblems[p.slug]).length;
    const ratio = solved / total;
    return { ...c, total, solved, ratio, tone: toneFor(ratio) };
  });

  const solvedSum = rows.reduce((n, r) => n + r.solved, 0);

  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden", maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "20px 24px 6px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>LeetCode patterns · Blind 75</h2>
        <span className="pf-mono" style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: mono }}>
          {solvedSum} / {LEETCODE_TOTAL} solved
        </span>
      </div>

      <p style={{ padding: "0 24px 12px", margin: 0, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, maxWidth: "62ch" }}>
        The Blind 75 is the standard shortlist for CS interviews: master these patterns — not 500 random
        problems — and most technical rounds become recognisable. Depth over volume is the whole point:
        interviewers test whether you can spot the pattern and reason out loud, so understanding one
        problem per pattern deeply beats grinding dozens shallowly.
      </p>

      {rows.map((r) => {
        const on = open === r.name;
        return (
          <div key={r.name} style={{ borderTop: "1px solid var(--line2)" }}>
            <button
              onClick={() => setOpen(on ? null : r.name)}
              aria-expanded={on}
              style={{
                cursor: "pointer", width: "100%", textAlign: "left", border: "none", background: "transparent",
                display: "flex", alignItems: "center", gap: 13, padding: "9px 24px", color: "var(--fg)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, width: 12, flexShrink: 0, color: "var(--faint)" }}>
                {on ? "▾" : "▸"}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, minWidth: 0 }}>{r.name}</span>
              <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--panel3)", overflow: "hidden", maxWidth: 150 }}>
                <span className="pf-anim-grow" style={{ display: "block", height: "100%", width: `${Math.round(r.ratio * 100)}%`, background: r.tone }} />
              </span>
              <span className="pf-mono" style={{ fontSize: 11.5, fontWeight: 700, color: r.tone, width: 46, textAlign: "right", fontFamily: mono }}>
                {r.solved}/{r.total}
              </span>
            </button>

            {on && (
              <div style={{ background: "var(--panel2)", borderTop: "1px solid var(--line2)" }}>
                {r.problems.map((p) => {
                  const solved = !!ivProblems[p.slug];
                  return (
                    <div
                      key={p.slug}
                      style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 24px 8px 49px", borderBottom: "1px solid var(--line2)" }}
                    >
                      <input
                        type="checkbox"
                        checked={solved}
                        onChange={() => toggleProblem(p.slug)}
                        aria-label={`Mark ${p.name} as solved`}
                        style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
                      />
                      <span className="pf-mono" style={{ fontSize: 10.5, color: "var(--faint)", width: 34, flexShrink: 0, fontFamily: mono }}>
                        {p.number}
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.5, textDecoration: "none",
                          color: solved ? "var(--faint)" : "var(--fg)",
                        }}
                      >
                        {p.name}
                      </a>
                      <span
                        className="pf-mono"
                        style={{
                          fontSize: 9.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 700,
                          color: DIFFICULTY_TONE[p.difficulty], width: 52, textAlign: "right", flexShrink: 0, fontFamily: mono,
                        }}
                      >
                        {p.difficulty}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ padding: "12px 24px", fontSize: 11.5, color: "var(--faint)", lineHeight: 1.6, borderTop: "1px solid var(--line2)" }}>
        Tick a problem once you have solved it — the title links to LeetCode, and progress persists
        between sessions. Category sizes are uneven because the list is: Trees has 11, Stack and
        Advanced Graphs have 1.{" "}
        <a
          href={NEETCODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          Finished these? Continue on NeetCode 150 →
        </a>
      </div>
    </Reveal>
  );
}
