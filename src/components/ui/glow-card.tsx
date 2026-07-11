"use client";

import { useState, useRef, useCallback, ReactNode } from "react";
import { useReveal } from "./hooks";

interface GlowCardProps {
  children: ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  padded?: boolean;
}

export function GlowCard({ children, delay = 0, style = {}, padded = true }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0, active: false });
  const [revRef, vis] = useReveal(0.1);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMouse({ x: e.clientX - r.left, y: e.clientY - r.top, active: true });
  }, []);
  
  const onLeave = useCallback(() => setMouse((p) => ({ ...p, active: false })), []);

  return (
    <div
      ref={(el) => {
        cardRef.current = el;
        // @ts-ignore - assigning to a ref tuple
        if (revRef) revRef.current = el;
      }}
      className="glow-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        position: "relative",
        borderRadius: "14px",
        padding: "1px",
        background: mouse.active
          ? `radial-gradient(200px circle at ${mouse.x}px ${mouse.y}px, var(--glow-card-hover-border, rgba(0,0,0,0.12)), transparent 65%)`
          : undefined,
        transition: "opacity 0.5s cubic-bezier(0.25,1,0.5,1), transform 0.5s cubic-bezier(0.25,1,0.5,1)",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${delay}ms`,
        ...style,
      }}
    >
      <div
        className="glow-card-inner"
        style={{
          background: "var(--c-white)",
          borderRadius: "13px",
          padding: padded ? "36px" : "0",
          position: "relative",
          overflow: "hidden",
          height: "100%",
        }}
      >
        {/* Spotlight */}
        {mouse.active && (
          <div
            style={{
              position: "absolute",
              pointerEvents: "none",
              width: "250px",
              height: "250px",
              borderRadius: "50%",
              left: mouse.x - 125,
              top: mouse.y - 125,
              background: "radial-gradient(circle, rgba(0,0,0,0.025) 0%, transparent 65%)",
              transition: "opacity 0.15s",
            }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1, height: "100%" }}>{children}</div>
      </div>
    </div>
  );
}
