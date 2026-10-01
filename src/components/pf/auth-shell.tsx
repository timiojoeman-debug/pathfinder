"use client";

import Link from "next/link";
import { BrandMark, Contours } from "./ui";
import type { ReactNode } from "react";

/** Shared centered card for the auth flow pages (login recovery, verify, reset). */
export function AuthShell({ kicker, title, children, footer }: {
  kicker: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="pf" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Contours />
      <div className="pf-anim-up" style={{ width: "min(420px, 94vw)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, justifyContent: "center", marginBottom: 26, textDecoration: "none", color: "var(--fg)" }}>
          <BrandMark size={28} />
        </Link>
        <div className="pf-panel" style={{ padding: "26px 28px", background: "var(--panelSolid)" }}>
          <div className="pf-kicker" style={{ marginBottom: 6 }}>{kicker}</div>
          <h1 className="pf-display" style={{ fontSize: 30, margin: "0 0 16px" }}>{title}</h1>
          {children}
        </div>
        {footer && <p style={{ fontSize: 12.5, color: "var(--faint)", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>{footer}</p>}
      </div>
    </div>
  );
}

export const authInputStyle: React.CSSProperties = { width: "100%", height: 44, padding: "0 15px", marginBottom: 14 };
export const authButtonStyle = (enabled: boolean): React.CSSProperties => ({
  cursor: enabled ? "pointer" : "default", width: "100%", height: 46, borderRadius: 12, border: "none",
  background: enabled ? "var(--accent)" : "var(--panel3)", color: "#F7F1E4", fontSize: 14, fontWeight: 600,
});
