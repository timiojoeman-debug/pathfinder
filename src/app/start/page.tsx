"use client";

/**
 * Stage 00 — Onboarding. Three-step baseline: choose a target, rate the
 * starting point, and see the calculated readiness with pillar gaps.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  ONB_CADENCE_OPTS,
  ONB_CV_OPTS,
  ONB_INDUSTRY_OPTS,
  ONB_OUTREACH_OPTS,
  ONB_PROJ_OPTS,
  ONB_ROLE_OPTS,
  ONB_STAGE_OPTS,
} from "@/lib/pf/data";
import { bandFor, readinessFrom, toneFor } from "@/lib/pf/logic";
import { usePfStore } from "@/lib/pf/store";
import { CountUp, Kicker, Reveal } from "@/components/pf/ui";

function OnbChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{
        cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, padding: "9px 15px", borderRadius: 10,
        border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
        background: on ? "var(--accent)" : "var(--panel2)",
        color: on ? "var(--onAccent)" : "var(--muted)",
        transition: "background-color .2s var(--ease), border-color .2s var(--ease), color .2s var(--ease), transform .16s cubic-bezier(.23,1,.32,1)", userSelect: "none",
      }}
    >
      {label}
    </span>
  );
}

function ChipGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

export default function StartPage() {
  const router = useRouter();
  const s = usePfStore();
  const onb = s.onb;

  const statement =
    onb.role && onb.industry && onb.stage
      ? `${onb.role} internships in ${onb.industry}, ${onb.stage}.`
      : "Choose a role, industry and stage above to build your statement.";
  const step1Ready = !!(onb.role && onb.industry && onb.stage);
  const step2Ready = !!(onb.cv && onb.projects && onb.outreach && onb.cadence);

  const cvV = onb.cv ?? 0;
  const projV = onb.projects ?? 0;
  const outV = onb.outreach ?? 0;
  const cadV = onb.cadence ?? 0;
  // readinessFrom counts an unanswered slider as 0, so it is correct mid-way through as well as at the end
  const shownReadiness = readinessFrom(onb);
  const band = bandFor(shownReadiness);
  const readinessTone = toneFor(shownReadiness);
  const readinessDash = Math.round(402 * (1 - shownReadiness / 100));

  const pillars = [
    { label: "CV & positioning", value: cvV, color: toneFor(cvV), pct: cvV + "%" },
    { label: "Portfolio strength", value: projV, color: toneFor(projV), pct: projV + "%" },
    { label: "Networking activity", value: outV, color: toneFor(outV), pct: outV + "%" },
    { label: "Application cadence", value: cadV, color: toneFor(cadV), pct: cadV + "%" },
  ];
  const gaps = [
    { label: "CV & positioning", value: cvV, href: "/cv" },
    { label: "Portfolio strength", value: projV, href: "/cv" },
    { label: "Networking activity", value: outV, href: "/networking" },
    { label: "Application cadence", value: cadV, href: "/tracker" },
  ]
    .filter((g) => g.value < 60)
    .sort((a, b) => a.value - b.value);

  const stepBg = (n: number) => (onb.step >= n ? "var(--accent)" : "var(--panel3)");
  const isStep1 = onb.step === 1;
  const isStep2 = onb.step === 2;
  const isStep3 = onb.step === 3;

  const finish = () => {
    s.finishOnb();
    router.push("/intel");
    window.scrollTo(0, 0);
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <Reveal style={{ marginBottom: 26 }}>
        <span className="pf-mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>Stage 00 · Onboarding</span>
        <h1 className="pf-display" style={{ fontSize: 44, margin: "10px 0 8px" }}>Let&apos;s find your starting point.</h1>
        <p style={{ fontSize: 15, color: "var(--muted)", margin: "0 0 16px", maxWidth: "56ch" }}>
          Three minutes to set your direction and measure your baseline. Nothing here is graded; it just tells the AI where to point you first.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ height: 5, flex: 1, borderRadius: 3, background: stepBg(1) }} />
          <span style={{ height: 5, flex: 1, borderRadius: 3, background: stepBg(2) }} />
          <span style={{ height: 5, flex: 1, borderRadius: 3, background: stepBg(3) }} />
        </div>
      </Reveal>

      {isStep1 && (
        <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "28px 30px" }}>
          <Kicker style={{ marginBottom: 16 }}>Step 1 of 3 · Choose your target</Kicker>

          <ChipGroup title="Role">
            {ONB_ROLE_OPTS.map((l) => (
              <OnbChip key={l} label={l} on={onb.role === l} onClick={() => s.setOnb({ role: l })} />
            ))}
          </ChipGroup>
          <ChipGroup title="Industry">
            {ONB_INDUSTRY_OPTS.map((l) => (
              <OnbChip key={l} label={l} on={onb.industry === l} onClick={() => s.setOnb({ industry: l })} />
            ))}
          </ChipGroup>
          <ChipGroup title="Stage">
            {ONB_STAGE_OPTS.map((l) => (
              <OnbChip key={l} label={l} on={onb.stage === l} onClick={() => s.setOnb({ stage: l })} />
            ))}
          </ChipGroup>

          <div style={{ border: "1px solid color-mix(in srgb,var(--accent) 22%,transparent)", borderRadius: 14, background: "var(--accentSoft)", padding: "18px 20px", marginBottom: 22 }}>
            <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accentText)", marginBottom: 8 }}>Your direction statement</div>
            <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.5 }}>{statement}</div>
          </div>

          <button
            onClick={() => { if (step1Ready) s.setOnb({ step: 2 }); }}
            disabled={!step1Ready}
            style={{ cursor: step1Ready ? "pointer" : "default", height: 48, padding: "0 26px", borderRadius: 12, border: "none", background: step1Ready ? "var(--accent)" : "var(--panel3)", color: step1Ready ? "var(--onAccent)" : "var(--faint)", fontSize: 14.5, fontWeight: 600 }}
          >
            Continue →
          </button>
        </Reveal>
      )}

      {isStep2 && (
        <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "28px 30px" }}>
          <Kicker style={{ marginBottom: 16 }}>Step 2 of 3 · Rate your starting point</Kicker>

          <ChipGroup title="How ready is your CV for these roles?">
            {ONB_CV_OPTS.map(([l, v]) => (
              <OnbChip key={l} label={l} on={onb.cv === v} onClick={() => s.setOnb({ cv: v })} />
            ))}
          </ChipGroup>
          <ChipGroup title="How strong is your project portfolio?">
            {ONB_PROJ_OPTS.map(([l, v]) => (
              <OnbChip key={l} label={l} on={onb.projects === v} onClick={() => s.setOnb({ projects: v })} />
            ))}
          </ChipGroup>
          <ChipGroup title="How active is your networking?">
            {ONB_OUTREACH_OPTS.map(([l, v]) => (
              <OnbChip key={l} label={l} on={onb.outreach === v} onClick={() => s.setOnb({ outreach: v })} />
            ))}
          </ChipGroup>
          <ChipGroup title="How consistent is your weekly application rhythm?">
            {ONB_CADENCE_OPTS.map(([l, v]) => (
              <OnbChip key={l} label={l} on={onb.cadence === v} onClick={() => s.setOnb({ cadence: v })} />
            ))}
          </ChipGroup>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={() => s.setOnb({ step: 1 })}
              style={{ cursor: "pointer", height: 48, padding: "0 22px", borderRadius: 12, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--fg)", fontSize: 14.5, fontWeight: 600 }}
            >
              ← Back
            </button>
            <button
              onClick={s.startOnbScan}
              disabled={!step2Ready}
              style={{ cursor: step2Ready ? "pointer" : "default", height: 48, padding: "0 26px", borderRadius: 12, border: "none", background: step2Ready ? "var(--accent)" : "var(--panel3)", color: step2Ready ? "var(--onAccent)" : "var(--faint)", fontSize: 14.5, fontWeight: 600 }}
            >
              Calculate my readiness →
            </button>
          </div>
        </Reveal>
      )}

      {isStep3 && (
        <div>
          <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: 30, textAlign: "center", marginBottom: 18 }}>
            <div style={{ position: "relative", width: 150, height: 150, margin: "0 auto 16px" }}>
              <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="75" cy="75" r="64" fill="none" stroke="var(--panel3)" strokeWidth="11" />
                <circle cx="75" cy="75" r="64" fill="none" stroke={readinessTone} strokeWidth="11" strokeLinecap="round" strokeDasharray="402" strokeDashoffset={readinessDash} style={{ transition: "stroke-dashoffset .8s var(--ease)" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <CountUp value={shownReadiness} className="pf-mono" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: readinessTone }} />
                <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", marginTop: 4 }}>/ 100</span>
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{band.name}</div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "20px 24px" }}>
              <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 14px" }}>Your pillars</h2>
              {pillars.map((p) => (
                <div key={p.label} style={{ marginBottom: 13 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</span>
                    <span className="pf-mono" style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.value}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--panel3)", overflow: "hidden" }}>
                    <div className="pf-anim-grow" style={{ height: "100%", borderRadius: 3, width: p.pct, background: p.color }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: "var(--faint)", lineHeight: 1.5, marginTop: 4 }}>
                These are your own ratings from step 2. The command centre&apos;s numbers start at zero and move only with real work.
              </div>
            </Reveal>

            <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "20px 24px" }}>
              <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 4px" }}>Close these first</h2>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Worst gap first: biggest leverage</span>
              <div style={{ marginTop: 14 }}>
                {gaps.map((g) => (
                  <Link key={g.label} href={g.href} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderTop: "1px solid var(--line2)", cursor: "pointer", textDecoration: "none", color: "var(--fg)" }}>
                    <span className="pf-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--risk)", width: 26 }}>{g.value}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                    <span className="pf-mono" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--accent)" }}>Fix →</span>
                  </Link>
                ))}
                {gaps.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>No pillar below 60. Nice work. Keep the cadence up.</div>
                )}
              </div>
            </Reveal>
          </div>

          <Reveal style={{ textAlign: "center", marginTop: 22 }}>
            <button
              onClick={finish}
              style={{ cursor: "pointer", height: 50, padding: "0 30px", borderRadius: 13, border: "none", background: "var(--fg)", color: "var(--bg)", fontSize: 15, fontWeight: 600 }}
            >
              Enter your command centre →
            </button>
          </Reveal>
        </div>
      )}
    </div>
  );
}
