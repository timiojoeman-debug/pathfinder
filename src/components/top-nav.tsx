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

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    // Check initial scroll state
    h();
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(16px) saturate(1.3)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px) saturate(1.3)" : "none",
        borderBottom: scrolled ? "1px solid var(--c-100)" : "1px solid transparent",
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
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "24px", overflowX: "auto", scrollbarWidth: "none" }}>
          <div className="hidden sm:flex items-center gap-6">
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
          </div>
           {/* Fallback for mobile scrolling nav items if needed, or hide on very small screens */}
           <div className="sm:hidden flex items-center gap-4">
              {navItems.map((item) => {
                 const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                 return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      color: active ? "var(--c-900)" : "var(--c-400)",
                      fontSize: "12px",
                      fontWeight: active ? 600 : 500,
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                 )
              })}
           </div>

          <div className="hidden sm:block" style={{ height: "20px", width: "1px", background: "var(--c-150)" }} />
          {pathname !== '/' && (
            <Link href="/" style={{textDecoration: "none"}}>
              <MagBtn variant="primary" size="sm">
                Dashboard
              </MagBtn>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
