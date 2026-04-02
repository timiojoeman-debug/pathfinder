"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function TrackerPage() {
  const [applications, setApps] = useState<Application[]>([]);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const loadApplications = useCallback(() => {
    setApps(getApplications());
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  function moveCard(cardId: string, targetStage: PipelineStageId) {
    const updated = applications.map((a) =>
      a.id === cardId ? { ...a, stage: targetStage } : a
    );
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

  const total = applications.length;
  const interviews = applications.filter((a) => a.stage === "interviewing").length;
  const offers = applications.filter((a) => a.stage === "offer").length;
  const networkingCount = getNetworkingCount();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="section-label">Phase 6</p>
        <h1 className="section-title">Application Pipeline & Consistency</h1>
        <p className="section-subtitle">
          Stages are rows. Drag applications up and down within a stage to reorder. Use the stage
          dropdown to move between stages. &quot;Are you sure?&quot; when removing.
        </p>
      </section>

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
          return (
            <div key={stage.id} className="card border-dashed p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {stage.label}
                </span>
                <Tag>{stageApps.length}</Tag>
              </div>
              <div className="flex flex-col gap-2">
                {stageApps.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--muted)]">No applications</p>
                ) : (
                  stageApps.map((a) => (
                    <div
                      key={a.id}
                      className="card flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
                    >
                      <div className="flex shrink-0 items-center gap-0.5">
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
  );
}
