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

type AtsKeywordDetail = {
  keyword: string;
  foundInCV: boolean;
  suggestedPlacement: string;
};

type AnalyzeResult = {
  matchScore: number;
  atsKeywords: string[];
  atsKeywordsDetail?: AtsKeywordDetail[];
  auditChecklist: string[];
};

type CoverLetterResult = {
  data: {
    coverLetter: string;
    assumptions: string[];
    wordCount: number;
    editReminder?: string;
  };
  nextSteps: string[];
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

  // Cover letter state
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterCopied, setCoverLetterCopied] = useState(false);

  // Visa sponsorship card state
  const [visaDismissed, setVisaDismissed] = useState(false);

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
    setCoverLetter(null);
    setVisaDismissed(false);
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
    setCoverLetter(null);
    setVisaDismissed(false);
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

  async function handleGenerateCoverLetter() {
    if (!form.jobDescription.trim() || !form.company.trim()) return;
    setCoverLetterLoading(true);
    setCoverLetter(null);
    setCoverLetterCopied(false);
    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvData: cvSummary || "",
          jobDescription: form.jobDescription,
          companyName: form.company,
          directionStatement: "",
        }),
      });
      if (!res.ok) throw new Error("Failed to generate cover letter");
      const data = (await res.json()) as CoverLetterResult;
      setCoverLetter(data);
    } catch {
      setCoverLetter(null);
    } finally {
      setCoverLetterLoading(false);
    }
  }

  async function handleCopyCoverLetter() {
    if (!coverLetter?.data?.coverLetter) return;
    try {
      await navigator.clipboard.writeText(coverLetter.data.coverLetter);
      setCoverLetterCopied(true);
      setTimeout(() => setCoverLetterCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  return (
    <div className="page-container overflow-safe">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              {/* Visa Sponsorship Check Card */}
              {!visaDismissed && (
                <div className="card relative flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4">
                  <span className="mt-0.5 text-lg leading-none">&#9888;</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      International student?
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Check if this company sponsors visas before applying.
                    </p>
                    <a
                      href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline"
                    >
                      Check UK licensed sponsor register &rarr;
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisaDismissed(true)}
                    className="shrink-0 rounded p-1 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                    aria-label="Dismiss visa check reminder"
                  >
                    &#10005;
                  </button>
                </div>
              )}

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

              {/* ATS Keyword Visualization Grid */}
              <div className="card p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">ATS keyword analysis</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  How your CV matches against required keywords from the job description.
                </p>
                {analysis.atsKeywordsDetail && analysis.atsKeywordsDetail.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                            Keyword
                          </th>
                          <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                            Found in CV
                          </th>
                          <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                            Section
                          </th>
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                            Action needed
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.atsKeywordsDetail.map((kw) => (
                          <tr key={kw.keyword} className="border-b border-[var(--border)]/50">
                            <td className="py-2.5 pr-4">
                              <Tag>{kw.keyword}</Tag>
                            </td>
                            <td className="py-2.5 pr-4">
                              {kw.foundInCV ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                                  <span>&#10003;</span> Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                                  <span>&#10007;</span> Missing
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-[var(--muted)]">
                              {kw.foundInCV ? kw.suggestedPlacement : "---"}
                            </td>
                            <td className="py-2.5 text-xs text-[var(--muted)]">
                              {kw.foundInCV ? (
                                <span className="text-emerald-500">No action needed</span>
                              ) : (
                                <span>
                                  Add to <span className="font-medium text-[var(--foreground)]">{kw.suggestedPlacement}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
                      <span>
                        <span className="font-medium text-emerald-500">
                          {analysis.atsKeywordsDetail.filter((k) => k.foundInCV).length}
                        </span>{" "}
                        / {analysis.atsKeywordsDetail.length} keywords matched
                      </span>
                      <span className="h-3 w-px bg-[var(--border)]" />
                      <span>
                        {analysis.atsKeywordsDetail.filter((k) => !k.foundInCV).length > 0
                          ? `${analysis.atsKeywordsDetail.filter((k) => !k.foundInCV).length} keywords to add`
                          : "All keywords covered"}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Fallback to simple tags if detail not available */
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.atsKeywords.map((k) => (
                      <Tag key={k}>{k}</Tag>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">ATS pre-submission audit</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  {analysis.auditChecklist?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 text-[var(--success)]">&#10003;</span>
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
                    View tracker &rarr;
                  </MagBtn>
                </Link>
              </div>

              {/* Cover Letter Generator */}
              <div className="card p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">Cover letter generator</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Generate a tailored cover letter based on your CV and this job description.
                </p>

                {!coverLetter && !coverLetterLoading && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleGenerateCoverLetter}
                      disabled={!form.company.trim() || !form.jobDescription.trim()}
                      className="bg-transparent border-0 p-0"
                    >
                      <MagBtn
                        variant="primary"
                        size="md"
                        style={
                          !form.company.trim() || !form.jobDescription.trim()
                            ? { opacity: 0.5, pointerEvents: "none" }
                            : {}
                        }
                      >
                        Generate cover letter
                      </MagBtn>
                    </button>
                    {!form.company.trim() && (
                      <p className="mt-2 text-xs text-rose-400">
                        Enter a company name above to generate a cover letter.
                      </p>
                    )}
                  </div>
                )}

                {coverLetterLoading && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                    Generating your cover letter...
                  </div>
                )}

                {coverLetter?.data?.coverLetter && (
                  <div className="mt-4 space-y-3">
                    <div className="relative rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                      <button
                        type="button"
                        onClick={handleCopyCoverLetter}
                        className="absolute right-3 top-3 rounded px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 border border-[var(--border)]"
                      >
                        {coverLetterCopied ? "Copied!" : "Copy"}
                      </button>
                      <pre className="whitespace-pre-wrap text-sm text-[var(--foreground)] leading-relaxed pr-16" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                        {coverLetter.data.coverLetter}
                      </pre>
                    </div>

                    {coverLetter.data.assumptions && coverLetter.data.assumptions.length > 0 && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <p className="text-xs font-semibold text-[var(--foreground)]">
                          Assumptions made (review these)
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {coverLetter.data.assumptions.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--muted)]">
                              <span className="mt-0.5 text-amber-500">&#8226;</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
                      <p className="text-xs text-[var(--muted)]">
                        <span className="font-semibold text-[var(--foreground)]">Reminder:</span>{" "}
                        {coverLetter.data.editReminder ||
                          "Review and personalise this before sending. AI drafts the structure \u2014 you add the authenticity."}
                      </p>
                    </div>

                    {coverLetter.data.wordCount && (
                      <p className="text-xs text-[var(--muted)]">
                        Word count: {coverLetter.data.wordCount}
                      </p>
                    )}
                  </div>
                )}
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
    </div>
  );
}
