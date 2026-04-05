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

const EDUCATION_STORAGE_KEY = "pathfinder-networking-education-dismissed";

const FOLLOW_UP_CADENCE = [
  { step: 1, label: "Thank-You", timing: "24 hours", description: "Send a genuine thank-you referencing something specific from your conversation." },
  { step: 2, label: "Action Proof", timing: "4-10 days", description: "Share evidence you acted on their advice (e.g. applied, built something, read their recommendation)." },
  { step: 3, label: "Value-Add Share", timing: "10-15 days", description: "Forward an article, event, or resource relevant to their interests -- not yours." },
  { step: 4, label: "Long-Term", timing: "15+ days", description: "Periodic check-ins every few months. Share wins, milestones, or ask a thoughtful question." },
];

export default function NetworkingPage() {
  const [outreachType, setOutreachType] = useState<"recruiter" | "hiringManager" | "peer" | "startupFounder">("recruiter");
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
    companyResearchDetail: "",
  });

  // Education card dismissal
  const [educationDismissed, setEducationDismissed] = useState(true); // default true to avoid flash
  useEffect(() => {
    const dismissed = localStorage.getItem(EDUCATION_STORAGE_KEY);
    setEducationDismissed(dismissed === "true");
  }, []);

  function dismissEducation() {
    localStorage.setItem(EDUCATION_STORAGE_KEY, "true");
    setEducationDismissed(true);
  }

  // Contact discovery section
  const [showContactDiscovery, setShowContactDiscovery] = useState(false);

  useEffect(() => {
    const d = getDirection();
    setForm((f) => ({ ...f, roleTitle: d.roleType || "Software Engineering Intern" }));
  }, []);

  const [outreach, setOutreach] = useState<OutreachPack | null>(null);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileSection, setShowProfileSection] = useState(true);

  // Do's & Don'ts visibility
  const [showDosDonts, setShowDosDonts] = useState(false);

  // Follow-up state
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpResult, setFollowUpResult] = useState<{ message?: string; error?: string } | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Referral package state
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralResult, setReferralResult] = useState<{ forwardableMessage?: string; error?: string } | null>(null);

  // Startup outreach state
  const [startupLoading, setStartupLoading] = useState(false);
  const [startupResult, setStartupResult] = useState<{ message?: string; subject?: string; error?: string } | null>(null);
  const [startupError, setStartupError] = useState("");

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

    // If startup mode, validate and use startup endpoint
    if (outreachType === "startupFounder") {
      if (!form.companyResearchDetail.trim()) {
        setStartupError("Company-specific research detail is required for startup outreach. Describe what you know about the company, their product, recent news, or funding.");
        return;
      }
      setStartupError("");
      setStartupLoading(true);
      setStartupResult(null);
      setOutreach(null);
      setShowDosDonts(false);
      try {
        const cv = getCvSummary();
        const res = await fetch("/api/network/startup-outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentProfile: `${form.senderName || "Student"} seeking ${form.roleTitle || "internship"}. Technologies: ${form.technologies || "N/A"}`,
            companyName: form.company,
            companyDetail: form.companyResearchDetail,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setStartupResult({ error: data.error });
        } else {
          setStartupResult(data);
          setNetworkingCount(networkingCount + 1);
          setShowDosDonts(true);
        }
      } finally {
        setStartupLoading(false);
      }
      return;
    }

    // Standard outreach flow
    setOutreachLoading(true);
    setOutreach(null);
    setStartupResult(null);
    setShowDosDonts(false);
    setReferralResult(null);
    setFollowUpResult(null);
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
      setShowDosDonts(true);
    } finally {
      setOutreachLoading(false);
    }
  }

  async function handleGenerateThankYou() {
    setFollowUpLoading(true);
    setFollowUpResult(null);
    try {
      const res = await fetch("/api/network/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: form.recipientName || "Contact",
          chatNotes: followUpNotes || outreach?.message || "Had a great conversation.",
          cadenceStep: 1,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setFollowUpResult({ error: data.error });
      } else {
        setFollowUpResult(data);
      }
    } finally {
      setFollowUpLoading(false);
    }
  }

  async function handleGenerateReferralPackage() {
    setReferralLoading(true);
    setReferralResult(null);
    try {
      const cv = getCvSummary();
      const res = await fetch("/api/network/referral-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfile: `${form.senderName || "Student"} seeking ${form.roleTitle || "internship"}. Technologies: ${form.technologies || "N/A"}`,
          contactName: form.recipientName || "Contact",
          roleName: form.roleTitle || "Intern",
          chatNotes: outreach?.message || "",
          cvStrengths: cv ? [cv.slice(0, 200)] : [],
        }),
      });
      const data = await res.json();
      if (data.error) {
        setReferralResult({ error: data.error });
      } else {
        setReferralResult(data);
      }
    } finally {
      setReferralLoading(false);
    }
  }

  const hasGeneratedOutreach = !!(outreach || startupResult);

  return (
    <div className="page-container overflow-safe">
      <div className="flex flex-col gap-8">
      {/* ===== FEATURE 1: Networking Education Card ===== */}
      {!educationDismissed && (
        <section className="card relative border-[var(--accent)] bg-[var(--accent)]/5 p-6">
          <button
            type="button"
            onClick={dismissEducation}
            className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--foreground)] transition text-lg leading-none"
            aria-label="Dismiss"
          >
            x
          </button>
          <h2 className="text-sm font-semibold text-[var(--accent)]">Why networking matters more than you think</h2>
          <div className="mt-3 space-y-3 text-sm text-[var(--muted)]">
            <p>
              <span className="font-semibold text-[var(--foreground)]">~80% of roles are filled through the hidden job market</span>{" "}
              -- positions that are never publicly posted. They are filled through referrals, internal moves, and direct outreach before a job listing ever appears.
            </p>
            <p>
              <span className="font-semibold text-[var(--foreground)]">The hiring pyramid:</span>{" "}
              For every role, hundreds apply online, dozens get screened, a handful interview, and one gets hired. Networking lets you skip layers of this pyramid by getting your name in front of decision-makers directly.
            </p>
            <p>
              <span className="font-semibold text-[var(--foreground)]">Referrals are 4x more likely to result in a hire</span>{" "}
              compared to cold applications. A warm introduction from someone inside the company moves your application to the top of the pile and often fast-tracks the interview process.
            </p>
            <p className="text-xs text-[var(--accent)]">
              This card appears only on your first visit. You can dismiss it and it will not return.
            </p>
          </div>
        </section>
      )}

      <section>
        <p className="section-label">Phase 4</p>
        <h1 className="section-title">Networking & Outreach</h1>
        <p className="section-subtitle">
          Paste your target&apos;s profile sections (About, Experience, Education, Skills). Choose
          where they&apos;re present. AI analyzes for connection points and generates outreach. Profile
          insights flow into the Outreach Generator.
        </p>
      </section>

      {/* ===== FEATURE 2: Contact Discovery Template ===== */}
      <section className="card border-[var(--border)] p-5">
        <button
          type="button"
          onClick={() => setShowContactDiscovery(!showContactDiscovery)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Contact Discovery Templates
          </h2>
          <span className="text-[var(--accent)]">{showContactDiscovery ? "-" : "+"}</span>
        </button>
        <p className="mt-1 text-sm text-[var(--muted)]">
          LinkedIn search query templates and tools for finding the right people to reach out to.
        </p>

        {showContactDiscovery && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Find Recruiters</p>
              <code className="mt-1 block rounded bg-[var(--background)] p-2 text-xs text-[var(--muted)] overflow-x-auto" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                site:linkedin.com/in &quot;recruiter&quot; OR &quot;talent acquisition&quot; &quot;[COMPANY]&quot; &quot;[CITY/REGION]&quot;
              </code>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Example: <code>site:linkedin.com/in &quot;recruiter&quot; &quot;Google&quot; &quot;San Francisco&quot;</code>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Find Hiring Managers</p>
              <code className="mt-1 block rounded bg-[var(--background)] p-2 text-xs text-[var(--muted)] overflow-x-auto" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                site:linkedin.com/in &quot;engineering manager&quot; OR &quot;team lead&quot; OR &quot;director&quot; &quot;[COMPANY]&quot; &quot;[TEAM/DOMAIN]&quot;
              </code>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Example: <code>site:linkedin.com/in &quot;engineering manager&quot; &quot;Stripe&quot; &quot;payments&quot;</code>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Find Peers / Alumni</p>
              <code className="mt-1 block rounded bg-[var(--background)] p-2 text-xs text-[var(--muted)] overflow-x-auto" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                site:linkedin.com/in &quot;software engineer&quot; OR &quot;SWE intern&quot; &quot;[COMPANY]&quot; &quot;[YOUR UNIVERSITY]&quot;
              </code>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Example: <code>site:linkedin.com/in &quot;software engineer&quot; &quot;Meta&quot; &quot;University of Michigan&quot;</code>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Find Startup Founders / CTOs</p>
              <code className="mt-1 block rounded bg-[var(--background)] p-2 text-xs text-[var(--muted)] overflow-x-auto" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                site:linkedin.com/in &quot;founder&quot; OR &quot;CTO&quot; OR &quot;co-founder&quot; &quot;[COMPANY]&quot; &quot;[INDUSTRY]&quot;
              </code>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Example: <code>site:linkedin.com/in &quot;CTO&quot; &quot;Series A&quot; &quot;fintech&quot;</code>
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-sm font-medium text-[var(--foreground)]">Prospecting Tools</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                <li>
                  <a href="https://www.apollo.io" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">Apollo.io</a>{" "}
                  -- Free tier with email finding, company search, and contact enrichment. Great for finding verified emails.
                </li>
                <li>
                  <a href="https://www.linkedin.com/sales/ssi" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">LinkedIn SSI (Social Selling Index)</a>{" "}
                  -- Check your LinkedIn effectiveness score and identify areas to improve your networking presence.
                </li>
                <li>
                  <span className="font-medium text-[var(--foreground)]">Vibe Prospecting</span>{" "}
                  -- Use ChatGPT or Claude to research a company and generate a list of likely contacts, roles, and email patterns. Prompt: &quot;List 5 people I should reach out to at [COMPANY] for a [ROLE] and explain why.&quot;
                </li>
              </ul>
            </div>
          </div>
        )}
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
                Profile deep dive -- Target&apos;s profile
              </h2>
              <span className="text-[var(--accent)]">{showProfileSection ? "-" : "+"}</span>
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
                      <li key={i}>* {c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileAnalysis.outreachAngles?.length ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">Outreach angles</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {profileAnalysis.outreachAngles.map((a, i) => (
                      <li key={i}>* {a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileAnalysis.conversationStarters?.length ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">Conversation starters</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {profileAnalysis.conversationStarters.map((s, i) => (
                      <li key={i}>* {s}</li>
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
              {/* ===== FEATURE 4: Startup founder added as 4th outreach type ===== */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                {(["recruiter", "hiringManager", "peer", "startupFounder"] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 min-h-[44px] text-sm transition ${
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
                    {t === "startupFounder" && "Startup founder / CTO"}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                placeholder="Shared attributes -- auto-filled from profile analysis when available"
                value={form.sharedAttributes}
                onChange={(e) => setForm((f) => ({ ...f, sharedAttributes: e.target.value }))}
                rows={2}
              />

              {/* ===== FEATURE 4: Startup-specific fields ===== */}
              {outreachType === "startupFounder" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Company-specific research detail <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className={`input h-24 resize-y ${startupError ? "border-red-500" : ""}`}
                    placeholder="What do you know about this startup? Their product, recent funding, tech stack, mission, recent news... This is required and will be used to personalise your outreach."
                    value={form.companyResearchDetail}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, companyResearchDetail: e.target.value }));
                      if (e.target.value.trim()) setStartupError("");
                    }}
                    required
                  />
                  {startupError && (
                    <p className="text-xs text-red-500">{startupError}</p>
                  )}
                  <p className="text-xs text-[var(--muted)]">
                    Required: Generic outreach to startup founders is ineffective. Provide specific details about the company to generate a meaningful message.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={outreachLoading || startupLoading}
                className="bg-transparent border-none p-0 w-full text-left mt-2"
              >
                <MagBtn variant="primary" size="lg" style={{width: '100%', justifyContent: 'center', opacity: (outreachLoading || startupLoading) ? 0.5 : 1 }}>
                  {(outreachLoading || startupLoading) ? "Generating..." : "Generate outreach pack"}
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
          {/* ===== FEATURE 3: AI Do's & Don'ts Reminder ===== */}
          {showDosDonts && (
            <section className="card border-amber-500/40 bg-amber-500/5 p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Before you send -- AI Do&apos;s & Don&apos;ts</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold shrink-0">DO</span>
                  <span className="text-[var(--muted)]">Personalise before sending -- tweak the tone, add your voice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold shrink-0">DO</span>
                  <span className="text-[var(--muted)]">Add one detail only you would know (a shared class, a specific project, a mutual connection)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold shrink-0">DON&apos;T</span>
                  <span className="text-[var(--muted)]">Never send identical messages to multiple people -- they talk to each other</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold shrink-0">DON&apos;T</span>
                  <span className="text-[var(--muted)]">Keep under 150 words -- long messages get ignored</span>
                </li>
              </ul>
            </section>
          )}

          {/* Standard outreach result */}
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
                      <li key={i}>* {q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {outreach.topics?.length ? (
                <div className="mt-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">Conversation topics</p>
                  <ul className="mt-1 space-y-1 text-sm text-[var(--muted)]">
                    {outreach.topics.map((t, i) => (
                      <li key={i}>* {t}</li>
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
          ) : startupResult ? (
            /* ===== FEATURE 4: Startup outreach result ===== */
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Startup Outreach Draft</h2>
              {startupResult.error ? (
                <p className="mt-2 text-sm text-red-500">{startupResult.error}</p>
              ) : (
                <>
                  {startupResult.subject && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      <span className="font-medium text-[var(--foreground)]">Subject:</span> {startupResult.subject}
                    </p>
                  )}
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
                    {startupResult.message || JSON.stringify(startupResult, null, 2)}
                  </pre>
                </>
              )}
            </section>
          ) : (
            <div className="card flex h-48 items-center justify-center border-dashed p-8 text-center text-sm text-[var(--muted)]">
              Generate an outreach pack. Profile insights from above will be used to personalize the
              message.
            </div>
          )}

          {/* ===== FEATURE 5: Follow-Up Guide ===== */}
          {hasGeneratedOutreach && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Follow-Up Cadence</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                The 4-step follow-up system that keeps the relationship warm without being annoying.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-0 sm:overflow-x-auto">
                {FOLLOW_UP_CADENCE.map((step, i) => (
                  <div key={step.step} className="flex flex-col items-center sm:flex-row">
                    <div className="flex flex-col items-center text-center min-w-[120px]">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-[var(--accent)] text-white" : "bg-[var(--accent)]/15 text-[var(--accent)]"
                      }`}>
                        {step.step}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[var(--foreground)]">{step.label}</p>
                      <p className="text-[10px] text-[var(--accent)]">{step.timing}</p>
                      <p className="mt-1 text-[10px] text-[var(--muted)] max-w-[110px]">{step.description}</p>
                    </div>
                    {i < FOLLOW_UP_CADENCE.length - 1 && (
                      <div className="hidden sm:block mx-1 h-px w-6 bg-[var(--border)] shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Chat notes (for a personalised thank-you)
                </label>
                <textarea
                  className="input h-16 resize-y text-sm"
                  placeholder="What did you discuss? Key takeaways, advice given, action items..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleGenerateThankYou}
                  disabled={followUpLoading}
                  className="bg-transparent border-none p-0 w-full text-left"
                >
                  <MagBtn variant="primary" size="lg" style={{ width: "100%", justifyContent: "center", opacity: followUpLoading ? 0.5 : 1 }}>
                    {followUpLoading ? "Generating..." : "Generate thank-you (Step 1)"}
                  </MagBtn>
                </button>
              </div>
              {followUpResult && (
                <div className="mt-3">
                  {followUpResult.error ? (
                    <p className="text-sm text-red-500">{followUpResult.error}</p>
                  ) : (
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--background)] p-3 text-sm text-[var(--muted)]">
                      {followUpResult.message || JSON.stringify(followUpResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ===== FEATURE 6: Referral Package Generator ===== */}
          {hasGeneratedOutreach && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Referral Package</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Generate a concise forwardable message (&lt;100 words) your contact can send to their hiring manager on your behalf.
              </p>
              <button
                type="button"
                onClick={handleGenerateReferralPackage}
                disabled={referralLoading}
                className="bg-transparent border-none p-0 w-full text-left mt-3"
              >
                <MagBtn variant="primary" size="lg" style={{ width: "100%", justifyContent: "center", opacity: referralLoading ? 0.5 : 1 }}>
                  {referralLoading ? "Generating..." : "Generate referral package"}
                </MagBtn>
              </button>
              {referralResult && (
                <div className="mt-3">
                  {referralResult.error ? (
                    <p className="text-sm text-red-500">{referralResult.error}</p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-[var(--foreground)] mb-1">
                        Forwardable message for {form.recipientName || "your contact"}:
                      </p>
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--background)] p-3 text-sm text-[var(--muted)]">
                        {referralResult.forwardableMessage || JSON.stringify(referralResult, null, 2)}
                      </pre>
                      <p className="mt-2 text-[10px] text-[var(--accent)]">
                        Tip: Send this to your contact and ask &quot;Would you be comfortable forwarding something like this?&quot;
                      </p>
                    </>
                  )}
                </div>
              )}
            </section>
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
    </div>
  );
}
