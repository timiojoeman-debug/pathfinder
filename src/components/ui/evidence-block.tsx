import { ReactNode } from "react";
import Link from "next/link";

/*
 * EvidenceBlock — the universal reasoning unit of the console.
 * Encodes the product thesis in one consistent shape:
 *   Metric → Evidence → Recommendation → Projected
 * Themeable via semantic tokens (Terminal default / Archive via [data-theme]).
 */

const C = {
  bg: "var(--surface)",
  border: "var(--line)",
  ink: "var(--ink)",
  mute: "var(--ink-2)",
  faint: "var(--ink-3)",
  good: "var(--signal-strong)",
  warn: "var(--signal-opportunity)",
  bad: "var(--signal-risk)",
  accent: "var(--signal-active)",
};
const mono = "var(--font-mono)";

export type EvidenceTone = "good" | "warn" | "bad" | "accent" | "neutral";

function toneColor(t?: EvidenceTone): string {
  switch (t) {
    case "good": return C.good;
    case "warn": return C.warn;
    case "bad": return C.bad;
    case "accent": return C.accent;
    default: return C.ink;
  }
}

export interface EvidenceStat { label: string; value: string; tone?: EvidenceTone; }
export interface EvidenceAction { tag: string; value: string; href: string; }
export interface EvidenceProjection {
  metricLabel: string;   // e.g. "Readiness", "Fit"
  from: number;
  to: number;
  unit?: string;         // e.g. "%"
  caption: ReactNode;    // the conditional that drives the projection
}

interface EvidenceBlockProps {
  metric?: { value: ReactNode; unit?: string; tone?: EvidenceTone };
  stats?: EvidenceStat[];
  evidence: ReactNode;
  recommendations: EvidenceAction[];
  recommendationLabel?: string;
  projected?: EvidenceProjection;
}

const sectionLabel: React.CSSProperties = {
  fontFamily: mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
  textTransform: "uppercase", color: C.faint, marginBottom: "12px",
};
const statLabel: React.CSSProperties = {
  fontFamily: mono, fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em",
  textTransform: "uppercase", color: C.faint,
};

export function EvidenceBlock({ metric, stats, evidence, recommendations, recommendationLabel = "Recommendation", projected }: EvidenceBlockProps) {
  return (
    <div>
      {/* ── METRIC ── */}
      {metric && (
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "18px" }}>
          <span style={{ fontFamily: mono, fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", color: toneColor(metric.tone) }}>{metric.value}</span>
          {metric.unit && <span style={{ fontFamily: mono, fontSize: "14px", color: C.faint }}>{metric.unit}</span>}
        </div>
      )}

      {/* ── STATS ── */}
      {stats && stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: "1px", background: C.border, border: `1px solid ${C.border}`, marginBottom: "20px" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: C.bg, padding: "12px 12px" }}>
              <div style={statLabel}>{s.label}</div>
              <div style={{ fontFamily: mono, fontSize: "15px", fontWeight: 700, marginTop: "7px", color: toneColor(s.tone) }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── EVIDENCE ── */}
      <div style={sectionLabel}>Evidence</div>
      <p style={{ fontSize: "13.5px", color: C.mute, lineHeight: 1.6, marginBottom: "24px" }}>{evidence}</p>

      {/* ── RECOMMENDATION ── */}
      {recommendations.length > 0 && (
        <>
          <div style={sectionLabel}>{recommendationLabel}</div>
          <div style={{ border: `1px solid ${C.border}`, marginBottom: projected ? "24px" : 0 }}>
            {recommendations.map((it, i) => (
              <Link key={it.tag + i} href={it.href} style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr) 16px", gap: "12px", alignItems: "center", padding: "13px 14px", borderBottom: i < recommendations.length - 1 ? `1px solid ${C.border}` : "none", textDecoration: "none" }}>
                <span style={{ fontFamily: mono, fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent }}>{it.tag}</span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "13.5px", color: C.ink, lineHeight: 1.4 }}>{it.value}</span>
                <span style={{ color: C.faint }}>→</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── PROJECTED ── */}
      {projected && <ProjectedStrip p={projected} />}
    </div>
  );
}

function ProjectedStrip({ p }: { p: EvidenceProjection }) {
  const delta = Math.round(p.to - p.from);
  const positive = delta > 0;
  const u = p.unit ?? "";
  return (
    <div style={{ borderLeft: `2px solid ${C.accent}`, background: "var(--trace-bg)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
        <span style={{ fontFamily: mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint }}>Projected · {p.metricLabel}</span>
        {positive && (
          <span style={{ fontFamily: mono, fontSize: "11px", fontWeight: 700, color: C.good, background: C.bg, border: `1px solid ${C.border}`, padding: "2px 7px" }}>
            +{delta}{u}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
        <span style={{ fontFamily: mono, fontSize: "20px", fontWeight: 700, color: C.faint, letterSpacing: "-0.02em" }}>{p.from}{u}</span>
        <span style={{ color: C.faint, fontSize: "14px" }}>→</span>
        <span style={{ fontFamily: mono, fontSize: "22px", fontWeight: 700, color: positive ? C.good : C.ink, letterSpacing: "-0.02em" }}>{p.to}{u}</span>
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "12.5px", color: C.mute, lineHeight: 1.5, margin: 0 }}>{p.caption}</p>
    </div>
  );
}
