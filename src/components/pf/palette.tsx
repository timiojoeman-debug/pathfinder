"use client";

/**
 * ⌘K command palette — jump to any phase, job, or tracked application.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SCREEN_ROUTES } from "@/lib/pf/data";
import { usePfStore } from "@/lib/pf/store";

interface Cmd { label: string; hint: string; pick: () => void }

export function CommandPalette() {
  const router = useRouter();
  const open = usePfStore((s) => s.paletteOpen);
  const q = usePfStore((s) => s.paletteQ);
  const savedJobs = usePfStore((s) => s.savedJobs);
  const board = usePfStore((s) => s.board);
  const set = usePfStore((s) => s.set);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        set({ paletteOpen: !usePfStore.getState().paletteOpen, paletteQ: "" });
      } else if (e.key === "Escape") {
        set({ paletteOpen: false, jobDetail: null, appDetail: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);

  if (!open) return null;

  const go = (href: string, patch: Partial<{ jobDetail: string | null; appDetail: string | null }> = {}) => {
    set({ paletteOpen: false, jobDetail: null, appDetail: null, ...patch });
    router.push(href);
    window.scrollTo(0, 0);
  };

  const allCmds: Cmd[] = [
    ...SCREEN_ROUTES.map(([label, href]) => ({ label, hint: "go to", pick: () => go(href) })),
    ...savedJobs.map((j) => ({ label: j.company + " — " + j.role, hint: "job · fit " + j.fit, pick: () => go("/jobs", { jobDetail: j.company }) })),
    ...board.flatMap((col) =>
      col.cards.map((c) => ({ label: c.company + " — " + c.role, hint: "application · " + col.title, pick: () => go("/tracker", { appDetail: c.key }) })),
    ),
  ];
  const pq = q.trim().toLowerCase();
  const items = (pq ? allCmds.filter((c) => (c.label + " " + c.hint).toLowerCase().indexOf(pq) >= 0) : allCmds).slice(0, 9);

  return (
    <>
      <div
        onClick={() => set({ paletteOpen: false })}
        className="pf-anim-fade"
        style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 80, cursor: "pointer" }}
      />
      <div
        className="pf-anim-up"
        style={{ position: "fixed", top: "14vh", left: "50%", transform: "translateX(-50%)", width: "min(560px,92vw)", zIndex: 81, background: "var(--panelSolid)", border: "1px solid var(--lineStrong)", borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 70px rgba(30,22,12,.35)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => set({ paletteQ: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter" && items[0]) items[0].pick(); }}
            placeholder="Jump to a phase, job, or application…"
            style={{ flex: 1, border: "none", background: "transparent", color: "var(--fg)", fontSize: 15, fontFamily: "inherit", outline: "none" }}
          />
          <span className="pf-mono" style={{ fontSize: 10, border: "1px solid var(--line)", borderRadius: 5, padding: "1px 6px", color: "var(--faint)" }}>esc</span>
        </div>
        {items.map((pi) => (
          <a
            key={pi.label + pi.hint}
            onClick={pi.pick}
            className="pf-hover-row"
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", textDecoration: "none", color: "var(--fg)", borderBottom: "1px solid var(--line2)" }}
          >
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{pi.label}</span>
            <span className="pf-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{pi.hint}</span>
          </a>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 18, fontSize: 13, color: "var(--muted)" }}>Nothing matches — try a company name or a phase.</div>
        )}
      </div>
    </>
  );
}
