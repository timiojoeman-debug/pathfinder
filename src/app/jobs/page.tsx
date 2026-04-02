"use client";

import { FormEvent, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getCvSummary,
  getInternships,
  addInternship,
  removeInternship,
  type Application,
  type SavedInternship,
} from "@/lib/store";
import { MagBtn } from "@/components/ui/mag-btn";
import { Tag, AnimBar } from "@/components/ui/typography";

type AnalyzeResult = {
  matchScore: number;
  atsKeywords: string[];
  auditChecklist: string[];
};

export default function JobsPage() {
  const [form, setForm] = useState({
    jobTitle: "",
    company: "",
    jobDescription: "",
    jobUrl: "",
    userLinkedInUrl: "",
    userLinkedIn: "",
  });
  const [internships, setInternshipsList] = useState<SavedInternship[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addedToTracker, setAddedToTracker] = useState(false);

  const cvSummary = getCvSummary();

  const loadInternships = useCallback(() => {
    setInternshipsList(getInternships());
  }, []);

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  function handleSaveToList(e: FormEvent) {
    e.preventDefault();
    if (!form.jobDescription.trim()) return;
    addInternship({
      jobTitle: form.jobTitle || "Untitled Role",
      company: form.company || "Unknown Company",
      jobDescription: form.jobDescription,
      jobUrl: form.jobUrl || undefined,
    });
    loadInternships();
    setForm({ jobTitle: "", company: "", jobDescription: "", jobUrl: "", userLinkedInUrl: form.userLinkedInUrl, userLinkedIn: form.userLinkedIn });
  }

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    if (!form.jobDescription.trim()) return;
    setLoading(true);
    setAnalysis(null);
    setAnalyzingId(null);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: form.jobTitle,
          company: form.company,
          jobDescription: form.jobDescription,
          cvSummary,
          userLinkedInUrl: form.userLinkedInUrl || undefined,
          userLinkedIn: form.userLinkedIn || undefined,
        }),
      });
      const data = (await res.json()) as AnalyzeResult;
      setAnalysis(data);
      setAddedToTracker(false);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeFromList(internship: SavedInternship) {
    setAnalyzingId(internship.id);
    setAnalysis(null);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: internship.jobTitle,
          company: internship.company,
          jobDescription: internship.jobDescription,
          cvSummary,
          userLinkedInUrl: form.userLinkedInUrl || undefined,
          userLinkedIn: form.userLinkedIn || undefined,
        }),
      });
      const data = (await res.json()) as AnalyzeResult;
      setAnalysis(data);
      setForm({
        jobTitle: internship.jobTitle,
        company: internship.company,
        jobDescription: internship.jobDescription,
        jobUrl: internship.jobUrl || "",
        userLinkedInUrl: form.userLinkedInUrl,
        userLinkedIn: form.userLinkedIn,
      });
      setAddedToTracker(false);
    } finally {
      setAnalyzingId(null);
    }
  }

  function addToTracker() {
    if (!analysis) return;
    const apps: Application[] = JSON.parse(
      localStorage.getItem("pathfinder-applications") || "[]"
    );
    const id = crypto.randomUUID();
    apps.push({
      id,
      jobTitle: form.jobTitle || "Untitled Role",
      company: form.company || "Unknown Company",
      source: "Manual",
      matchScore: analysis.matchScore,
      stage: "researching",
      jobUrl: form.jobUrl || undefined,
      jobDescription: form.jobDescription || undefined,
      atsKeywords: analysis.atsKeywords,
    });
    localStorage.setItem("pathfinder-applications", JSON.stringify(apps));
    setAddedToTracker(true);
  }

  function handleRemove(id: string) {
    removeInternship(id);
    loadInternships();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="section-label">Phase 3</p>
        <h1 className="section-title">Internships & Job Descriptions</h1>
        <p className="section-subtitle">
          Manually add internships and paste job descriptions to keep track. Get ATS
          keywords, compatibility scores, and a pre-submission audit when you analyze.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Add internship & paste job description
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Save to your list or analyze immediately.
            </p>

            <form className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Job title</label>
                  <input
                    className="input"
                    placeholder="e.g. Software Engineering Intern"
                    value={form.jobTitle}
                    onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Company</label>
                  <input
                    className="input"
                    placeholder="e.g. NovaTech Labs"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Job URL (optional)</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={form.jobUrl}
                  onChange={(e) => setForm((f) => ({ ...f, jobUrl: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Your LinkedIn profile URL (optional)</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={form.userLinkedInUrl}
                  onChange={(e) => setForm((f) => ({ ...f, userLinkedInUrl: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Or paste your profile content (optional)</label>
                <textarea
                  className="input h-24 resize-y"
                  placeholder="Paste your About, Experience, Education, Skills to compare against the job description..."
                  value={form.userLinkedIn}
                  onChange={(e) => setForm((f) => ({ ...f, userLinkedIn: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Job description (paste full text)</label>
                <textarea
                  className="input h-40 resize-y"
                  placeholder="Paste the full job description here..."
                  value={form.jobDescription}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jobDescription: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                <button type="button" onClick={handleSaveToList} disabled={!form.jobDescription.trim()} className="bg-transparent border-0 p-0">
                  <MagBtn variant="secondary" size="md" style={!form.jobDescription.trim() ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                    Save to my list
                  </MagBtn>
                </button>
                <button type="submit" onClick={handleAnalyze} disabled={loading || !form.jobDescription.trim()} className="bg-transparent border-0 p-0">
                  <MagBtn variant="primary" size="md" style={(loading || !form.jobDescription.trim()) ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                    {loading ? "Analyzing..." : "Analyze & get ATS keywords"}
                  </MagBtn>
                </button>
              </div>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Saved internships
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Your manual list of roles with job descriptions. Click Analyze to get insights.
            </p>
            {internships.length === 0 ? (
              <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
                No internships saved yet. Add one above.
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {internships.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--foreground)]">{i.jobTitle}</p>
                        <p className="text-sm text-[var(--muted)]">{i.company}</p>
                      </div>
                      <div className="flex shrink-0 gap-2 items-center">
                        <button type="button" onClick={() => analyzeFromList(i)} disabled={!!analyzingId} className="bg-transparent border-0 p-0">
                           <MagBtn variant="primary" size="sm" style={!!analyzingId ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                             {analyzingId === i.id ? "Analyzing..." : "Analyze"}
                           </MagBtn>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(i.id)}
                          className="rounded p-1.5 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-400"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expandedId === i.id ? null : i.id)
                      }
                      className="mt-2 text-xs text-[var(--accent)] hover:underline"
                    >
                      {expandedId === i.id ? "Hide" : "View"} job description
                    </button>
                    {expandedId === i.id && (
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-[var(--card)] p-3 text-xs text-[var(--muted)]">
                        {i.jobDescription}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="space-y-4">
          {analysis ? (
            <>
              <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Compatibility score
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Based on your CV vs job requirements
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 min-w-[120px]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[var(--c-900)]">
                      {analysis.matchScore}
                    </span>
                    <span className="text-sm text-[var(--muted)]">/100</span>
                  </div>
                  <div className="w-full mt-1">
                     <AnimBar width={analysis.matchScore} delay={100} />
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">ATS priority keywords</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Include these naturally in your CV and cover letter.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.atsKeywords.map((k) => (
                    <Tag key={k}>{k}</Tag>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">ATS pre-submission audit</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  {analysis.auditChecklist?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 text-[var(--success)]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button type="button" onClick={addToTracker} disabled={addedToTracker} className="bg-transparent border-0 p-0">
                  <MagBtn variant="primary" size="md" style={addedToTracker ? {opacity: 0.5, pointerEvents: 'none'} : {}}>
                     {addedToTracker ? "Added to tracker ✓" : "Add to tracker"}
                  </MagBtn>
                </button>
                <Link href="/tracker" style={{textDecoration: 'none'}}>
                  <MagBtn variant="secondary" size="md">
                    View tracker →
                  </MagBtn>
                </Link>
              </div>
            </>
          ) : (
            <div className="card flex h-64 items-center justify-center border-dashed p-8 text-center text-sm text-[var(--muted)]">
              Paste a job description and click Analyze (or Analyze on a saved internship) to see
              compatibility score, ATS keywords, and audit checklist.
            </div>
          )}
        </section>
      </div>

      {!cvSummary && (
        <div className="card border-[var(--accent-muted)]/50 bg-[var(--accent)]/5 p-4 text-sm text-[var(--muted)]">
          Tip: Upload your CV in the{" "}
          <Link href="/cv" className="text-[var(--accent)] hover:underline">
            CV Optimizer
          </Link>{" "}
          for more accurate compatibility scores.
        </div>
      )}
    </div>
  );
}
