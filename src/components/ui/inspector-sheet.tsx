"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Semantic tokens — themeable (Terminal default / Archive via [data-theme]).
const C = { bg: "var(--surface)", ink: "var(--ink)", faint: "var(--ink-3)", border: "var(--line)", borderStrong: "var(--line-strong)" };

interface InspectorSheetProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: ReactNode;
  children: ReactNode;
}

/*
 * Context-preserving slide-over. Detail opens here instead of navigating away.
 * Dependency-free (portal + transform); swappable for shadcn <Sheet> later.
 */
export function InspectorSheet({ open, onClose, eyebrow, title, children }: InspectorSheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div aria-hidden={!open}>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          background: "rgba(17,17,17,0.18)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s var(--ease-out-expo)",
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 301,
          width: "min(440px, 92vw)",
          background: C.bg,
          color: C.ink,
          borderLeft: `1px solid ${C.borderStrong}`,
          boxShadow: "-24px 0 60px rgba(17,17,17,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s var(--ease-out-expo)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", padding: "20px 22px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: C.faint, marginBottom: "8px" }}>{eyebrow}</div>}
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "19px", fontWeight: 600, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.2 }}>{title}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close inspector" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "22px", color: C.faint, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>×</button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>{open ? children : null}</div>
      </aside>
    </div>,
    document.body
  );
}
