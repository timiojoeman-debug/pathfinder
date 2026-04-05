"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/stores";
import { MagBtn } from "@/components/ui/mag-btn";
import { Tag } from "@/components/ui/typography";
import ParticleField from "@/components/dashboard/ParticleField";
import TiltCard from "@/components/dashboard/TiltCard";
import PhasePipeline3D from "@/components/dashboard/PhasePipeline3D";
import GlassCard from "@/components/dashboard/GlassCard";

/* ─── Helpers ─── */

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  return monday;
}

function isThisWeek(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= getWeekStart();
}

function isFriday(): boolean {
  return new Date().getDay() === 5;
}

function getWeekKey(): string {
  const ws = getWeekStart();
  return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Sun ... 4=Thu 5=Fri
}

/* ─── Pillar Card ─── */

function PillarCard({
  number,
  title,
  href,
  children,
}: {
  number: string;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        className="card"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          background: "var(--background)",
          transition: "all 0.2s ease",
          cursor: "pointer",
          height: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--c-300)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "var(--c-900)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            {number}
          </span>
          <span
            className="section-title"
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--c-900)",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{children}</div>
      </div>
    </Link>
  );
}

/* ─── Stat Row ─── */

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span
        className="section-label"
        style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: accent ? "var(--c-900)" : "var(--c-600)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Main Dashboard ─── */

export default function DashboardPage() {
  const direction = useAppStore((s) => s.direction);
  const cv = useAppStore((s) => s.cv);
  const applications = useAppStore((s) => s.applications);
  const contacts = useAppStore((s) => s.contacts);
  const stories = useAppStore((s) => s.stories);
  const fridayReviews = useAppStore((s) => s.fridayReviews);

  // Derived stats
  const appsThisWeek = useMemo(
    () => applications.filter((a) => isThisWeek(a.appliedDate)).length,
    [applications]
  );

  const totalApps = applications.length;

  const interviewingCount = useMemo(
    () => applications.filter((a) => a.status === "interviewing").length,
    [applications]
  );

  const networkingApps = useMemo(
    () => applications.filter((a) => a.status === "networking").length,
    [applications]
  );

  const messagesSent = useMemo(
    () => contacts.filter((c) => c.followUpStep > 0).length,
    [contacts]
  );

  const coffeeChatsDone = useMemo(
    () => contacts.filter((c) => c.followUpStep >= 3).length,
    [contacts]
  );

  const hasReviewThisWeek = useMemo(
    () => fridayReviews.some((r) => r.date === getWeekKey()),
    [fridayReviews]
  );

  const showFridayPrompt = isFriday() && !hasReviewThisWeek;

  // Next Best Action logic
  const nextAction = useMemo(() => {
    if (!direction.statement) {
      return { label: "Set your career direction", href: "/direction", tag: "Start here" };
    }
    if (!cv.rawText) {
      return { label: "Upload your CV", href: "/cv", tag: "Phase 2" };
    }
    if (cv.analysisScore !== null && totalApps === 0) {
      return { label: "Start searching for internships", href: "/jobs", tag: "Phase 3" };
    }
    if (totalApps > 0 && contacts.length === 0) {
      return { label: "Start networking for your applications", href: "/networking", tag: "Phase 4" };
    }
    if (interviewingCount > 0) {
      return { label: "Prepare for your upcoming interviews", href: "/interview", tag: "Phase 5" };
    }
    if (totalApps > 0) {
      return { label: "Keep applying - aim for 2-3 quality apps per week", href: "/jobs", tag: "Consistency" };
    }
    return { label: "Continue building your profile", href: "/direction", tag: "Next step" };
  }, [direction.statement, cv.rawText, cv.analysisScore, totalApps, contacts.length, interviewingCount]);

  // Weekly quality warning
  const weeklyWarning = useMemo(() => {
    if (appsThisWeek > 5) {
      return "Quality over quantity - more than 5 apps/week often means less tailoring per application.";
    }
    // Thursday = 4, Friday = 5, Saturday = 6, Sunday = 0
    const day = getDayOfWeek();
    if (appsThisWeek === 0 && (day >= 4 || day === 0)) {
      return "Aim for 2-3 quality applications this week. Start with roles that match your direction.";
    }
    return null;
  }, [appsThisWeek]);

  // Direction display
  const directionStatus = direction.statement ? "Set" : "Not set";
  const directionScore = direction.score ?? "--";
  const cvScore = cv.analysisScore ?? "--";
  const linkedinStatus = cv.rawText ? "Uploaded" : "Not uploaded";

  /* ─── Phase quick links ─── */
  const phases = [
    { num: "01", label: "Direction", href: "/direction" },
    { num: "02", label: "CV & Profile", href: "/cv" },
    { num: "03", label: "Job Search", href: "/jobs" },
    { num: "04", label: "Networking", href: "/networking" },
    { num: "05", label: "Interview Prep", href: "/interview" },
    { num: "06", label: "Application Tracker", href: "/tracker" },
  ];

  /* ─── Phase pipeline data ─── */
  const pipelinePhases = useMemo(
    () => {
      const phase1Done = !!direction.statement;
      const phase2Done = !!cv.rawText;
      const phase3Done = totalApps > 0;
      const phase4Done = contacts.length > 0;
      const phase5Done = stories.length > 0;
      // Current = first incomplete phase
      const doneFlags = [phase1Done, phase2Done, phase3Done, phase4Done, phase5Done, false];
      const currentIdx = doneFlags.indexOf(false);
      return [
        { label: "Direction", href: "/direction", completed: phase1Done, current: currentIdx === 0 },
        { label: "CV", href: "/cv", completed: phase2Done, current: currentIdx === 1 },
        { label: "Jobs", href: "/jobs", completed: phase3Done, current: currentIdx === 2 },
        { label: "Networking", href: "/networking", completed: phase4Done, current: currentIdx === 3 },
        { label: "Interview", href: "/interview", completed: phase5Done, current: currentIdx === 4 },
        { label: "Tracker", href: "/tracker", completed: false, current: currentIdx === 5 },
      ];
    },
    [direction.statement, cv.rawText, totalApps, contacts.length, stories.length]
  );

  return (
    <>
      <ParticleField />
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "48px 24px 96px",
          fontFamily: "var(--font-sans)",
          position: "relative",
          zIndex: 1,
        }}
      >
      {/* ─── Welcome Header ─── */}
      <div style={{ marginBottom: "48px" }}>
        <h1
          style={{
            fontSize: "clamp(24px, 3.5vw, 32px)",
            fontWeight: 500,
            color: "var(--c-900)",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            marginBottom: "12px",
          }}
        >
          Dashboard
        </h1>
        {direction.statement ? (
          <p
            className="section-subtitle"
            style={{
              fontSize: "15px",
              color: "var(--muted)",
              lineHeight: 1.6,
              maxWidth: "600px",
            }}
          >
            {direction.statement}
          </p>
        ) : (
          <p
            className="section-subtitle"
            style={{ fontSize: "15px", color: "var(--muted)", lineHeight: 1.6 }}
          >
            Set your career direction to get personalised guidance across all phases.
          </p>
        )}
      </div>

      {/* ─── Next Best Action ─── */}
      <GlassCard style={{ marginBottom: "32px" }}>
        <div
          className="nba-preview"
          style={{
            borderRadius: "12px",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--c-900)",
                letterSpacing: "-0.01em",
              }}
            >
              Next best action
            </span>
            <Tag>{nextAction.tag}</Tag>
          </div>
          <Link href={nextAction.href} style={{ textDecoration: "none" }}>
            <MagBtn variant="primary" size="sm">
              {nextAction.label} <span aria-hidden="true">&rarr;</span>
            </MagBtn>
          </Link>
        </div>
      </GlassCard>

      {/* ─── Weekly Application Counter ─── */}
      <GlassCard style={{ marginBottom: "32px" }}>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: weeklyWarning ? "10px" : 0 }}>
            <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>
              Applications this week:
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--c-900)",
                letterSpacing: "-0.02em",
              }}
            >
              {appsThisWeek}
            </span>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>/ 3 target</span>
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: "4px",
              borderRadius: "2px",
              background: "var(--c-100)",
              overflow: "hidden",
              marginBottom: weeklyWarning ? "12px" : 0,
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: "2px",
                background: appsThisWeek > 5 ? "var(--c-400)" : "var(--c-900)",
                width: `${Math.min((appsThisWeek / 3) * 100, 100)}%`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          {weeklyWarning && (
            <p
              style={{
                fontSize: "12.5px",
                color: appsThisWeek > 5 ? "var(--c-500)" : "var(--muted)",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              {weeklyWarning}
            </p>
          )}
        </div>
      </GlassCard>

      {/* ─── Four Pillars ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <TiltCard>
          <PillarCard number="01" title="Clarity" href="/direction">
            <StatRow label="Direction" value={directionStatus} accent={!!direction.statement} />
            <StatRow label="Score" value={directionScore} />
          </PillarCard>
        </TiltCard>

        <TiltCard>
          <PillarCard number="02" title="Positioning" href="/cv">
            <StatRow label="CV score" value={cvScore} />
            <StatRow label="CV" value={linkedinStatus} />
          </PillarCard>
        </TiltCard>

        <TiltCard>
          <PillarCard number="03" title="Networking" href="/networking">
            <StatRow label="Contacts" value={contacts.length} />
            <StatRow label="Coffee chats" value={coffeeChatsDone} />
            <StatRow label="Messages sent" value={messagesSent} />
          </PillarCard>
        </TiltCard>

        <TiltCard>
          <PillarCard number="04" title="Consistency" href="/tracker">
            <StatRow label="This week" value={`${appsThisWeek} / 3`} accent={appsThisWeek >= 2} />
            <StatRow label="Total apps" value={totalApps} />
          </PillarCard>
        </TiltCard>
      </div>

      {/* ─── Friday Review Prompt ─── */}
      {showFridayPrompt && (
        <div
          style={{
            border: "1px solid var(--c-150)",
            borderRadius: "12px",
            padding: "20px 24px",
            marginBottom: "32px",
            background: "var(--c-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--c-900)",
                marginBottom: "4px",
              }}
            >
              Friday Review
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted)" }}>
              Take 5 minutes to reflect on your week across all four pillars.
            </p>
          </div>
          <MagBtn variant="secondary" size="sm" onClick={() => {}}>
            Start review
          </MagBtn>
        </div>
      )}

      {/* ─── Phase Pipeline 3D ─── */}
      <PhasePipeline3D phases={pipelinePhases} />

      {/* ─── Quick Links ─── */}
      <div style={{ marginBottom: "16px" }}>
        <span
          className="section-label"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--muted)",
            display: "block",
            marginBottom: "14px",
          }}
        >
          All phases
        </span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
          }}
        >
          {phases.map((phase) => (
            <Link
              key={phase.num}
              href={phase.href}
              className="action-row"
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "var(--background)",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  letterSpacing: "0.03em",
                }}
              >
                {phase.num}
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--c-700)" }}>
                {phase.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
