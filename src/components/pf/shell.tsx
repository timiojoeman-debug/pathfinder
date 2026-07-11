"use client";

/**
 * PathFinder redesign — app chrome: warm-paper sidebar + sticky header.
 * Wraps every app route; the marketing landing ("/") renders without it.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CRUMBS } from "@/lib/pf/data";
import { usePfStore, useProfile, useSidebarReadiness } from "@/lib/pf/store";
import { PHASE_LABEL, type PfPhase } from "@/lib/pf/events";
import { useAuthStore } from "@/lib/stores";
import { applyTheme, getStoredTheme, setStoredTheme, type ThemeMode } from "@/lib/theme";
import { CommandPalette } from "./palette";
import { Drawers } from "./drawers";
import { ProfileSync } from "./profile-sync";

/* ── Nav model ─────────────────────────────────────────────────────── */

type Badge = { kind: "new" } | { kind: "fix" } | { kind: "done" } | { kind: "dot" } | null;

const NAV_OVERVIEW: { href: string; label: string; icon: ReactNode; badge: Badge }[] = [
  {
    href: "/start", label: "Get started", badge: { kind: "new" },
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M5 21V4l7 3 7-3v13l-7 3-7-3" /></svg>,
  },
  {
    href: "/intel", label: "Command Centre", badge: null,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  },
];

const NAV_PHASES: { href: string; label: string; icon: ReactNode; badge: Badge }[] = [
  {
    href: "/direction", label: "Career Direction", badge: { kind: "done" },
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></svg>,
  },
  {
    href: "/cv", label: "CV Optimisation", badge: { kind: "fix" },
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>,
  },
  {
    href: "/jobs", label: "Opportunity Discovery", badge: { kind: "dot" },
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
  },
  {
    href: "/networking", label: "Networking", badge: null,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="9" cy="8" r="3.2" /><path d="M15.5 11a3 3 0 100-5M3 20a6 6 0 0112 0M15 20a6 6 0 00-3-5.2" /></svg>,
  },
  {
    href: "/interview", label: "Interview Prep", badge: null,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>,
  },
  {
    href: "/tracker", label: "Application Tracking", badge: null,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>,
  },
  {
    href: "/plan", label: "Summer Plan", badge: null,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  },
];

function NavBadge({ badge }: { badge: Badge }) {
  if (!badge) return null;
  if (badge.kind === "new") {
    return <span className="pf-mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", borderRadius: 5, padding: "1px 6px" }}>NEW</span>;
  }
  if (badge.kind === "fix") {
    return <span className="pf-mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--warn)", border: "1px solid color-mix(in srgb,var(--warn) 30%,transparent)", borderRadius: 5, padding: "1px 6px" }}>FIX</span>;
  }
  if (badge.kind === "done") {
    return <span style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--strong)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✓</span>;
  }
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 3px var(--accentSoft)" }} />;
}

function NavLink({ href, label, icon, badge, active, collapsed }: {
  href: string; label: string; icon: ReactNode; badge: Badge; active: boolean; collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 10,
        textDecoration: "none", fontSize: 13.5, marginBottom: 2,
        justifyContent: collapsed ? "center" : undefined,
        background: active ? "var(--accentSoft)" : "transparent",
        color: active ? "var(--fg)" : "var(--muted)",
        fontWeight: active ? 600 : 500,
        transition: "background .18s var(--ease)",
      }}
    >
      <span style={{ display: "flex", width: 18, justifyContent: "center", color: active ? "var(--accent)" : "var(--faint)" }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && <NavBadge badge={badge} />}
    </Link>
  );
}

/* ── Sidebar ───────────────────────────────────────────────────────── */

function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const readiness = useSidebarReadiness();
  const profile = useProfile();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const dash = Math.round(119 * (1 - readiness / 100));
  const phaseOrder: PfPhase[] = ["direction", "cv", "jobs", "networking", "interview", "tracker"];
  const phaseNum = phaseOrder.indexOf(profile.currentPhase) + 1;
  const name = user?.email ? user.email.split("@")[0].replace(/[._]/g, " ") : "Alex Chen";
  const initials = name.split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "AC";

  return (
    <aside
      style={{
        width: collapsed ? 74 : 266, flexShrink: 0, borderRight: "1px solid var(--line)", background: "var(--panel)",
        display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
        transition: "width .3s var(--ease)", overflow: "hidden",
      }}
    >
      <Link href="/" title="Back to the site" style={{ display: "flex", alignItems: "center", gap: 11, padding: collapsed ? "22px 0 18px" : "22px 22px 18px", justifyContent: collapsed ? "center" : undefined, textDecoration: "none", color: "var(--fg)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--rim)", flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F7F1E4" strokeWidth="2.4"><path d="M12 2L2 12l10 10 10-10L12 2z" /></svg>
        </div>
        {!collapsed && <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.02em" }}>PathFinder</span>}
      </Link>

      {!collapsed && (
        <div style={{ margin: "0 16px 6px", padding: "15px 16px", border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
              <svg width="46" height="46" viewBox="0 0 46 46" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="23" cy="23" r="19" fill="none" stroke="var(--panel3)" strokeWidth="5" />
                <circle cx="23" cy="23" r="19" fill="none" stroke="var(--strong)" strokeWidth="5" strokeLinecap="round" strokeDasharray="119" strokeDashoffset={dash} style={{ transition: "stroke-dashoffset .8s var(--ease)" }} />
              </svg>
              <div className="pf-mono" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{readiness}</div>
            </div>
            <div>
              <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>Readiness</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Phase {phaseNum} of 6</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{PHASE_LABEL[profile.currentPhase]}</div>
            </div>
          </div>
        </div>
      )}

      <nav style={{ flex: 1, padding: 12, overflowY: "auto" }}>
        {!collapsed && (
          <div className="pf-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--faint)", padding: "8px 10px 6px" }}>Overview</div>
        )}
        {NAV_OVERVIEW.map((n) => (
          <NavLink key={n.href} {...n} active={pathname === n.href} collapsed={collapsed} />
        ))}
        {!collapsed && (
          <div className="pf-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--faint)", padding: "16px 10px 6px" }}>The six phases</div>
        )}
        {collapsed && <div style={{ height: 14 }} />}
        {NAV_PHASES.map((n) => (
          <NavLink key={n.href} {...n} active={pathname === n.href} collapsed={collapsed} />
        ))}
      </nav>

      <div style={{ padding: collapsed ? "14px 0" : "14px 16px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : undefined }}>
        <span className="pf-mono" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", color: "#F7F1E4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</span>
        {!collapsed && (
          user ? (
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Edinburgh · CS Yr 2</div>
              </div>
              <button
                onClick={() => void logout()}
                title="Sign out"
                className="pf-mono"
                style={{ cursor: "pointer", fontSize: 9.5, fontWeight: 600, letterSpacing: ".06em", color: "var(--faint)", border: "1px solid var(--line)", background: "transparent", borderRadius: 6, padding: "3px 7px" }}
              >
                OUT
              </button>
            </div>
          ) : (
            <Link href="/login" style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "var(--fg)" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Guest</div>
              <div style={{ fontSize: 11, color: "var(--accentText)", fontWeight: 600 }}>Sign in for the AI mentor →</div>
            </Link>
          )
        )}
      </div>
    </aside>
  );
}

/* ── Header ────────────────────────────────────────────────────────── */

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const toggleCollapsed = usePfStore((s) => s.toggleCollapsed);
  const openPalette = usePfStore((s) => s.openPalette);
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(getStoredTheme() ?? "light");
    const sync = () => setMode(getStoredTheme() ?? "light");
    window.addEventListener("pf:theme", sync);
    return () => window.removeEventListener("pf:theme", sync);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
    setMode(next);
  };

  const crumb = CRUMBS[pathname ?? ""] ?? "PATHFINDER";

  return (
    <header
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, height: 60, padding: "0 34px",
        borderBottom: "1px solid var(--line)", background: "color-mix(in srgb,var(--bg) 82%,transparent)",
        backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={toggleCollapsed}
          aria-label="Toggle navigation"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", cursor: "pointer", flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div className="pf-mono" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, letterSpacing: ".08em", color: "var(--faint)", whiteSpace: "nowrap" }}>
          <span className="pf-anim-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--strong)" }} />
          {crumb}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={openPalette}
          style={{ display: "flex", alignItems: "center", gap: 9, height: 36, padding: "0 12px 0 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          Search
          <span className="pf-mono" style={{ fontSize: 10, border: "1px solid var(--line)", borderRadius: 5, padding: "1px 5px", color: "var(--faint)" }}>⌘K</span>
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="pf-mono"
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, height: 36, padding: "0 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontSize: 11, fontWeight: 600, transition: "all .2s var(--ease)" }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid currentColor" }} />
          {mode === "dark" ? "Paper" : "Night"}
        </button>
        <button
          onClick={() => router.push("/start")}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", height: 38, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#F7F1E4", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          Re-assess →
        </button>
      </div>
    </header>
  );
}

/* ── Chrome ────────────────────────────────────────────────────────── */

const APP_ROUTES = ["/start", "/intel", "/direction", "/cv", "/jobs", "/networking", "/interview", "/tracker", "/plan", "/dashboard"];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const collapsed = usePfStore((s) => s.collapsed);
  const isApp = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  // Rehydrate the persisted store once, after mount (skipHydration in store).
  useEffect(() => {
    void usePfStore.persist.rehydrate();
  }, []);

  if (!isApp) return <>{children}</>;

  return (
    <div className="pf" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Sidebar collapsed={collapsed} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Header />
        <main style={{ flex: 1, padding: "36px 34px 60px", maxWidth: 1240, width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>
      <CommandPalette />
      <Drawers />
      <ProfileSync />
    </div>
  );
}
