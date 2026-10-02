"use client";

/**
 * The Journey panel — the Command Centre's connected view of the profile:
 * live per-phase progress, the full recommendation ranking, a "what changed"
 * memory feed from the event stream, and the AI's read of strengths/gaps.
 * This is what makes the six phases feel like one evolving system.
 */

import Link from "next/link";
import { usePfStore, useProfile, useProgress, useRecommendations } from "@/lib/pf/store";
import { PHASE_HREF, relativeTime } from "@/lib/pf/events";
import { whatChanged } from "@/lib/pf/orchestrator";
import { Reveal } from "./ui";
import { ProfileNarration } from "./profile-narration";

const mono = "var(--font-mono), 'JetBrains Mono', monospace";

export function ProgressLadder() {
  const progress = useProgress();
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>Journey progress</h2>
        <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--muted)" }}>{progress.overall}% overall</span>
      </div>
      {progress.phases.map((ph) => (
        <Link
          key={ph.phase}
          href={PHASE_HREF[ph.phase]}
          className="pf-hover-row"
          style={{ display: "grid", gridTemplateColumns: "150px 1fr 40px", gap: 12, alignItems: "center", padding: "9px 8px", borderRadius: 9, textDecoration: "none", color: "var(--fg)" }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{ph.label}</span>
          <span style={{ height: 6, borderRadius: 3, background: "var(--panel3)", overflow: "hidden" }}>
            <span className="pf-anim-grow" style={{ display: "block", height: "100%", borderRadius: 3, width: `${ph.pct}%`, background: ph.tone }} />
          </span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: ph.tone, textAlign: "right" }}>{ph.pct}</span>
        </Link>
      ))}
    </Reveal>
  );
}

export function RecommendationStack() {
  const recs = useRecommendations();
  const openApp = usePfStore((s) => s.openApp);
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--accent)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
          </span>
          <h2 className="pf-display-sm" style={{ fontSize: 23, margin: 0 }}>Do next</h2>
        </div>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--faint)" }}>ranked from your profile</span>
      </div>
      {recs.slice(0, 4).map((m, i) => (
        <Link
          key={m.id}
          href={m.href}
          onClick={m.cardKey ? () => openApp(m.cardKey!) : undefined}
          className="pf-hover-row"
          style={{ display: "grid", gridTemplateColumns: "30px 1fr auto", gap: 15, alignItems: "center", padding: "15px 24px", borderTop: "1px solid var(--line2)", textDecoration: "none", color: "var(--fg)" }}
        >
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--faint)" }}>{String(i + 1).padStart(2, "0")}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{m.title}</span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{m.why}</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: m.impactTone }}>{m.impact}</span>
            <span style={{ color: "var(--faint)" }}>→</span>
          </span>
        </Link>
      ))}
    </Reveal>
  );
}

export function MemoryFeed() {
  const profile = useProfile();
  const changes = whatChanged(profile.events, 6);

  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 className="pf-display-sm" style={{ fontSize: 22, margin: 0 }}>What changed</h2>
        <span style={{ fontFamily: mono, fontSize: 10.5, color: "var(--muted)" }}>your AI remembers</span>
      </div>
      {changes.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          Nothing logged yet. As you work through the phases, every action lands here — and the AI mentor references it next time you ask.
        </div>
      ) : (
        [...profile.events]
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 6)
          .map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 11, padding: "7px 0", borderBottom: "1px solid var(--line2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--fg)", lineHeight: 1.5 }}>{e.label}</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{relativeTime(e.ts)}</span>
            </div>
          ))
      )}
    </Reveal>
  );
}

export function ProfileSummary() {
  const profile = useProfile();
  const chip = (label: string, tone: string) => (
    <span key={label} style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: tone, border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`, background: `color-mix(in srgb, ${tone} 7%, transparent)`, borderRadius: 6, padding: "4px 9px" }}>{label}</span>
  );
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
      {/* The heading used to read "in the AI's words" over content that was
          entirely computed. The strengths, gaps and skills below are derived
          from logged work; the mentor's retelling is the block at the end, and
          is labelled where it starts. */}
      <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 4px" }}>Your profile</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Derived from every phase — it&apos;s what the mentor reads before it answers.</span>

      {profile.directionStatement && (
        <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, margin: "14px 0 4px" }}>{profile.directionStatement}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--strong)", marginBottom: 8 }}>Strengths</div>
          {profile.strengths.length ? profile.strengths.map((s) => (
            <div key={s} style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 4 }}>· {s}</div>
          )) : <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Build some — start with direction.</div>}
        </div>
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--risk)", marginBottom: 8 }}>Gaps to close</div>
          {profile.weaknesses.length ? profile.weaknesses.map((w) => (
            <div key={w} style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 4 }}>· {w}</div>
          )) : <div style={{ fontSize: 12.5, color: "var(--faint)" }}>None flagged — nice work.</div>}
        </div>
      </div>

      {(profile.currentSkills.length > 0 || profile.missingSkills.length > 0) && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8 }}>Skills · evidenced vs missing</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {profile.currentSkills.slice(0, 8).map((s) => chip(s, "var(--strong)"))}
            {profile.missingSkills.slice(0, 5).map((s) => chip(s, "var(--warn)"))}
          </div>
        </div>
      )}

      <ProfileNarration />
    </Reveal>
  );
}
