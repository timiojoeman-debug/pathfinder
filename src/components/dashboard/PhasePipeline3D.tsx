"use client";

import Link from "next/link";

interface Phase {
  label: string;
  href: string;
  completed: boolean;
  current: boolean;
}

interface PhasePipeline3DProps {
  phases: Phase[];
}

export default function PhasePipeline3D({ phases }: PhasePipeline3DProps) {
  return (
    <div
      style={{
        perspective: "800px",
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          transform: "rotateX(4deg)",
          transformOrigin: "center bottom",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "0",
          flexWrap: "wrap",
          padding: "20px 0",
        }}
      >
        {phases.map((phase, i) => (
          <div
            key={phase.label}
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <Link
              href={phase.href}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "8px",
                transition: "all 0.2s ease",
                opacity: phase.completed || phase.current ? 1 : 0.4,
              }}
            >
              {/* Dot indicator */}
              <div
                style={{
                  width: phase.current ? "14px" : "10px",
                  height: phase.current ? "14px" : "10px",
                  borderRadius: "50%",
                  background: phase.completed
                    ? "var(--c-900)"
                    : phase.current
                    ? "var(--c-900)"
                    : "var(--c-200)",
                  border: phase.current ? "2px solid var(--c-300)" : "none",
                  transition: "all 0.3s ease",
                  boxShadow: phase.current
                    ? "0 0 0 4px rgba(10, 10, 10, 0.1)"
                    : "none",
                  animation: phase.current ? "phasePulse 2s ease-in-out infinite" : "none",
                }}
              />
              {/* Label */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: phase.current ? 600 : 500,
                  color: phase.completed || phase.current ? "var(--c-900)" : "var(--c-400)",
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease",
                }}
              >
                {phase.label}
              </span>
            </Link>
            {/* Connector line */}
            {i < phases.length - 1 && (
              <div
                style={{
                  width: "24px",
                  height: "2px",
                  background: phase.completed ? "var(--c-900)" : "var(--c-200)",
                  borderRadius: "1px",
                  transition: "background 0.3s ease",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes phasePulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(10, 10, 10, 0.1); }
          50% { box-shadow: 0 0 0 8px rgba(10, 10, 10, 0.05); }
        }
        @media (max-width: 640px) {
          /* Vertical layout on mobile handled via container query fallback */
        }
      `}</style>
    </div>
  );
}
