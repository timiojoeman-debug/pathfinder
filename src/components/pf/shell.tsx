"use client";

/**
 * PathFinder redesign — app chrome: warm-paper sidebar + sticky header.
 * Wraps every app route; the marketing landing ("/") renders without it.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CRUMBS } from "@/lib/pf/data";
import { usePfStore, useProfile, useProgress, useSidebarReadiness } from "@/lib/pf/store";
import { PHASE_LABEL, type PfPhase } from "@/lib/pf/events";
import { useAuthStore } from "@/lib/stores";
import { setTheme, useThemeMode } from "@/lib/theme";
import { CommandPalette } from "./palette";
import { Icon } from "./icons";
import { Drawers } from "./drawers";
import { MentorAssistant } from "./assistant";
import { ProfileSync } from "./profile-sync";
import { BrandMark, Contours } from "./ui";

/* ── Nav model ─────────────────────────────────────────────────────── */

/* No "new" kind. It existed only as a literal on /start, so the tag announced
   itself as new forever regardless of whether the user had been there — a
   permanent badge is decoration wearing a notification's clothes. Every kind
   left is derived: "dot" marks the phase you are actually on, "done" a phase
   past 80%, "fix" a real problem to address. */
type Badge = { kind: "fix" } | { kind: "done" } | { kind: "dot" } | null;

const NAV_OVERVIEW: { href: string; label: string; icon: ReactNode; badge: Badge }[] = [
  {
    href: "/start", label: "Get started", badge: null,
    icon: <Icon name="start" />,
  },
  {
    href: "/intel", label: "Command Centre", badge: null,
    icon: <Icon name="dashboard" />,
  },
];

const NAV_PHASES: { href: string; label: string; icon: ReactNode; phase?: PfPhase }[] = [
  {
    href: "/direction", label: "Career Direction", phase: "direction",
    icon: <Icon name="compass" />,
  },
  {
    href: "/cv", label: "CV Optimisation", phase: "cv",
    icon: <Icon name="file" />,
  },
  {
    href: "/jobs", label: "Opportunity Discovery", phase: "jobs",
    icon: <Icon name="search" />,
  },
  {
    href: "/networking", label: "Networking", phase: "networking",
    icon: <Icon name="users" />,
  },
  {
    href: "/interview", label: "Interview Prep", phase: "interview",
    icon: <Icon name="mic" />,
  },
  {
    href: "/tracker", label: "Application Tracking", phase: "tracker",
    icon: <Icon name="board" />,
  },
];

/** Sidebar phase badge, derived from real progress:
 *  the active phase gets the pulse dot, completed phases (≥80%) a check,
 *  everything else stays unbadged. Nothing is preset. */
function phaseBadge(phase: PfPhase | undefined, current: PfPhase, pct: number): Badge {
  if (!phase) return null;
  if (phase === current) return { kind: "dot" };
  if (pct >= 80) return { kind: "done" };
  return null;
}

function NavBadge({ badge }: { badge: Badge }) {
  if (!badge) return null;
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

function Sidebar({ collapsed, mobileOpen }: { collapsed: boolean; mobileOpen: boolean }) {
  const pathname = usePathname();
  const readiness = useSidebarReadiness();
  const profile = useProfile();
  const progress = useProgress();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const dash = Math.round(119 * (1 - readiness / 100));
  const phaseOrder: PfPhase[] = ["direction", "cv", "jobs", "networking", "interview", "tracker"];
  const phaseNum = phaseOrder.indexOf(profile.currentPhase) + 1;
  const pctFor = (ph?: PfPhase) => (ph ? progress.phases.find((p) => p.phase === ph)?.pct ?? 0 : 0);
  const name = user?.email ? user.email.split("@")[0].replace(/[._]/g, " ") : "You";
  const initials = name.split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";

  return (
    <aside
      className="pf-sidebar"
      data-mobile-open={mobileOpen ? "1" : "0"}
      style={{
        width: collapsed ? 74 : 266, flexShrink: 0, borderRight: "1px solid var(--line)", background: "var(--panel)",
        alignSelf: "stretch", minHeight: "100dvh",
        transition: "width .3s var(--ease)",
      }}
    >
      {/* Fixed to the viewport. The aside keeps its width so the flex row still
          reserves the space, and this column pins so the rail follows you down
          the page. (It went fixed while html, body and .pf carried
          overflow-x:hidden, which made each a scroll container and broke
          sticky; they now use overflow-x:clip, so sticky would work too, but
          fixed needs no scroll container at all.) Under the mobile drawer
          .pf-sidebar carries a transform, which becomes the containing block for
          this element, so it still slides with the drawer rather than pinning
          to the viewport. */}
      <div style={{ position: "fixed", top: 0, left: 0, width: collapsed ? 74 : 266, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width .3s var(--ease)" }}>
      <Link href="/" title="Back to the site" style={{ display: "flex", alignItems: "center", gap: 11, padding: collapsed ? "22px 0 18px" : "22px 22px 18px", justifyContent: collapsed ? "center" : undefined, textDecoration: "none", color: "var(--fg)" }}>
        <BrandMark size={26} wordmark={!collapsed} />
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
          <NavLink
            key={n.href}
            href={n.href}
            label={n.label}
            icon={n.icon}
            badge={phaseBadge(n.phase, profile.currentPhase, pctFor(n.phase))}
            active={pathname === n.href}
            collapsed={collapsed}
          />
        ))}
        <div style={{ height: 8 }} />
        <NavLink
          href="/settings"
          label="Settings"
          badge={null}
          active={pathname === "/settings"}
          collapsed={collapsed}
          icon={<Icon name="settings" />}
        />
      </nav>

      <div style={{ padding: collapsed ? "14px 0" : "14px 16px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : undefined }}>
        <span className="pf-mono" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", color: "var(--onAccent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</span>
        {!collapsed && (
          user ? (
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
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
      </div>
    </aside>
  );
}

/* ── Header ────────────────────────────────────────────────────────── */

function Header({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const openPalette = usePfStore((s) => s.openPalette);
  const mode = useThemeMode();

  const toggleTheme = () => setTheme(mode === "dark" ? "light" : "dark");

  const crumb = CRUMBS[pathname ?? ""] ?? "PATHFINDER";

  return (
    <header
      className="pf-header"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, height: 60, padding: "0 34px",
        borderBottom: "1px solid var(--line)", background: "color-mix(in srgb,var(--bg) 82%,transparent)",
        backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={onMenu}
          aria-label="Toggle navigation"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", cursor: "pointer", flexShrink: 0 }}
        >
          <Icon name="menu" />
        </button>
        <div className="pf-mono pf-hide-mobile" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, letterSpacing: ".08em", color: "var(--faint)", whiteSpace: "nowrap" }}>
          <span className="pf-anim-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--strong)" }} />
          {crumb}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={openPalette}
          style={{ display: "flex", alignItems: "center", gap: 9, height: 36, padding: "0 12px 0 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}
        >
          <Icon name="search" size={16} />
          <span className="pf-hide-mobile">Search</span>
          <span className="pf-mono pf-hide-mobile" style={{ fontSize: 10, border: "1px solid var(--line)", borderRadius: 5, padding: "1px 5px", color: "var(--faint)" }}>⌘K</span>
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="pf-mono"
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, height: 36, padding: "0 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontSize: 11, fontWeight: 600, transition: "background-color .2s var(--ease), border-color .2s var(--ease), color .2s var(--ease), transform .16s cubic-bezier(.23,1,.32,1)" }}
        >
          <Icon name={mode === "dark" ? "sun" : "moon"} size={15} />
          {mode === "dark" ? "Paper" : "Night"}
        </button>
        <button
          onClick={() => router.push("/start")}
          className="pf-hide-mobile pf-shine"
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 16px 0 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--onAccent)", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          Re-assess
          <Icon name="arrowRight" size={16} stroke={2} />
        </button>
      </div>
    </header>
  );
}

/* ── Chrome ────────────────────────────────────────────────────────── */

const APP_ROUTES = ["/start", "/intel", "/direction", "/cv", "/jobs", "/networking", "/interview", "/tracker", "/dashboard", "/settings"];

/** True below the mobile breakpoint (SSR-safe: false until mounted). */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    // Must match the 860px breakpoint in globals.css. If the CSS turns the
    // sidebar into an off-canvas drawer at a width where this still reports
    // desktop, the menu button toggles collapse instead of opening the drawer
    // and navigation becomes unreachable.
    const mq = window.matchMedia("(max-width: 860px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const collapsed = usePfStore((s) => s.collapsed);
  const toggleCollapsed = usePfStore((s) => s.toggleCollapsed);
  const isApp = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Rehydrate the persisted store once, after mount (skipHydration in store).
  useEffect(() => {
    void usePfStore.persist.rehydrate();
  }, []);

  // Close the mobile drawer whenever the route changes. Adjusted during render
  // rather than in an effect: an effect would paint the new route with the
  // drawer still open for one frame, then close it.
  const [drawerPath, setDrawerPath] = useState(pathname);
  if (pathname !== drawerPath) {
    setDrawerPath(pathname);
    setMobileOpen(false);
  }

  if (!isApp) return <>{children}</>;

  const onMenu = () => (isMobile ? setMobileOpen((o) => !o) : toggleCollapsed());

  return (
    <div className="pf" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Contours />
      {isMobile && mobileOpen && <div className="pf-scrim-mobile" onClick={() => setMobileOpen(false)} />}
      <Sidebar collapsed={isMobile ? false : collapsed} mobileOpen={mobileOpen} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Header onMenu={onMenu} />
        <main className="pf-main" style={{ flex: 1, padding: "36px 34px 60px", maxWidth: 1240, width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>
      <CommandPalette />
      <Drawers />
      <MentorAssistant />
      <ProfileSync />
    </div>
  );
}
