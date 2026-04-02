"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import {
  getNetworkingCount,
  setNetworkingCount,
  getCvSummary,
  getDirection,
} from "@/lib/store";
import { MagBtn } from "@/components/ui/mag-btn";

const JOB_SITES = ["LinkedIn", "Glassdoor", "Indeed", "Handshake", "Company Career Page", "Other"] as const;

type OutreachPack = {
  message: string;
  questions: string[];
  topics: string[];
  followUp: string;
};

type ProfileAnalysis = {
  summary: string;
  connectionPoints: string[];
  outreachAngles: string[];
  conversationStarters: string[];
};

export default function NetworkingPage() {
  const [outreachType, setOutreachType] = useState<"recruiter" | "hiringManager" | "peer">("recruiter");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [form, setForm] = useState({
    recipientName: "",
    senderName: "",
    roleTitle: "",
    company: "",
    technologies: "",
    sharedAttributes: "",
    about: "",
    experience: "",
    education: "",
    skills: "",
    recentPosts: "",
  });

  useEffect(() => {
    const d = getDirection();
    setForm((f) => ({ ...f, roleTitle: d.roleType || "Software Engineering Intern" }));
  }, []);

  const [outreach, setOutreach] = useState<OutreachPack | null>(null);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileSection, setShowProfileSection] = useState(true);

  const networkingCount = getNetworkingCount();

  function toggleSite(site: string) {
    setSelectedSites((s) =>
      s.includes(site) ? s.filter((x) => x !== site) : [...s, site]
    );
  }

  function hasProfileContent() {
    return (
      form.about.trim() ||
      form.experience.trim() ||
      form.education.trim() ||
      form.skills.trim() ||
      form.recentPosts.trim()
    );
  }

  async function handleProfileAnalyze(e: FormEvent) {
    e.preventDefault();
    if (!hasProfileContent()) return;
    setProfileLoading(true);
    setProfileAnalysis(null);
    try {
      const res = await fetch("/api/networking/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobSites: selectedSites,
          about: form.about,
          experience: form.experience,
          education: form.education,
          skills: form.skills,
          recentPosts: form.recentPosts,
          recipientName: form.recipientName,
          roleTitle: form.roleTitle,
          company: form.company,
        }),
      });
      const data = (await res.json()) as ProfileAnalysis;
      setProfileAnalysis(data);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleOutreachGenerate(e: FormEvent) {
    e.preventDefault();
    setOutreachLoading(true);
    setOutreach(null);
    try {
      const res = await fetch("/api/networking/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: outreachType,
          recipientName: form.recipientName,
          senderName: form.senderName,
          roleTitle: form.roleTitle,
          company: form.company,
          technologies: form.technologies,
          sharedAttributes:
            form.sharedAttributes ||
            (profileAnalysis?.connectionPoints ?? []).join(", ") ||
            "N/A",
          profileInsights: profileAnalysis
            ? {
                summary: profileAnalysis.summary,
                connectionPoints: profileAnalysis.connectionPoints,
                outreachAngles: profileAnalysis.outreachAngles,
              }
            : undefined,
        }),
      });
      const data = (await res.json()) as OutreachPack;
      setOutreach(data);
      setNetworkingCount(networkingCount + 1);
    } finally {
      setOutreachLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="section-label">Phase 4</p>
        <h1 className="section-title">Networking & Outreach</h1>
        <p className="section-subtitle">
          Paste your target&apos;s profile sections (About, Experience, Education, Skills). Choose
          where they&apos;re present. AI analyzes for connection points and generates outreach. Profile
          insights flow into the Outreach Generator.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <section className="card border-[var(--accent-muted)]/30 bg-[var(--accent)]/5 p-6">
            <button
              type="button"
              onClick={() => setShowProfileSection(!showProfileSection)}
              className="flex w-full items-center justify-between text-left"
            >
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Profile deep dive — Target&apos;s profile
              </h2>
              <span className="text-[var(--accent)]">{showProfileSection ? "−" : "+"}</span>
            </button>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Choose which job sites the target is on. Paste their About, Experience, Education,
              Skills, and recent posts for AI analysis.
            </p>

            {showProfileSection && (
              <form onSubmit={handleProfileAnalyze} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Where is the target present? (choose sites to analyze)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {JOB_SITES.map((site) => (
                      <button
                        key={site}
                        type="button"
                        onClick={() => toggleSite(site)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                          selectedSites.includes(site)
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                            : "border-[var(--border)] hover:border-[var(--accent-muted)]"
                        }`}
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">About</label>
                  <textarea
                    className="input h-20 resize-y"
                    placeholder="Paste target's About / summary..."
                    value={form.about}
                    onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Experience</label>
                  <textarea
                    className="input h-24 resize-y"
                    placeholder="Paste Experience section..."
                    value={form.experience}
                    onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Education</label>
                  <textarea
                    className="input h-20 resize-y"
                    placeholder="Paste Education section..."
                    value={form.education}
                    onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Skills</label>
                  <textarea
                    className="input h-16 resize-y"
                    placeholder="Paste Skills / endorsements..."
                    value={form.skills}
                    onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Recent posts (optional)
                  </label>
                  <textarea
                    className="input h-20 resize-y"
                    placeholder="Any recent posts, articles, or activity..."
                    value={form.recentPosts}
                    onChange={(e) => setForm((f) => ({ ...f, recentPosts: e.target.value }))}
                  />
                </div>
                <button type="submit" disabled={profileLoading || !hasProfileContent()} className="bg-transparent border-none p-0 w-full text-left">
                  <MagBtn variant="primary" size="lg" style={{width: '100%', justifyContent: 'center', opacity: (profileLoading || !hasProfileContent()) ? 0.5 : 1 }}>
                    {profileLoading ? "Analyzing..." : "Analyze profile & page"}
                  </MagBtn>
                </button>
              </form>
            )}
          </section>

          {profileAnalysis && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Profile insights</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{profileAnalysis.summary}</p>
              {profileAnalysis.connectionPoints?.length ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">Connection points</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {profileAnalysis.connectionPoints.map((c, i) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileAnalysis.outreachAngles?.length ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">Outreach angles</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {profileAnalysis.outreachAngles.map((a, i) => (
                      <li key={i}>• {a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileAnalysis.conversationStarters?.length ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">Conversation starters</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {profileAnalysis.conversationStarters.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-[var(--accent)]">
                These insights are used when you generate outreach below.
              </p>
            </section>
          )}

          <section className="card p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Outreach generator</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Uses profile insights above when available. Choose recipient type and fill in details.
            </p>

            <form onSubmit={handleOutreachGenerate} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                {(["recruiter", "hiringManager", "peer"] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      outreachType === t
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      checked={outreachType === t}
                      onChange={() => setOutreachType(t)}
                      className="sr-only"
                    />
                    {t === "recruiter" && "Recruiter"}
                    {t === "hiringManager" && "Hiring manager"}
                    {t === "peer" && "Peer / alum"}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Recipient name"
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Your name"
                  value={form.senderName}
                  onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Target role"
                  value={form.roleTitle}
                  onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Company"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <input
                className="input"
                placeholder="Relevant technologies"
                value={form.technologies}
                onChange={(e) => setForm((f) => ({ ...f, technologies: e.target.value }))}
              />
              <textarea
                className="input"
                placeholder="Shared attributes — auto-filled from profile analysis when available"
                value={form.sharedAttributes}
                onChange={(e) => setForm((f) => ({ ...f, sharedAttributes: e.target.value }))}
                rows={2}
              />
              <button type="submit" disabled={outreachLoading} className="bg-transparent border-none p-0 w-full text-left mt-2">
                <MagBtn variant="primary" size="lg" style={{width: '100%', justifyContent: 'center', opacity: outreachLoading ? 0.5 : 1 }}>
                  {outreachLoading ? "Generating..." : "Generate outreach pack"}
                </MagBtn>
              </button>
            </form>

            <p className="mt-3 text-sm text-[var(--muted)]">
              Messages sent this session:{" "}
              <span className="font-semibold text-[var(--foreground)]">{networkingCount}</span>
            </p>
          </section>
        </div>

        <div className="space-y-4">
          {outreach ? (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Outreach draft</h2>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
                {outreach.message}
              </pre>
              {outreach.questions?.length ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">Coffee chat questions</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {outreach.questions.map((q, i) => (
                      <li key={i}>• {q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {outreach.topics?.length ? (
                <div className="mt-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">Conversation topics</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {outreach.topics.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {outreach.followUp ? (
                <div className="mt-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">Follow-up template</p>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-[var(--background)] p-2 text-sm text-[var(--muted)]">
                    {outreach.followUp}
                  </pre>
                </div>
              ) : null}
            </section>
          ) : (
            <div className="card flex h-48 items-center justify-center border-dashed p-8 text-center text-sm text-[var(--muted)]">
              Generate an outreach pack. Profile insights from above will be used to personalize the
              message.
            </div>
          )}

          <aside className="card border-dashed p-4 text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">Profile deep dive tips</p>
            <p className="mt-1">
              Paste content from LinkedIn, Glassdoor, Indeed, or company pages. The more sections you
              fill, the better the AI analysis. Profile insights automatically enrich the Outreach
              Generator.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
