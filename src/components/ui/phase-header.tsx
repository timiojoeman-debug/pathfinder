import { ReactNode } from "react";
import { I } from "./icons";

/* Each phase carries its own identity word — the spine of the product narrative. */
const PHASES = {
  1: { theme: "Exploration", Icon: I.Compass },
  2: { theme: "Precision", Icon: I.File },
  3: { theme: "Opportunity", Icon: I.Search },
  4: { theme: "Connections", Icon: I.Users },
  5: { theme: "Mastery", Icon: I.Mic },
  6: { theme: "Momentum", Icon: I.Chart },
} as const;

type PhaseNum = keyof typeof PHASES;

export type SignalTone = "good" | "warn" | "bad" | "accent" | "neutral";
export type PhaseSignal = { label: string; value: string | number; tone?: SignalTone };

interface PhaseHeaderProps {
  phase: PhaseNum;
  title: ReactNode;
  children?: ReactNode;
  /** Live, derived metrics rendered as an instrument readout. */
  signals?: PhaseSignal[];
}

export function PhaseHeader({ phase, title, children, signals }: PhaseHeaderProps) {
  const { theme, Icon } = PHASES[phase];
  return (
    <header className="phase-header reveal-up">
      <div className="phase-header-eyebrow">
        <span className="phase-header-chip" aria-hidden="true">
          <Icon />
        </span>
        <span className="phase-header-meta">
          <span className="phase-header-num">Phase {phase}</span>
          <span className="phase-header-sep">/</span>
          <span className="phase-header-theme">{theme}</span>
        </span>
      </div>
      <h1 className="phase-header-title">{title}</h1>
      {children && <p className="phase-header-sub">{children}</p>}
      {signals && signals.length > 0 && (
        <div className="phase-signals" role="group" aria-label="Live signals">
          {signals.map((s, i) => (
            <div className="phase-signal" key={i}>
              <span className="phase-signal-label">{s.label}</span>
              <span className="phase-signal-value" data-tone={s.tone ?? "neutral"}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
