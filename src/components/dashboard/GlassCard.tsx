"use client";

import { type CSSProperties, type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function GlassCard({ children, className, style }: GlassCardProps) {
  return (
    <div
      className={className}
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "rgba(255, 255, 255, 0.7)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "12px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
