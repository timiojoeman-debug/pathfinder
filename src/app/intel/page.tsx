"use client";

/**
 * Command Centre — the profile hub. Everything here is derived live from the
 * Career Profile: overall readiness, per-phase progress, ranked next steps,
 * the "what changed" memory feed, and the opportunity pipeline. This is where
 * the six phases read as one connected system.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePfStore, useProfile, useProgress } from "@/lib/pf/store";
import { useAuthStore } from "@/lib/stores";
import { CountUp, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";
import { MemoryFeed, ProfileSummary, ProgressLadder, RecommendationStack } from "@/components/pf/journey";
import { fitTone } from "@/lib/pf/logic";

const mono = "'JetBrains Mono',monospace";

export default function IntelPage() {
  const router = useRouter();
  const openJob = usePfStore((s) => s.openJob);
  const profile = useProfile();
  const progress = useProgress();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.email ? user.email.split("@")[0].replace(/[._]/g, " ").split(/\s+/)[0] : "";
  const [today, setToday] = useState("");
  const [partOfDay, setPartOfDay] = useState("morning");

  useEffect(() => {
    const now = new Date();
    setToday(now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
    const h = now.getHours();
    setPartOfDay(h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
  }, []);

  const openOpportunity = (company: string) => {
    openJob(company);
    router.push("/jobs");
  };

  const overallTone = progress.overall >= 65 ? "var(--strong)" : progress.overall >= 45 ? "var(--warn)" : "var(--risk)";
  // Lead with the outcome (interview rate) and the highest-leverage input
  // (referrals) — not raw application volume, which optimises the wrong thing.
  const interviewRatePct = profile.applicationsSubmitted ? Math.round(profile.interviewRate * 100) : null;
  const stats = [
    { label: "Interview rate", value: interviewRatePct !== null ? `${interviewRatePct}%` : "—", note: "the number that matters", color: "var(--accent)" },
    { label: "Referrals", value: String(profile.contactedCompanies.length), note: "warm paths opened", color: "var(--active)" },
    { label: "Interviews", value: String(profile.interviewsLanded), note: "landed", color: "var(--strong)" },
    { label: "Offers", value: String(profile.offers), note: profile.offers ? "in hand" : "keep going", color: "var(--fg)" },
  ];
  const pipeline = profile.targetCompanies.slice(0, 6);

  return (
    <div>
      {/* Greeting header */}
      <Reveal style={{ marginBottom: 18 }}>
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
          Good {partOfDay}{firstName ? `, ${firstName}` : ""}{today ? ` · ${today}` : ""}
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.03em", margin: "10px 0 0" }}>Here&apos;s what moves the needle today.</h1>
      </Reveal>

      {/* The one recommended next step, computed from the whole profile */}
      <NextStep />

      {/* Readiness + Do next */}
      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 18, marginBottom: 18 }}>
        {/* Career readiness — live overall + per-phase factors */}
        <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: 26 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>Career readiness</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <CountUp value={progress.overall} style={{ fontFamily: mono, fontSize: 56, fontWeight: 700, letterSpacing: "-.04em", lineHeight: ".9", color: overallTone }} />
                <span style={{ fontFamily: mono, fontSize: 18, color: "var(--faint)" }}>%</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{progress.band}</div>
            </div>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: "var(--strong)", border: "1px solid color-mix(in srgb,var(--strong) 28%,transparent)", background: "color-mix(in srgb,var(--strong) 8%,transparent)", padding: "4px 9px", borderRadius: 8 }}>
              LIVE
            </span>
          </div>
          {progress.phases.map((f) => (
            <div key={f.phase} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</span>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: f.tone }}>{f.pct}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--panel3)", overflow: "hidden" }}>
                <div className="pf-anim-grow" style={{ height: "100%", borderRadius: 3, width: `${f.pct}%`, background: f.tone }} />
              </div>
            </div>
          ))}
        </Reveal>

        {/* Do next — ranked from the profile */}
        <RecommendationStack />
      </div>

      {/* Live pipeline stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        {stats.map((s) => (
          <Reveal key={s.label} style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", padding: "18px 20px" }}>
            <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--faint)" }}>{s.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, letterSpacing: "-.03em", color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.note}</span>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Profile summary + memory feed */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 18, marginBottom: 18 }}>
        <ProfileSummary />
        <MemoryFeed />
      </div>

      {/* Journey progress ladder */}
      <div style={{ marginBottom: 18 }}>
        <ProgressLadder />
      </div>

      {/* Opportunity pipeline — from the profile's target companies */}
      <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "22px 24px 16px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>Opportunity pipeline</h2>
          <span style={{ fontFamily: mono, fontSize: 11, color: "var(--faint)" }}>ranked by fit</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 96px 150px minmax(0,1.2fr)", gap: 14, padding: "8px 24px", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--panel2)" }}>
          {["Company / Role", "Fit", "Stage", "Move"].map((h) => (
            <span key={h} style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>{h}</span>
          ))}
        </div>
        {pipeline.length === 0 && (
          <div style={{ padding: "26px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>No opportunities yet</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Save roles in <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => router.push("/jobs")}>Opportunity Discovery</span> and they&apos;ll rank here by fit.
            </div>
          </div>
        )}
        {pipeline.map((o) => {
          const tone = fitTone(o.fit);
          return (
            <div
              key={o.company}
              onClick={() => openOpportunity(o.company)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openOpportunity(o.company); } }}
              className="pf-hover-row"
              style={{ cursor: "pointer", display: "grid", gridTemplateColumns: "minmax(0,2fr) 96px 150px minmax(0,1.2fr)", gap: 14, alignItems: "center", padding: "13px 24px", borderBottom: "1px solid var(--line2)", transition: "background .16s var(--ease)" }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{o.company}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>{o.role}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 34, height: 4, borderRadius: 2, background: "var(--panel3)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${o.fit}%`, background: tone }} />
                </span>
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: tone }}>{o.fit}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--muted)" }}>{o.stage}</span>
              <span style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 600 }}>Open →</span>
            </div>
          );
        })}
      </Reveal>
    </div>
  );
}
