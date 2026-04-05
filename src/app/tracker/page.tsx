"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  getApplications,
  setApplications,
  getNetworkingCount,
  type Application,
  type PipelineStageId,
} from "@/lib/store";
import { Tag } from "@/components/ui/typography";

const PIPELINE_STAGES: { id: PipelineStageId; label: string }[] = [
  { id: "researching", label: "Researching" },
  { id: "tailoring", label: "Tailoring" },
  { id: "applied", label: "Applied" },
  { id: "networking", label: "Networking" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "ghosted", label: "Ghosted" },
];

const REJECTION_TIMING_OPTIONS: { value: string; label: string; diagnosis: string }[] = [
  {
    value: "within_hours",
    label: "Within hours",
    diagnosis: "ATS filter — likely missing keywords. Review your CV against the job description.",
  },
  {
    value: "within_1_2_days",
    label: "Within 1-2 days",
    diagnosis: "Recruiter screened and passed. Your profile may not match seniority or domain.",
  },
  {
    value: "after_2_weeks",
    label: "After 2+ weeks",
    diagnosis: "Role was likely closed or filled internally. Not a reflection of your profile.",
  },
  {
    value: "never_heard_back",
    label: "Never heard back",
    diagnosis: "Follow up via LinkedIn. A polite message can re-surface your application.",
  },
];

function getTimingDiagnosis(timing: string): string {
  const option = REJECTION_TIMING_OPTIONS.find((o) => o.value === timing);
  return option?.diagnosis ?? "";
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  return monday;
}

function getAppsThisWeek(applications: Application[]): number {
  const weekStart = getWeekStart();
  return applications.filter((a) => {
    if (!a.appliedDate) return false;
    return new Date(a.appliedDate) >= weekStart;
  }).length;
}

export default function TrackerPage() {
  const [applications, setApps] = useState<Application[]>([]);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [diagnosingId, setDiagnosingId] = useState<string | null>(null);

  const loadApplications = useCallback(() => {
    setApps(getApplications());
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  function moveCard(cardId: string, targetStage: PipelineStageId) {
    const updated = applications.map((a) => {
      if (a.id !== cardId) return a;
      const patch: Partial<Application> = { stage: targetStage };
      // When moving to "applied", stamp the appliedDate if not set
      if (targetStage === "applied" && !a.appliedDate) {
        patch.appliedDate = new Date().toISOString().slice(0, 10);
      }
      return { ...a, ...patch };
    });
    setApps(updated);
    setApplications(updated);
  }

  function moveUpDown(cardId: string, direction: "up" | "down", stageId: PipelineStageId) {
    const inStage = applications
      .filter((a) => a.stage === stageId)
      .map((a) => a.id);
    const idx = inStage.indexOf(cardId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= inStage.length) return;
    const allIds = applications.map((a) => a.id);
    const i = allIds.indexOf(cardId);
    const j = allIds.indexOf(inStage[swapIdx]);
    const arr = [...applications];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setApps(arr);
    setApplications(arr);
  }

  function updateReminder(cardId: string, date: string) {
    const updated = applications.map((a) =>
      a.id === cardId ? { ...a, reminderDate: date } : a
    );
    setApps(updated);
    setApplications(updated);
  }

  function removeCard(cardId: string) {
    const updated = applications.filter((a) => a.id !== cardId);
    setApps(updated);
    setApplications(updated);
    setRemoveConfirmId(null);
  }

  function setRejectionTiming(cardId: string, timing: string) {
    const updated = applications.map((a) =>
      a.id === cardId ? { ...a, rejectionTiming: timing } : a
    );
    setApps(updated);
    setApplications(updated);
    setDiagnosingId(null);
  }

  // --- Stats ---
  const total = applications.length;
  const interviews = applications.filter((a) => a.stage === "interviewing").length;
  const offers = applications.filter((a) => a.stage === "offer").length;
  const networkingCount = getNetworkingCount();

  // --- Weekly counter ---
  const WEEKLY_TARGET = 3;
  const appsThisWeek = getAppsThisWeek(applications);
  const weekProgress = Math.min(appsThisWeek / WEEKLY_TARGET, 1);
  const dayOfWeek = new Date().getDay(); // 0=Sun, 4=Thu
  const isThursdayOrLater = dayOfWeek >= 4 || dayOfWeek === 0;

  let weeklyWarning: string | null = null;
  if (appsThisWeek > 5) {
    weeklyWarning =
      "You have sent more than 5 applications this week. Consider slowing down and focusing on quality over quantity.";
  } else if (appsThisWeek === 0 && isThursdayOrLater) {
    weeklyWarning =
      "It is Thursday or later and you have not applied anywhere this week. Try to submit at least one quality application today.";
  }

  // --- Rejection pattern detection ---
  const rejectionInsight = useMemo(() => {
    const rejectedApps = applications.filter(
      (a) => (a.stage === "rejected" || a.stage === "ghosted") && a.rejectionTiming
    );
    if (rejectedApps.length < 3) return null;

    const counts: Record<string, number> = {};
    for (const app of rejectedApps) {
      counts[app.rejectionTiming!] = (counts[app.rejectionTiming!] || 0) + 1;
    }

    let topTiming = "";
    let topCount = 0;
    for (const [timing, count] of Object.entries(counts)) {
      if (count > topCount) {
        topTiming = timing;
        topCount = count;
      }
    }

    const pct = Math.round((topCount / rejectedApps.length) * 100);
    if (pct < 50) return null;

    const option = REJECTION_TIMING_OPTIONS.find((o) => o.value === topTiming);
    if (!option) return null;

    const adviceMap: Record<string, string> = {
      within_hours:
        "This usually means ATS keyword issues. Check your CV keywords against job descriptions.",
      within_1_2_days:
        "Recruiters are reviewing but passing. Consider targeting roles that better match your experience level.",
      after_2_weeks:
        "Roles are closing before decisions. Try applying to fresher postings and following up sooner.",
      never_heard_back:
        "Many companies ghost candidates. Follow up on LinkedIn 1-2 weeks after applying.",
    };

    return `${pct}% of your rejections were "${option.label}" — ${adviceMap[topTiming] || option.diagnosis}`;
  }, [applications]);

  return (
    <div className="page-container overflow-safe">
      <div className="flex flex-col gap-8">
      <section>
        <p className="section-label">Phase 6</p>
        <h1 className="section-title">Application Pipeline & Consistency</h1>
        <p className="section-subtitle">
          Stages are rows. Drag applications up and down within a stage to reorder. Use the stage
          dropdown to move between stages. &quot;Are you sure?&quot; when removing.
        </p>
      </section>

      {/* Weekly Application Counter */}
      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Applications this week: {appsThisWeek} / {WEEKLY_TARGET} target
          </p>
          {appsThisWeek >= WEEKLY_TARGET && (
            <Tag>On track</Tag>
          )}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${weekProgress * 100}%`,
              backgroundColor:
                appsThisWeek > 5
                  ? "var(--warning, #f59e0b)"
                  : appsThisWeek >= WEEKLY_TARGET
                    ? "var(--success, #22c55e)"
                    : "var(--accent, #3b82f6)",
            }}
          />
        </div>
        {weeklyWarning && (
          <p className="mt-2 text-xs font-medium text-amber-500">{weeklyWarning}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm font-medium text-[var(--muted)]">Applications</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{total}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-[var(--muted)]">Networking sent</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{networkingCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-[var(--muted)]">Interviews</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{interviews}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-[var(--muted)]">Offers</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--success)]">{offers}</p>
        </div>
      </div>

      <div className="space-y-6">
        {PIPELINE_STAGES.map((stage) => {
          const stageApps = applications.filter((a) => a.stage === stage.id);
          const isRejectionStage = stage.id === "rejected" || stage.id === "ghosted";
          return (
            <div key={stage.id} className="card border-dashed p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {stage.label}
                </span>
                <Tag>{stageApps.length}</Tag>
              </div>

              {/* Rejection pattern insight */}
              {isRejectionStage && stage.id === "rejected" && rejectionInsight && (
                <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium text-amber-400">{rejectionInsight}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {stageApps.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--muted)]">No applications</p>
                ) : (
                  stageApps.map((a) => (
                    <div key={a.id} className="space-y-1">
                      <div className="card p-3">
                        {/* Row 1: Title + company + match score */}
                        <div className="flex items-start gap-3">
                          <div className="hidden sm:flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveUpDown(a.id, "up", stage.id)}
                              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveUpDown(a.id, "down", stage.id)}
                              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--foreground)]">{a.jobTitle}</p>
                            <p className="text-xs text-[var(--muted)]">{a.company}</p>
                            <p className="text-xs text-[var(--success)]">Match: {a.matchScore}%</p>
                          </div>
                          {/* Desktop-only inline controls */}
                          <div className="hidden sm:flex items-center gap-2">
                            <select
                              value={a.stage}
                              onChange={(e) => moveCard(a.id, e.target.value as PipelineStageId)}
                              className="input w-36 py-1.5 text-xs"
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={a.reminderDate || ""}
                              onChange={(e) => updateReminder(a.id, e.target.value)}
                              className="input w-36 py-1.5 text-xs"
                            />
                            {isRejectionStage && !a.rejectionTiming && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDiagnosingId(diagnosingId === a.id ? null : a.id)
                                }
                                className="rounded bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/25"
                              >
                                Diagnose
                              </button>
                            )}
                            {removeConfirmId === a.id ? (
                              <span className="flex items-center gap-1">
                                <span className="text-xs text-[var(--muted)]">Remove?</span>
                                <button
                                  type="button"
                                  onClick={() => removeCard(a.id)}
                                  className="rounded bg-rose-500 px-2 py-0.5 text-xs text-white hover:bg-rose-600"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemoveConfirmId(null)}
                                  className="rounded px-2 py-0.5 text-xs text-[var(--muted)] hover:bg-[var(--border)]"
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRemoveConfirmId(a.id)}
                                className="rounded p-1 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-400"
                                aria-label="Remove"
                              >
                                ×
                              </button>
                            )}
                            {a.jobUrl && (
                              <a
                                href={a.jobUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Open
                              </a>
                            )}
                          </div>
                        </div>
                        {/* Mobile-only stacked controls */}
                        <div className="sm:hidden mt-3 space-y-2">
                          <div className="grid grid-cols-1 gap-2">
                            <select
                              value={a.stage}
                              onChange={(e) => moveCard(a.id, e.target.value as PipelineStageId)}
                              className="input w-full py-2 text-xs"
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={a.reminderDate || ""}
                              onChange={(e) => updateReminder(a.id, e.target.value)}
                              className="input w-full py-2 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => moveUpDown(a.id, "up", stage.id)}
                              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveUpDown(a.id, "down", stage.id)}
                              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            {isRejectionStage && !a.rejectionTiming && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDiagnosingId(diagnosingId === a.id ? null : a.id)
                                }
                                className="rounded bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/25"
                              >
                                Diagnose
                              </button>
                            )}
                            {removeConfirmId === a.id ? (
                              <span className="flex items-center gap-1">
                                <span className="text-xs text-[var(--muted)]">Remove?</span>
                                <button
                                  type="button"
                                  onClick={() => removeCard(a.id)}
                                  className="rounded bg-rose-500 px-2 py-0.5 text-xs text-white hover:bg-rose-600"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemoveConfirmId(null)}
                                  className="rounded px-2 py-0.5 text-xs text-[var(--muted)] hover:bg-[var(--border)]"
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRemoveConfirmId(a.id)}
                                className="rounded p-1 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-400"
                                aria-label="Remove"
                              >
                                ×
                              </button>
                            )}
                            {a.jobUrl && (
                              <a
                                href={a.jobUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Open
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rejection diagnosis inline form */}
                      {isRejectionStage && diagnosingId === a.id && !a.rejectionTiming && (
                        <div className="ml-0 sm:ml-10 rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
                          <p className="mb-2 text-xs font-medium text-[var(--foreground)]">
                            When did you hear back?
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {REJECTION_TIMING_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setRejectionTiming(a.id, opt.value)}
                                className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show stored diagnosis result */}
                      {isRejectionStage && a.rejectionTiming && (
                        <div className="ml-0 sm:ml-10 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                          <p className="text-xs text-blue-400">
                            <span className="font-medium">
                              {REJECTION_TIMING_OPTIONS.find(
                                (o) => o.value === a.rejectionTiming
                              )?.label ?? a.rejectionTiming}
                              :
                            </span>{" "}
                            {getTimingDiagnosis(a.rejectionTiming)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {total === 0 && (
        <div className="card border-dashed p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            No applications yet. Add internships from the{" "}
            <Link href="/jobs" className="font-medium text-[var(--foreground)] underline">
              Jobs
            </Link>{" "}
            page.
          </p>
        </div>
      )}
    </div>
    </div>
  );
}
