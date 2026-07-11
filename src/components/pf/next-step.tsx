"use client";

/**
 * Recommended Next Step — the connective banner that opens every phase page.
 * It reads the whole Career Profile, so the advice always reflects prior work
 * ("strong CV, now network") rather than the page you happen to be on.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRecommendations } from "@/lib/pf/store";

const mono = "var(--font-mono), 'JetBrains Mono', monospace";

export function NextStep({ variant = "banner" }: { variant?: "banner" | "compact" }) {
  const recs = useRecommendations();
  const pathname = usePathname();
  if (recs.length === 0) return null;

  // Always surface the true #1 action. When it already points at the current
  // page the CTA changes to "You're in the right place" rather than a link away.
  const top = recs[0];
  const onThisPage = top.href === pathname;

  if (variant === "compact") {
    return (
      <Link
        href={top.href}
        className="pf-hover-border"
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: "1px solid color-mix(in srgb,var(--accent) 26%,transparent)", background: "var(--accentSoft)", textDecoration: "none", color: "var(--fg)" }}
      >
        <span style={{ display: "flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 7, background: "var(--accent)", flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accentText)" }}>Recommended next step</span>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{top.title}</span>
        </span>
        <span style={{ color: "var(--accent)" }}>→</span>
      </Link>
    );
  }

  return (
    <div
      className="pf-anim-up"
      style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 18px", borderRadius: 14, border: "1px solid color-mix(in srgb,var(--accent) 24%,transparent)", background: "linear-gradient(120deg,var(--accentSoft),transparent)", marginBottom: 20 }}
    >
      <span style={{ display: "flex", width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 9, background: "var(--accent)", flexShrink: 0, boxShadow: "var(--rim)" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--accentText)" }}>Recommended next step</span>
          <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: top.impactTone, border: `1px solid color-mix(in srgb, ${top.impactTone} 30%, transparent)`, borderRadius: 5, padding: "1px 7px" }}>{top.impact}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{top.title}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginTop: 4 }}>{top.why}</div>
      </div>
      {onThisPage ? (
        <span style={{ flexShrink: 0, alignSelf: "center", display: "flex", alignItems: "center", height: 38, padding: "0 16px", borderRadius: 10, background: "color-mix(in srgb,var(--strong) 14%,transparent)", color: "var(--strong)", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", border: "1px solid color-mix(in srgb,var(--strong) 30%,transparent)" }}>
          You&apos;re in the right place
        </span>
      ) : (
        <Link
          href={top.href}
          style={{ flexShrink: 0, alignSelf: "center", display: "flex", alignItems: "center", height: 38, padding: "0 16px", borderRadius: 10, background: "var(--accent)", color: "#F7F1E4", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Do it →
        </Link>
      )}
    </div>
  );
}
