"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type Tone = "accent" | "good" | "warn" | "neutral";

interface CmdAction {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
  tone?: Tone;
  href: string;
}

const ACTIONS: CmdAction[] = [
  { id: "nav-command", group: "Navigate", label: "Command center", hint: "Overview", keywords: "dashboard home readiness gaps", href: "/intel" },
  { id: "nav-direction", group: "Navigate", label: "Direction", hint: "Phase 1", keywords: "career goals targeting explore wizard", href: "/direction" },
  { id: "nav-cv", group: "Navigate", label: "CV Optimizer", hint: "Phase 2", keywords: "resume ats keywords bullets", href: "/cv" },
  { id: "nav-jobs", group: "Navigate", label: "Discovery", hint: "Phase 3", keywords: "jobs internships roles search match", href: "/jobs" },
  { id: "nav-network", group: "Navigate", label: "Networking", hint: "Phase 4", keywords: "outreach contacts referral coffee chat", href: "/networking" },
  { id: "nav-interview", group: "Navigate", label: "Interview Prep", hint: "Phase 5", keywords: "leetcode star behavioral technical neetcode", href: "/interview" },
  { id: "nav-tracker", group: "Navigate", label: "Application Tracker", hint: "Phase 6", keywords: "pipeline kanban applications status", href: "/tracker" },
  { id: "do-gaps", group: "Discover next", label: "Run gap analysis", hint: "Detect", tone: "accent", keywords: "gaps detect weaknesses missing readiness", href: "/intel" },
  { id: "do-cv", group: "Discover next", label: "Detect CV gaps", hint: "Analyze", tone: "accent", keywords: "ats score keywords resume", href: "/cv" },
  { id: "do-jobs", group: "Discover next", label: "Find matched internships", hint: "Discover", tone: "accent", keywords: "match opportunities roles", href: "/jobs" },
  { id: "do-network", group: "Discover next", label: "Generate outreach", hint: "Leverage", tone: "accent", keywords: "referral message recruiter", href: "/networking" },
];

function toneColor(tone?: Tone): string {
  switch (tone) {
    case "good": return "var(--signal-confidence)";
    case "warn": return "var(--signal-risk)";
    case "accent": return "var(--accent)";
    default: return "var(--c-300)";
  }
}

export function CommandPalette() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACTIONS;
    const tokens = q.split(/\s+/);
    return ACTIONS.filter((a) => {
      const hay = `${a.label} ${a.hint ?? ""} ${a.keywords ?? ""} ${a.group}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSel(0);
    if (restoreFocus.current) restoreFocus.current.focus();
  }, []);

  const openPalette = useCallback(() => {
    restoreFocus.current = document.activeElement as HTMLElement;
    setOpen(true);
    setQuery("");
    setSel(0);
  }, []);

  const runAction = useCallback(
    (a: CmdAction) => {
      close();
      router.push(a.href);
    },
    [close, router]
  );

  // Global ⌘K / Ctrl+K + custom open event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => {
          if (!v) restoreFocus.current = document.activeElement as HTMLElement;
          return !v;
        });
      }
    };
    const onOpen = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pf:command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pf:command", onOpen as EventListener);
    };
  }, [openPalette]);

  // Focus + scroll lock while open
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep selection in range
  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (filtered.length ? (s + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (filtered.length ? (s - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = filtered[sel];
      if (a) runAction(a);
    }
  };

  if (!mounted || !open) return null;

  const groups: string[] = [];
  filtered.forEach((a) => {
    if (!groups.includes(a.group)) groups.push(a.group);
  });

  return createPortal(
    <div
      className="cmdk-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="cmdk-panel" onKeyDown={onKeyDown}>
        <div className="cmdk-input-row">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c-400)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search or jump to…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            aria-label="Command search"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="cmdk-kbd">ESC</span>
        </div>

        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">No matches. Try “CV”, “gaps”, or “interview”.</div>}
          {groups.map((g) => (
            <div key={g} className="cmdk-group">
              <div className="cmdk-group-label">{g}</div>
              {filtered
                .map((a, idx) => ({ a, idx }))
                .filter(({ a }) => a.group === g)
                .map(({ a, idx }) => (
                  <button
                    key={a.id}
                    type="button"
                    className="cmdk-item"
                    data-selected={idx === sel}
                    onMouseMove={() => setSel(idx)}
                    onClick={() => runAction(a)}
                  >
                    <span className="cmdk-dot" style={{ background: toneColor(a.tone) }} />
                    <span className="cmdk-label">{a.label}</span>
                    {a.hint && <span className="cmdk-hint">{a.hint}</span>}
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div className="cmdk-footer">
          <span><span className="cmdk-kbd">↑</span><span className="cmdk-kbd">↓</span> navigate</span>
          <span><span className="cmdk-kbd">↵</span> open</span>
          <span><span className="cmdk-kbd">⌘K</span> toggle</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
