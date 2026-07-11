/*
 * CareerSimulation — a grounded what-if panel.
 * Toggle hypothetical moves; the projected readiness re-scores from the same model
 * that drives the live number (no invented uplift). Themeable via semantic tokens.
 */

const C = {
  bg: "var(--surface)",
  surface: "var(--surface-2)",
  surface2: "var(--surface-3)",
  border: "var(--line)",
  borderStrong: "var(--line-strong)",
  ink: "var(--ink)",
  mute: "var(--ink-2)",
  faint: "var(--ink-3)",
  good: "var(--signal-strong)",
  amber: "var(--signal-opportunity)",
  red: "var(--signal-risk)",
  accent: "var(--signal-active)",
};
const mono = "var(--font-mono)";
const label: React.CSSProperties = { fontFamily: mono, fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint };

export interface SimMove { key: string; label: string; detail: string; delta: number; active: boolean; }

interface CareerSimulationProps {
  current: number;
  projected: number;
  moves: SimMove[];
  onToggle: (key: string) => void;
}

function band(v: number): string {
  return v >= 70 ? C.good : v >= 45 ? C.amber : C.red;
}

export function CareerSimulation({ current, projected, moves, onToggle }: CareerSimulationProps) {
  const delta = projected - current;
  const activeCount = moves.filter((m) => m.active).length;

  return (
    <div style={{ marginTop: "44px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ ...label, color: C.ink, fontSize: "11px" }}>Career simulation</span>
        <span style={label}>model your next moves · {activeCount} selected</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 232px", border: `1px solid ${C.borderStrong}`, borderRadius: "var(--radius-card)" }}>
        {/* Toggleable moves */}
        <div style={{ borderRight: `1px solid ${C.border}` }}>
          {moves.map((m, i) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onToggle(m.key)}
              aria-pressed={m.active}
              style={{ display: "grid", gridTemplateColumns: "18px minmax(0,1fr) 48px", gap: "12px", alignItems: "center", width: "100%", textAlign: "left", padding: "13px 16px", border: "none", borderBottom: i < moves.length - 1 ? `1px solid ${C.border}` : "none", background: m.active ? C.surface : "transparent", cursor: "pointer", transition: "background 0.12s" }}
            >
              <span style={{ width: "16px", height: "16px", borderRadius: "var(--radius-tight)", border: `1.5px solid ${m.active ? C.accent : C.borderStrong}`, background: m.active ? C.accent : "transparent", color: "var(--ink-inv)", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{m.active ? "✓" : ""}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: "13.5px", fontWeight: 600, color: C.ink, letterSpacing: "-0.01em" }}>{m.label}</span>
                <span style={{ display: "block", fontSize: "12px", color: C.mute, marginTop: "2px", lineHeight: 1.4 }}>{m.detail}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: "12px", fontWeight: 700, color: m.delta > 0 ? C.good : C.faint, textAlign: "right" }}>{m.delta > 0 ? `+${m.delta}` : "—"}</span>
            </button>
          ))}
        </div>

        {/* Projected readout */}
        <div style={{ background: "var(--trace-bg)", padding: "18px 18px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={label}>Projected readiness</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "9px", margin: "10px 0 4px" }}>
            <span style={{ fontFamily: mono, fontSize: "24px", fontWeight: 700, color: C.faint, letterSpacing: "-0.02em" }}>{current}</span>
            <span style={{ color: C.faint, fontSize: "15px" }}>→</span>
            <span style={{ fontFamily: mono, fontSize: "34px", fontWeight: 700, color: band(projected), letterSpacing: "-0.03em", lineHeight: 1 }}>{projected}</span>
            {delta > 0 && <span style={{ fontFamily: mono, fontSize: "12px", fontWeight: 700, color: C.good, background: C.bg, border: `1px solid ${C.border}`, padding: "2px 7px" }}>+{delta}</span>}
          </div>
          <span style={{ display: "block", height: "5px", background: C.surface2, borderRadius: "3px", overflow: "hidden", margin: "8px 0 12px" }}>
            <span style={{ display: "block", height: "100%", width: `${projected}%`, background: band(projected), transition: "width 0.3s var(--ease-out-expo)" }} />
          </span>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: C.mute, lineHeight: 1.5, margin: 0 }}>
            {delta > 0
              ? <>Completing the selected moves lifts you to <strong style={{ color: band(projected) }}>{projected >= 70 ? "interview-ready" : projected >= 45 ? "competitive" : "building"}</strong>. These are your highest-leverage actions.</>
              : "Select moves above to model their compound effect on your readiness."}
          </p>
        </div>
      </div>
    </div>
  );
}
