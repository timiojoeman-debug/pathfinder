"use client";

import { useRef, useState, useCallback, ReactNode } from "react";

interface MagBtnProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export function MagBtn({ children, variant = "primary", size = "lg", style = {}, className = "", onClick }: MagBtnProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setOffset({ x: (e.clientX - cx) * 0.15, y: (e.clientY - cy) * 0.2 });
  }, []);
  
  const onLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    letterSpacing: "-0.01em",
    border: "none",
    fontSize: size === "lg" ? "14.5px" : size === "md" ? "13.5px" : "13px",
    padding: size === "lg" ? "15px 28px" : size === "md" ? "12px 22px" : "9px 18px",
    borderRadius: "11px",
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: "transform 0.2s var(--ease-out-expo), background 0.2s, box-shadow 0.25s var(--ease-out-expo)",
  };

  const variants = {
    primary: {
      background: "var(--c-900)",
      color: "var(--background)",
      border: "1px solid var(--c-900)",
      // Top inner highlight + tinted elevation = tactile, "pressable" surface
      boxShadow: "var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.14)",
    },
    secondary: {
      background: "color-mix(in srgb, var(--c-white) 60%, transparent)",
      color: "var(--c-700)",
      border: "1px solid var(--c-200)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    },
  };

  return (
    <button
      ref={ref}
      className={`mag-btn btn-${variant} ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
    >
      <span className="btn-content" style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        transition: "transform 0.2s cubic-bezier(0.25,1,0.5,1)"
      }}>
        {children}
      </span>
    </button>
  );
}
