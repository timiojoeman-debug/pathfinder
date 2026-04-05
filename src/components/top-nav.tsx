"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled || mobileOpen ? "rgba(255,255,255,0.88)" : "transparent",
        backdropFilter: scrolled || mobileOpen ? "blur(16px) saturate(1.3)" : "none",
        WebkitBackdropFilter: scrolled || mobileOpen ? "blur(16px) saturate(1.3)" : "none",
        borderBottom: scrolled || mobileOpen ? "1px solid var(--c-100)" : "1px solid transparent",
        transition: "all 0.35s ease",
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
                  <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "2px", background: "var(--c-900)", borderRadius: "1px" }} />
                )}
              </Link>
            );
          })}
          <div style={{ height: "20px", width: "1px", background: "var(--c-150)" }} />
          {pathname !== '/' && (
            <Link href="/" style={{textDecoration: "none"}}>
              <MagBtn variant="primary" size="sm">
                Dashboard
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
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
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
          {pathname !== '/' && (
            <div style={{ paddingTop: "12px" }}>
              <Link href="/" style={{textDecoration: "none"}}>
                <MagBtn variant="primary" size="sm">
                  Dashboard
                </MagBtn>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
