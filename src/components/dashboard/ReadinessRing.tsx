"use client";

import { useEffect, useId, useState } from "react";

interface ReadinessRingProps {
  value: number; // 0–100
  size?: number;
  stroke?: number;
}

/* Animated circular readiness gauge — the dashboard's "mission control" centerpiece. */
export function ReadinessRing({ value, size = 152, stroke = 12 }: ReadinessRingProps) {
  const gradId = useId();
  const [p, setP] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setP(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (p / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-hover)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.3s cubic-bezier(0.16,1,0.3,1)",
            filter: "drop-shadow(0 0 7px var(--accent-glow))",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "36px",
            fontWeight: 600,
            letterSpacing: "-0.045em",
            color: "var(--c-900)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {p}
          <span style={{ fontSize: "17px", color: "var(--c-400)", marginLeft: "1px" }}>%</span>
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9.5px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--c-400)",
            marginTop: "5px",
          }}
        >
          Ready
        </span>
      </div>
    </div>
  );
}
