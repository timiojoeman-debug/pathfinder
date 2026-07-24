"use client";

/**
 * The naturalness verdict on a generated message.
 *
 * The outreach routes have always computed this and the UI has always thrown it
 * away, showing a fixed "reads natural" badge instead — a claim the product had
 * no evidence for and could not withdraw when the model produced something that
 * plainly did not read natural. This renders the real result, including the
 * unflattering ones, and lists what to fix.
 *
 * Renders nothing when there is no result, rather than defaulting to a pass.
 */

import type { ReactNode } from "react";
import { AiList, AiSection } from "@/components/pf/ai-panel";

export interface NaturalnessIssue {
  type?: string;
  description?: string;
  location?: string;
  suggestion?: string;
}

export interface Naturalness {
  score?: number;
  verdict?: "natural" | "mostly_natural" | "needs_editing" | "heavily_ai";
  issues?: NaturalnessIssue[];
}

const VERDICT = {
  natural: { label: "reads natural", tone: "var(--strong)" },
  mostly_natural: { label: "mostly natural", tone: "var(--strong)" },
  needs_editing: { label: "needs editing", tone: "var(--warn)" },
  heavily_ai: { label: "reads AI-written", tone: "var(--risk)" },
} as const;

/** The badge alone, for headers that only have room for the verdict. */
export function NaturalnessBadge({ result }: { result?: Naturalness | null }): ReactNode {
  if (!result?.verdict) return null;
  const v = VERDICT[result.verdict];
  if (!v) return null;
  return (
    <span
      className="pf-mono"
      style={{
        fontSize: 10, fontWeight: 700, color: v.tone,
        border: `1px solid color-mix(in srgb,${v.tone} 30%,transparent)`,
        borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap",
      }}
    >
      {v.label}
      {typeof result.score === "number" ? ` · ${result.score}` : ""}
    </span>
  );
}

export function NaturalnessNote({ result }: { result?: Naturalness | null }) {
  if (!result?.verdict) return null;
  const issues = (result.issues ?? [])
    .map((i) => [i.description, i.suggestion].filter(Boolean).join(" — "))
    .filter((s) => s.length > 0);

  return (
    <div style={{ marginTop: 10 }}>
      <NaturalnessBadge result={result} />
      {issues.length > 0 && (
        <AiSection title="Worth editing before you send" style={{ marginTop: 10 }}>
          <AiList items={issues} marker="!" />
        </AiSection>
      )}
    </div>
  );
}
