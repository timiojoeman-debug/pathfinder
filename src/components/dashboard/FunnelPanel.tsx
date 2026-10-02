"use client";

import Link from "next/link";

export interface FunnelData {
  submitted: number;
  interviews: number;
  offers: number;
  rejected: number;
  interviewRate: number; // %
  offerRate: number; // %
  projectedRate: string | null; // e.g. "18–28%"
  leak: { text: string; tone: "bad" | "warn" | "good"; href?: string; cta?: string };
}

function tone(t: "bad" | "warn" | "good"): string {
  return t === "good" ? "var(--signal-confidence)" : t === "warn" ? "var(--signal-risk)" : "var(--signal-gap)";
}

function Stage({ label, count, of, color }: { label: string; count: number; of: number; color: string }) {
  const pct = of > 0 ? Math.max(4, Math.round((count / of) * 100)) : 4;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 18px", borderBottom: "1px solid var(--border)" }}>
      <span style={{ width: "78px", fontSize: "12.5px", fontWeight: 600, color: "var(--c-700)" }}>{label}</span>
      <span style={{ flex: 1, height: "8px", borderRadius: "4px", background: "var(--c-100)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", borderRadius: "4px", width: `${pct}%`, background: color, transition: "width 0.9s var(--ease-out-expo)" }} />
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "15px", fontWeight: 700, color: "var(--c-900)", width: "34px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </div>
  );
}

export function FunnelPanel({ data }: { data: FunnelData }) {
  const { submitted, interviews, offers, interviewRate, offerRate, projectedRate, leak } = data;
  const leakColor = tone(leak.tone);

  return (
    <div className="card reveal-up" style={{ overflow: "hidden", padding: 0, marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "9px", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--c-700)" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 7px var(--accent-glow)" }} />
          Conversion funnel
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-400)" }}>
          {interviewRate}% → interview · {offerRate}% → offer
        </span>
      </div>

      <Stage label="Applied" count={submitted} of={submitted} color="var(--accent)" />
      <Stage label="Interviews" count={interviews} of={submitted} color="var(--signal-opportunity)" />
      <Stage label="Offers" count={offers} of={submitted} color="var(--signal-confidence)" />

      {/* Diagnosis */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: leakColor, marginTop: "4px", flexShrink: 0, boxShadow: `0 0 8px ${leakColor}` }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: leakColor, marginBottom: "4px" }}>Diagnosis</span>
          <span style={{ fontSize: "13.5px", color: "var(--c-600)", lineHeight: 1.55 }}>{leak.text}</span>
          {leak.href && leak.cta && (
            <Link href={leak.href} style={{ display: "inline-block", marginTop: "6px", fontSize: "12.5px", fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
              {leak.cta} &rarr;
            </Link>
          )}
        </span>
      </div>

      {/* Calibration */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 18px", background: "var(--c-50)" }}>
        <span style={{ fontSize: "11.5px", color: "var(--c-400)" }}>Projected vs actual interview rate: your forecast, calibrating on real outcomes.</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: "var(--c-700)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
          {projectedRate ?? "—"} <span style={{ color: "var(--c-300)" }}>·</span> {submitted > 0 ? `${interviewRate}%` : "—"}
        </span>
      </div>
    </div>
  );
}
