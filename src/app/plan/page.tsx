"use client";

/**
 * PathFinder redesign — Summer Plan (24-week programme overview).
 * Ported pixel-faithfully from the design handoff (lines 436–470).
 */

import { useEffect, useState } from "react";
import { Reveal } from "@/components/pf/ui";
import { PLAN_CADENCE, PLAN_TOTAL_WEEKS } from "@/lib/pf/data";
import { planPhases, planWeekNow, type PlanPhase } from "@/lib/pf/logic";

const mono = "'JetBrains Mono',monospace";

export default function PlanPage() {
  const [week, setWeek] = useState(1);

  useEffect(() => {
    setWeek(planWeekNow());
  }, []);

  const phases: PlanPhase[] = planPhases(week);
  const pct = Math.round((week / PLAN_TOTAL_WEEKS) * 100) + "%";

  return (
    <div>
      {/* Header */}
      <Reveal style={{ marginBottom: 22 }}>
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
          Summer Plan · 24 weeks · 30–35 hrs/wk
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.03em", margin: "10px 0 6px" }}>Apr 7 → Sep 21, 2026</h1>
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "62ch" }}>
          Your own programme, straight from the Summer Action Plan — four phases building toward the September application window, with CAFI revision and the job search running in parallel.
        </p>
      </Reveal>

      {/* Progress overview */}
      <Reveal style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel)", padding: "18px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>Week {week} of 24</span>
          <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--faint)" }}>{pct} through the programme</span>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: "var(--panel3)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct, borderRadius: 5, background: "var(--accent)", transition: "width .6s var(--ease)" }} />
        </div>
      </Reveal>

      {/* Phase cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        {phases.map((ph) => (
          <Reveal key={ph.tag} style={{ border: `1px solid ${ph.border}`, borderRadius: 16, background: "var(--panel)", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: "var(--accent)" }}>{ph.tag}</span>
              <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".08em", color: "var(--faint)" }}>{ph.weeks} · {ph.dates}</span>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 9.5, fontWeight: 700, color: ph.tone, border: `1px solid color-mix(in srgb,${ph.tone} 35%,transparent)`, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{ph.badge}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{ph.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {ph.items.map((it) => (
                <div key={it.t} style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
                  <span style={{ color: ph.tone, flexShrink: 0 }}>·</span>
                  <span>{it.t}</span>
                </div>
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      {/* Weekly cadence */}
      <Reveal style={{ border: "1px solid color-mix(in srgb,var(--accent) 24%,transparent)", borderRadius: 16, background: "var(--accentSoft)", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>The parallel workstream — every week, all summer</h2>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)" }}>consistency pillar · 25% of your score</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {PLAN_CADENCE.map((pc) => (
            <div key={pc.t} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "#F7F1E4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{pc.n}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{pc.t}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>{pc.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
