"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MagBtn } from "./ui/mag-btn";

const navItems = [
  { href: "/direction", label: "Direction" },
  { href: "/cv", label: "CV" },
  { href: "/jobs", label: "Jobs" },
  { href: "/networking", label: "Networking" },
  { href: "/interview", label: "Interview" },
  { href: "/tracker", label: "Tracker" },
];

export function TopNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The intel console and the Intelligence Brief landing are full-bleed OS
  // surfaces with their own header — no global marketing chrome.
  const hidden = pathname === "/" || pathname?.startsWith("/intel");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    // Check initial scroll state
    h();
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (hidden) return null;

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled || mobileOpen ? "color-mix(in srgb, var(--background) 72%, transparent)" : "transparent",
        backdropFilter: scrolled || mobileOpen ? "blur(20px) saturate(1.6)" : "none",
        WebkitBackdropFilter: scrolled || mobileOpen ? "blur(20px) saturate(1.6)" : "none",
        borderBottom: scrolled || mobileOpen ? "1px solid var(--border)" : "1px solid transparent",
        boxShadow: scrolled && !mobileOpen ? "0 1px 0 rgba(20,24,38,0.02), var(--shadow-xs)" : "none",
        transition: "background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
      }}
    >
      <div
        style={{
          maxWidth: "1060px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "60px",
        }}
      >
        <Link href="/" className="logo-link" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div
            className="logo-icon"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "var(--c-black)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              transition: "transform 0.3s cubic-bezier(0.25,1,0.5,1), border-radius 0.3s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 12l10 10 10-10L12 2z" />
            </svg>
          </div>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--c-900)", letterSpacing: "-0.02em" }}>PathFinder</span>
        </Link>

        {/* Desktop / tablet nav links (md+) */}
        <div className="hidden lg:flex items-center gap-3 lg:gap-6">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                style={{
                  color: active ? "var(--c-900)" : "var(--c-400)",
                  fontSize: "13px",
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  letterSpacing: "-0.01em",
                  position: "relative",
                  padding: "4px 0",
                }}
              >
                {item.label}
                {active && (
                  <div style={{ position: "absolute", bottom: "-1px", left: 0, width: "100%", height: "2px", background: "var(--accent)", borderRadius: "2px", boxShadow: "0 0 8px var(--accent-glow)" }} />
                )}
              </Link>
            );
          })}
          <button
            type="button"
            className="cmdk-trigger"
            onClick={() => window.dispatchEvent(new Event("pf:command"))}
            aria-label="Open command palette"
            title="Command palette (⌘K)"
          >
            <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              Search
            </span>
            <span className="cmdk-kbd">⌘K</span>
          </button>
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                fontSize: "16px",
                lineHeight: 1,
                color: "var(--c-400)",
              }}
              aria-label="Toggle theme"
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? '☀' : '☽'}
            </button>
          )}
          <div style={{ height: "20px", width: "1px", background: "var(--c-150)" }} />
          {pathname !== '/' && (
            <Link href="/intel" style={{textDecoration: "none"}}>
              <MagBtn variant="primary" size="sm">
                Console
              </MagBtn>
            </Link>
          )}
        </div>

        {/* Mobile hamburger button (below md) */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden flex items-center justify-center"
          style={{
            width: "44px",
            height: "44px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--c-900)" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--c-900)" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div
          className="lg:hidden"
          style={{
            borderTop: "1px solid var(--c-100)",
            padding: "8px 24px 16px",
            background: "var(--background)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            opacity: 0.98,
          }}
        >
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                style={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: "44px",
                  color: active ? "var(--c-900)" : "var(--c-400)",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  letterSpacing: "-0.01em",
                  borderBottom: "1px solid var(--c-100)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", gap: "8px" }}>
            {pathname !== '/' && (
              <Link href="/intel" style={{textDecoration: "none"}}>
                <MagBtn variant="primary" size="sm">
                  Console
                </MagBtn>
              </Link>
            )}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                style={{
                  background: "transparent",
                  border: "1px solid var(--c-200)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  fontSize: "14px",
                  color: "var(--c-500)",
                  minHeight: "44px",
                }}
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? '☀ Light' : '☽ Dark'}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
