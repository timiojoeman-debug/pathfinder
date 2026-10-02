"use client";

/**
 * Shared chrome for the AI-backed panels — a generate button that shows its own
 * pending state, an error note, and the list/section primitives the methodology
 * envelopes all render into.
 *
 * These exist so the AI surfaces read the same way everywhere: a student who
 * learns what a "generate" button does on the interview page should not have to
 * relearn it on the CV page.
 */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export function GenerateButton({
  onClick,
  loading,
  disabled,
  loadingLabel = "Generating…",
  variant = "solid",
  children,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  variant?: "solid" | "ghost";
  children: ReactNode;
}) {
  const off = loading || disabled;
  const ghost = variant === "ghost";
  return (
    <button
      onClick={onClick}
      disabled={off}
      aria-busy={loading}
      style={{
        cursor: off ? "default" : "pointer",
        height: 42,
        padding: "0 20px",
        borderRadius: 11,
        border: ghost ? "1px solid var(--line)" : "none",
        background: off ? "var(--panel3)" : ghost ? "transparent" : "var(--accent)",
        color: off ? "var(--faint)" : ghost ? "var(--fg)" : "var(--onAccent)",
        fontSize: 13,
        fontWeight: 600,
        transition: "all .2s var(--ease)",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

/**
 * Failures are shown, never swallowed — a silent empty panel is the bug.
 *
 * "Not signed in" is styled as guidance rather than as a fault, and carries a
 * link, because the phase pages are usable logged-out and hitting the AI is the
 * first thing that asks for an account.
 */
export function AiError({ message, needsAuth = false }: { message: string | null; needsAuth?: boolean }) {
  if (!message) return null;
  const tone = needsAuth ? "var(--accent)" : "var(--risk)";
  return (
    <div
      role={needsAuth ? "status" : "alert"}
      style={{
        marginTop: 12,
        border: `1px solid color-mix(in srgb,${tone} 34%,transparent)`,
        background: `color-mix(in srgb,${tone} 8%,transparent)`,
        borderRadius: 11,
        padding: "11px 14px",
        fontSize: 12.5,
        lineHeight: 1.55,
        color: "var(--fg)",
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span>{message}</span>
      {needsAuth && (
        <Link
          href="/login"
          style={{ color: "var(--accentText)", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

/** A labelled block inside a generated result. */
export function AiSection({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ marginTop: 16, ...style }}>
      <div
        className="pf-mono"
        style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8 }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/** Bulleted prose from an AI string array. Renders nothing when empty. */
export function AiList({ items, marker = "—" }: { items: string[] | undefined; marker?: string }) {
  if (!items?.length) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((t, i) => (
        <li key={`${i}-${t.slice(0, 24)}`} style={{ display: "flex", gap: 9, fontSize: 12.5, lineHeight: 1.6, color: "var(--muted)" }}>
          <span className="pf-mono" style={{ color: "var(--accent)", flexShrink: 0 }}>{marker}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Small pill, e.g. a question type or a tech-stack entry. */
export function AiTag({ children, tone = "var(--accent)" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className="pf-mono"
      style={{
        fontSize: 9.5,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        fontWeight: 700,
        color: tone,
        border: `1px solid color-mix(in srgb,${tone} 30%,transparent)`,
        borderRadius: 6,
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/**
 * The line under every generated block. AI output here is a first draft against
 * a student's real profile, not a verified fact about a company — saying so is
 * the honest framing, and it is the same framing the product asks students to
 * apply to their own CV.
 */
export function AiCaveat({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, fontStyle: "italic" }}>
      {children}
    </div>
  );
}
