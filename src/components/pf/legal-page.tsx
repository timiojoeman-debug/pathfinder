import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for the public legal pages (privacy, terms). Renders outside the
 * app chrome with the warm-paper tokens and a readable single-column measure.
 */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="pf" style={{ minHeight: "100vh", padding: "clamp(32px,6vw,72px) 20px 80px" }}>
      <article style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--fg)", marginBottom: 28 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--rim)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F7F1E4" strokeWidth="2.4"><path d="M12 2L2 12l10 10 10-10L12 2z" /></svg>
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em" }}>PathFinder</span>
        </Link>
        <h1 style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 8px" }}>{title}</h1>
        <div className="pf-mono" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 32 }}>Last updated · {updated}</div>
        <div style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>{children}</div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--faint)" }}>
          <Link href="/privacy" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Privacy</Link>
          <span style={{ margin: "0 10px" }}>·</span>
          <Link href="/terms" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Terms</Link>
          <span style={{ margin: "0 10px" }}>·</span>
          <Link href="/" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Home</Link>
        </div>
      </article>
    </div>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", letterSpacing: "-.01em", margin: "32px 0 10px" }}>{children}</h2>;
}
