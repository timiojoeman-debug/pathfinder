"use client";

import { FormEvent, useState, useCallback } from "react";
import { setCvSummary } from "@/lib/store";
import { MagBtn } from "@/components/ui/mag-btn";
import { Tag, AnimBar } from "@/components/ui/typography";

type CvAnalysis = {
  fileName: string;
  rawPreview: string;
  education: unknown[];
  experience: unknown[];
  projects: unknown[];
  skills: string[];
  suggestions: {
    bulletPoints: string[];
    keywords: string[];
    formatting: string[];
    extraQualifications: string[];
  };
};

type ProjectIdea = {
  title: string;
  description: string;
  techStack: string[];
  keyFeatures: string[];
  talkingPoints: string[];
};

export default function CvPage() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [projects, setProjects] = useState<ProjectIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (["pdf", "doc", "docx", "txt"].includes(ext || "")) {
      setCvFile(file);
      setCvText("");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      handleFile(file ?? null);
    },
    [handleFile]
  );

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    if (!cvFile && !cvText.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      if (cvFile) {
        formData.append("file", cvFile);
      } else {
        const blob = new Blob([cvText], { type: "text/plain" });
        formData.append("file", new File([blob], "cv.txt"));
      }
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as CvAnalysis;
      setAnalysis(data);
      const parts: string[] = [];
      if (data.education?.length) parts.push("Education: " + JSON.stringify(data.education));
      if (data.experience?.length) parts.push("Experience: " + JSON.stringify(data.experience));
      if (data.projects?.length) parts.push("Projects: " + JSON.stringify(data.projects));
      if (data.skills?.length) parts.push("Skills: " + data.skills.join(", "));
      setCvSummary(parts.join("\n"));
    } finally {
      setLoading(false);
    }
  }

  async function handleProjects() {
    if (!analysis) return;
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/cv/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: analysis.skills,
          targetRole: "software engineering internship",
          gaps: analysis.suggestions?.keywords ?? [],
        }),
      });
      const data = await res.json();
      setProjects(data.projects ?? []);
    } finally {
      setProjectsLoading(false);
    }
  }

  const atsScore = analysis?.suggestions?.keywords?.length
    ? 100 - Math.min(60, analysis.suggestions.keywords.length * 5)
    : 72;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="section-label">Phase 2</p>
        <h1 className="section-title">CV Optimizer</h1>
        <p className="section-subtitle">
          Upload your CV or paste the text. PathFinder will highlight missing keywords, suggest
          stronger bullets, and design projects that close your gaps.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
        <section className="card flex flex-col gap-4 p-6">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Upload your CV</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Drag and drop or click to upload PDF / DOCX. You can also paste content below.
            </p>
          </div>

          <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
            <label
              htmlFor="cv-file"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition ${
                isDragging
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--ring)] hover:bg-[var(--border)]/20"
              }`}
            >
              <span className="text-2xl">⬆️</span>
              <span className="font-medium text-[var(--foreground)]">
                {cvFile ? cvFile.name : "Drop file here or click to upload (PDF, DOCX, TXT)"}
              </span>
              <span className="text-sm text-[var(--muted)]">
                or paste your CV text below
              </span>
              <input
                id="cv-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="sr-only"
                onChange={onInputChange}
              />
            </label>

            <textarea
              className="input h-40 resize-y"
              placeholder="Or paste your CV here..."
              value={cvText}
              onChange={(e) => {
                setCvText(e.target.value);
                if (e.target.value) setCvFile(null);
              }}
            />

            <button type="submit" disabled={loading || (!cvFile && !cvText.trim())} className="bg-transparent border-none p-0 w-full text-left">
              <MagBtn variant="primary" size="lg" style={{width: '100%', justifyContent: 'center', opacity: (loading || (!cvFile && !cvText.trim())) ? 0.5 : 1 }}>
                {loading ? "Analyzing..." : "Analyze CV"}
              </MagBtn>
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {analysis ? (
            <>
              <div className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    ATS match score
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                    This estimate looks at skills, structure, and clarity. Strengthen bullets with
                    impact, add missing keywords, and keep formatting clean for scanners.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 min-w-[120px]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-[var(--c-900)]">{atsScore}</span>
                    <span className="text-sm text-[var(--muted)]">/100</span>
                  </div>
                  <div className="w-full mt-1">
                    <AnimBar width={atsScore} delay={100} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card space-y-2 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Missing keywords</p>
                  <p className="text-sm text-[var(--muted)]">
                    These topics often appear in strong internship CVs. Projects below will use these to close gaps.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(analysis.suggestions?.keywords ?? []).map((k) => (
                      <Tag key={k} className="bg-[var(--c-50)]">
                        {k}
                      </Tag>
                    ))}
                  </div>
                  <div className="mt-4">
                    <MagBtn variant="secondary" size="md" onClick={handleProjects} style={projectsLoading ? {opacity: 0.6} : {}}>
                      {projectsLoading ? "Generating..." : "Generate project ideas"}
                    </MagBtn>
                  </div>
                </div>

                <div className="card space-y-2 p-4">
                  <p className="text-sm font-semibold text-[var(--accent)]">Formatting tips</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
                    {(analysis.suggestions?.formatting ?? []).map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card space-y-3 p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">Bullet point improvements</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(analysis.suggestions?.bulletPoints ?? []).map((b, i) => (
                    <div key={i} className="rounded-lg bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              {projects.length > 0 && (
                <div className="card space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--foreground)]">AI Project Builder</p>
                    <Tag>{projects.length} ideas</Tag>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Inspired by{" "}
                    <a href="https://tripleten.com/tools/coding-project-ideas/" target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">TripleTen</a>
                    {" "}&{" "}
                    <a href="https://www.casperberthelsen.com/" target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">Project Idea Generator</a>
                  </p>
                  <div className="space-y-4">
                    {projects.map((p) => (
                      <div key={p.title} className="rounded-lg border border-[var(--border)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">{p.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            {p.techStack?.map((t) => (
                              <Tag key={t}>{t}</Tag>
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted)]">{p.description}</p>
                        {p.keyFeatures?.length ? (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-[var(--foreground)]">Key features</p>
                            <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                              {p.keyFeatures.map((f) => (
                                <li key={f}>• {f}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {p.talkingPoints?.length ? (
                          <div className="mt-3 rounded-lg bg-[var(--background)] p-3">
                            <p className="text-xs font-semibold text-[var(--foreground)]">Interview talking points</p>
                            <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                              {p.talkingPoints.map((tp) => (
                                <li key={tp}>• {tp}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card flex h-64 items-center justify-center border-dashed p-8 text-center text-sm text-[var(--muted)]">
              Once you upload your CV, you&apos;ll see ATS feedback, keyword gaps, and project
              suggestions here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
