"use client";

/**
 * Practice a problem, then have your solution rated.
 *
 * The problem is drawn from the real Blind 75 list, not generated. There is
 * an AI route (`/interview/random-problem`) that invents a problem and a
 * LeetCode URL, but a hallucinated link is the exact fabrication the verified
 * list was built to remove — so "surprise me" picks from `LEETCODE_PROBLEMS`
 * client-side, links to the real problem, and skips anything already solved.
 *
 * The rating is the AI part (`/interview/rate-solution`). It scores the
 * student's own solution, so an honest low score is the point — and the route
 * now fails visibly rather than returning a canned 8/10 when the model is down.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { LEETCODE_PROBLEMS, type LeetProblem, type LeetDifficulty } from "@/lib/pf/leetcode";
import { useAiTask } from "@/lib/pf/use-ai";
import { AiCaveat, AiError, AiList, AiSection, GenerateButton } from "@/components/pf/ai-panel";

const mono = "'JetBrains Mono',monospace";

const DIFFICULTY_TONE: Record<LeetDifficulty, string> = {
  Easy: "var(--strong)",
  Medium: "var(--warn)",
  Hard: "var(--risk)",
};

interface RatingData {
  timeComplexity?: string;
  spaceComplexity?: string;
  lineCount?: number;
  rating?: number;
  feedback?: string;
  topTwoApproaches?: string[];
}

function ratingTone(n: number): string {
  if (n >= 7) return "var(--strong)";
  if (n >= 4) return "var(--warn)";
  return "var(--risk)";
}

/** Pick an unsolved problem at random; fall back to the whole list once every
 *  problem is ticked, so the button never dead-ends. */
function pickProblem(solved: Record<string, boolean>, avoidSlug?: string): LeetProblem {
  const unsolved = LEETCODE_PROBLEMS.filter((p) => !solved[p.slug] && p.slug !== avoidSlug);
  const pool = unsolved.length ? unsolved : LEETCODE_PROBLEMS.filter((p) => p.slug !== avoidSlug);
  const from = pool.length ? pool : LEETCODE_PROBLEMS;
  return from[Math.floor(Math.random() * from.length)];
}

export function PracticePanel() {
  const ivProblems = usePfStore((s) => s.ivProblems);
  const emit = usePfStore((s) => s.emit);

  const [problem, setProblem] = useState<LeetProblem | null>(null);
  const [solution, setSolution] = useState("");

  const { data, loading, error, needsAuth, run, reset } = useAiTask<RatingData>("/api/interview/rate-solution");
  const rating = data;

  const nextProblem = () => {
    setProblem(pickProblem(ivProblems, problem?.slug));
    setSolution("");
    reset();
  };

  const rate = async () => {
    if (!problem || solution.trim().length < 15) return;
    const result = await run({ problemTitle: problem.name, userSolution: solution });
    if (result?.feedback) emit("AiConsulted", "interview", `Rated a solution to ${problem.name}`);
  };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginTop: 14, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>Practice &amp; rate</h2>
        <span className="pf-mono" style={{ fontSize: 10.5, color: "var(--faint)", fontFamily: mono }}>
          a random problem from the list
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch", marginTop: 3 }}>
        Pick a problem you haven&apos;t solved, work it on LeetCode, then paste your approach for an
        honest read on complexity and clarity.
      </span>

      <div style={{ marginTop: 14 }}>
        <GenerateButton onClick={nextProblem} loading={false} variant="ghost">
          {problem ? "Another problem" : "Give me a problem"}
        </GenerateButton>
      </div>

      {problem && (
        <div style={{ marginTop: 14 }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: 13, background: "var(--panel2)", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fg)", textDecoration: "none" }}
              >
                {problem.number}. {problem.name} ↗
              </a>
              <span
                className="pf-mono"
                style={{ fontSize: 9.5, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 700, color: DIFFICULTY_TONE[problem.difficulty], fontFamily: mono }}
              >
                {problem.difficulty}
              </span>
            </div>
          </div>

          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Paste your solution or explain your approach and its complexity…"
            className="pf-input"
            style={{ width: "100%", minHeight: 130, marginTop: 12, padding: "12px 15px", fontSize: 12.5, lineHeight: 1.6, resize: "vertical", fontFamily: mono }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
            <GenerateButton onClick={rate} loading={loading} disabled={solution.trim().length < 15} loadingLabel="Rating…">
              {rating ? "Re-rate" : "Rate my solution"}
            </GenerateButton>
            {solution.trim().length < 15 && (
              <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Write your approach first.</span>
            )}
          </div>

          <AiError message={error} needsAuth={needsAuth} />
        </div>
      )}

      {rating && typeof rating.rating === "number" && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span className="pf-mono" style={{ fontSize: 22, fontWeight: 700, color: ratingTone(rating.rating), fontFamily: mono }}>
              {rating.rating}<span style={{ fontSize: 13, color: "var(--faint)" }}>/10</span>
            </span>
            {rating.timeComplexity && (
              <span className="pf-mono" style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: mono }}>
                time {rating.timeComplexity}
              </span>
            )}
            {rating.spaceComplexity && (
              <span className="pf-mono" style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: mono }}>
                space {rating.spaceComplexity}
              </span>
            )}
          </div>

          {rating.feedback && (
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: "12px 0 0" }}>{rating.feedback}</p>
          )}

          {rating.topTwoApproaches?.length ? (
            <AiSection title="More efficient approaches"><AiList items={rating.topTwoApproaches} /></AiSection>
          ) : null}

          <AiCaveat>
            A model&apos;s read of the approach you described, not a test run of your code. Verify the
            complexity claims against your actual implementation.
          </AiCaveat>
        </div>
      )}
    </div>
  );
}
