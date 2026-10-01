"use client";

/**
 * PathFinder — "For Universities" surface. The B2B2C pitch to university
 * career services: PathFinder as the AI readiness-coaching layer a university
 * gives every student, with a staff view of cohort readiness.
 *
 * Integrity note: this is pre-launch. It presents the value proposition
 * deliberately WITHOUT fabricated partner logos, testimonials, or placement
 * statistics. The cohort dashboard shown is labelled illustrative, and the
 * page says outright that pilots are not open yet rather than routing people
 * to a contact address that does not exist.
 */

import Link from "next/link";
import { type CSSProperties } from "react";
import { setTheme, useThemeMode } from "@/lib/theme";
import { BrandMark, Contours, Reveal } from "@/components/pf/ui";
import { PilotForm } from "@/components/pf/pilot-form";

const mono = "var(--font-mono), 'JetBrains Mono', monospace";
const serifItalic: CSSProperties = {
  fontFamily: "var(--font-serif), 'Instrument Serif', serif",
  fontWeight: 400,
  fontStyle: "italic",
  letterSpacing: "-.01em",
  color: "var(--accent)",
};
const kicker: CSSProperties = { fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accent)" };

/**
 * Every CTA here used to be a mailto: to partnerships@pathfinder.app — an
 * address that does not exist, so all five buttons were dead ends. Rather than
 * invent a contact route, the page states plainly that pilots are not open
 * yet. Restore real CTAs once there is an inbox to receive them.
 */
const PILOT_STATUS = "Pilot programme not open yet";

/** Header height, and the padding that reserves room for it.
 *
 *  The bar is FIXED, not sticky. This page's root carries overflow:hidden,
 *  which makes it the nearest scroll container and silently disables
 *  position:sticky on everything inside it — no error, no warning, the bar
 *  simply scrolls away. Measured before the fix: at scrollY 1400 the header's
 *  top was -1400, so the nav, the theme toggle, the "For students" link and
 *  the pilot-status chip were all gone for the entire page below the fold, on
 *  the one surface aimed at people evaluating a purchase.
 *  The landing page hit the same combination and resolved it the same way. */
const HEADER_H = 68;

const PROBLEMS = [
  {
    t: "You can’t coach everyone",
    d: "A handful of advisers, thousands of students, a few weeks each term. Genuine 1:1 readiness coaching simply doesn’t scale to a whole cohort.",
  },
  {
    t: "Students are drowning in the AI-apply flood",
    d: "Auto-apply tools fire off hundreds of generic, AI-written applications. Employers pattern-match them to the bin — and your students blend into the noise.",
  },
  {
    t: "You’re judged on outcomes, not activity",
    d: "Placement and interview rates are what matter. But you can’t see which students are actually ready — or which need a nudge — until it’s too late to help.",
  },
];

const GETS = [
  {
    t: "Coaching at scale",
    d: "Every student gets direction-setting, CV/ATS feedback, referral coaching, and interview prep on demand — the 1:1 experience, without the 1:1 staffing.",
  },
  {
    t: "A cohort readiness view",
    d: "See readiness, interview rate, and skill gaps across the whole cohort. Spot the students slipping behind and reach out before the deadline, not after.",
  },
  {
    t: "Outcomes you can report",
    d: "Track interview and placement rates over the term, by programme — the numbers your leadership and your rankings actually care about.",
  },
  {
    t: "Your brand, your students",
    d: "White-labelled to your institution. Students never pay. The relationship — and the data policy — stays yours.",
  },
];

const STEPS = [
  { n: "01", t: "Scope", d: "A 30-minute call to pick a pilot cohort — one department or one graduating year is plenty." },
  { n: "02", t: "Launch", d: "Students onboard in minutes. Your careers team gets the cohort dashboard the same day." },
  { n: "03", t: "Measure", d: "At the end of the pilot we review the readiness lift and interview-rate change together — the pilot fee credits toward a licence." },
];

const FAQS = [
  {
    q: "Does this replace Handshake or our careers service?",
    a: "No — it complements them. PathFinder is the coaching layer, not a job board or a CRM. Students still apply where they apply; PathFinder makes them ready to.",
  },
  {
    q: "Who owns the student data?",
    a: "You do. Students own their individual profiles; your team sees cohort-level readiness, and the data handling is scoped to your institution’s policy during onboarding.",
  },
  {
    q: "How much does it cost students?",
    a: "Nothing, ever. It’s an institutional licence — priced per student or as a site licence — so cost never sits with the people you’re trying to help.",
  },
];

// Illustrative sample cohort — clearly not real data.
const SAMPLE_PHASES = [
  { label: "Direction set", pct: 82, tone: "var(--strong)" },
  { label: "CV interview-ready", pct: 61, tone: "var(--warn)" },
  { label: "≥1 referral opened", pct: 34, tone: "var(--risk)" },
  { label: "Interview-prep started", pct: 45, tone: "var(--warn)" },
];

/**
 * The illustrative cohort dashboard.
 *
 * Extracted so it can lead the page rather than sit a screen and a half down
 * it. This is the only concrete thing on the surface — the staff view is what
 * a careers director is actually evaluating, and everything above it was
 * claims about that view rather than the view itself. The hero was type on
 * empty ground; now it opens on the product.
 *
 * The 'Illustrative · sample data' badge is load-bearing and stays: CLAUDE.md
 * forbids invented statistics, and moving this into the hero makes the numbers
 * MORE prominent, not less, so the labelling matters more here than it did
 * further down the page.
 */
function CohortPreview() {
  return (
        <div style={{ border: "1px solid var(--line)", borderRadius: 20, background: "var(--panel)", overflow: "hidden", boxShadow: "var(--rim)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "16px 22px", borderBottom: "1px solid var(--line)", background: "var(--panel2)" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>Cohort readiness — CS, Year 2</span>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--warn)", border: "1px solid color-mix(in srgb,var(--warn) 34%,transparent)", background: "color-mix(in srgb,var(--warn) 10%,transparent)", borderRadius: 6, padding: "3px 9px" }}>Illustrative · sample data</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, padding: "24px 22px" }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 14 }}>Where the cohort stands</div>
              {SAMPLE_PHASES.map((s) => (
                <div key={s.label} style={{ marginBottom: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: s.tone }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--panel3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, borderRadius: 3, background: s.tone }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: 13, padding: "16px 18px", background: "var(--panel2)" }}>
                <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, letterSpacing: "-.03em", color: "var(--risk)" }}>66%</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>have opened <b style={{ color: "var(--fg)" }}>zero referrals</b> — the biggest lever, untouched.</div>
              </div>
              <div style={{ border: "1px solid color-mix(in srgb,var(--accent) 26%,transparent)", borderRadius: 13, padding: "16px 18px", background: "var(--accentSoft)" }}>
                <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accentText)", marginBottom: 6 }}>Suggested outreach</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>Nudge the <b>41 students</b> below interview-ready before the autumn deadline.</div>
              </div>
            </div>
          </div>
        </div>
  );
}

export default function UniversitiesPage() {
  // <html data-theme> is kept in sync globally by ThemeController (layout.tsx)
  // plus the no-flash inline script, so this only needs to read the value.
  const mode = useThemeMode();

  const toggleTheme = () => setTheme(mode === "dark" ? "light" : "dark");

  const navLink: CSSProperties = { color: "inherit", textDecoration: "none", padding: "8px 12px", margin: "-8px 0", borderRadius: 9, transition: "color .2s var(--ease), background .2s var(--ease)" };
  const card: CSSProperties = { border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "26px 26px 28px", boxShadow: "var(--rim)", height: "100%" };
  /* Tightened from 64-110px. This audience scans; the page was six and a half
     viewport-heights with most of it empty, so the sections read as further
     apart than they are related. */
  const sectionPad = "clamp(48px,6vw,78px) clamp(20px,5vw,56px)";
  // Display headings in the landing's serif (see .pf-display in pf-theme.css)
  const h2: CSSProperties = { fontFamily: "var(--font-serif), Georgia, serif", fontSize: "clamp(36px,5.2vw,58px)", fontWeight: 400, letterSpacing: "-.01em", lineHeight: 1.02, margin: "14px 0 14px", textWrap: "balance" as CSSProperties["textWrap"] };
  const lead: CSSProperties = { fontSize: 17, color: "var(--muted)", lineHeight: 1.6, maxWidth: "38rem" };

  const primaryBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 9, height: 52, padding: "0 26px", borderRadius: 13, background: "var(--fg)", color: "var(--bg)", fontSize: 15.5, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 10px 26px rgba(56,44,32,.16),var(--rim)" };

  return (
    <div className="pf pf-landing" style={{ position: "relative", width: "100%", background: "var(--bg)", overflow: "hidden", color: "var(--fg)", paddingTop: HEADER_H }}>
      <Contours />
      {/* ── Nav ── */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", height: HEADER_H, padding: "0 clamp(20px,4vw,56px)", borderBottom: "1px solid var(--line)", background: "color-mix(in srgb,var(--bg) 80%,transparent)", backdropFilter: "blur(12px)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "var(--fg)" }}>
          <BrandMark size={24} />
          <span className="pf-hide-mobile" style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", borderRadius: 6, padding: "3px 7px", marginLeft: 4 }}>For universities</span>
        </Link>
        <nav className="pf-hide-mobile" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, color: "var(--muted)" }}>
          <a href="#problem" className="pf-hover-row" style={navLink}>Why</a>
          <a href="#how" className="pf-hover-row" style={navLink}>How it works</a>
          <a href="#pricing" className="pf-hover-row" style={navLink}>Pricing</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, height: 36, padding: "0 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontFamily: mono, fontSize: 11, fontWeight: 500 }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid currentColor" }} />
            {mode === "dark" ? "Paper" : "Night"}
          </button>
          <Link href="/" className="pf-hide-mobile" style={{ ...navLink, fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>For students →</Link>
          <span className="pf-hide-mobile" style={{ display: "flex", alignItems: "center", height: 39, padding: "0 18px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
            {PILOT_STATUS}
          </span>
        </div>
      </header>

      {/* ── Hero ──
          Two columns, and the right-hand one is the product. This was centred
          type on empty ground for the full height of the first screen, which
          on a page whose entire argument is "look at the staff view" meant the
          staff view was a screen and a half away and the first impression was
          a claim. Copy left, the cohort dashboard right: the thing being sold
          is visible before a single scroll.
          Left-aligned rather than centred, because the column is now half the
          width and centred ragged type in a narrow measure reads as a poster,
          not as an argument someone is meant to follow. */}
      <section style={{ padding: "clamp(52px,7vw,88px) clamp(20px,5vw,56px) clamp(36px,5vw,60px)", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(430px,100%),1fr))", gap: "clamp(32px,4vw,56px)", alignItems: "center" }}>
          <div>
            <span style={{ ...kicker, display: "inline-block", marginBottom: 18 }}>For universities &amp; career services</span>
            <h1 className="pf-display" style={{ fontSize: "clamp(44px,5.6vw,72px)", margin: "0 0 22px", maxWidth: "16ch" }}>
              Give every student a coach — not just a <span style={serifItalic}>job board.</span>
            </h1>
            <p style={{ ...lead, margin: "0 0 30px", fontSize: "clamp(16px,1.5vw,18.5px)" }}>
              Your team can’t run 1:1 readiness coaching for thousands of students. PathFinder is the AI layer that does — referrals, interviews, CVs — with a staff view of exactly who’s ready and who needs a nudge.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#how" style={primaryBtn}>See how it works →</a>
            </div>
            <p style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".04em", color: "var(--faint)", marginTop: 24 }}>
              Complements your existing tools · your branding · students never pay
            </p>
          </div>
          <CohortPreview />
        </div>
      </section>

      {/* ── Problem ── */}
      <section id="problem" style={{ padding: sectionPad, maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ maxWidth: "40rem", marginBottom: 44 }}>
          <span style={kicker}>The gap</span>
          <h2 style={h2}>Careers teams are set up to advise. Not to <span style={serifItalic}>coach at scale.</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.t} style={{ animationDelay: `${i * 0.06}s` }}>
              <div style={card}>
                <div style={{ fontFamily: mono, fontSize: 12, color: "var(--faint)", marginBottom: 14 }}>{String(i + 1).padStart(2, "0")}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 9px" }}>{p.t}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── What it is ── */}
      <section style={{ padding: `0 clamp(20px,5vw,56px) clamp(20px,4vw,40px)`, maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ border: "1px solid color-mix(in srgb,var(--accent) 22%,transparent)", borderRadius: 20, background: "var(--accentSoft)", padding: "clamp(26px,4vw,42px)" }}>
          <span style={kicker}>What PathFinder is</span>
          <p style={{ fontSize: "clamp(19px,2.6vw,27px)", lineHeight: 1.4, fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0", maxWidth: "44ch", textWrap: "balance" as CSSProperties["textWrap"] }}>
            An AI readiness coach you hand to every student. It coaches the two things that actually convert — <span style={serifItalic}>referrals</span> and <span style={serifItalic}>interviews</span> — and keeps students genuinely ready, not just busy.
          </p>
        </div>
      </section>

      {/* ── What your team gets ── */}
      <section style={{ padding: sectionPad, maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ maxWidth: "40rem", marginBottom: 44 }}>
          <span style={kicker}>For your team</span>
          <h2 style={h2}>1:1 coaching outcomes, at cohort <span style={serifItalic}>scale.</span></h2>
        </div>
        {/* Two columns, not auto-fit. GETS holds four items and auto-fit
            resolved to three at this width, leaving the fourth alone on a
            row beside two empty cells — a visible hole in the middle of the
            section that read as a missing card. Four items want an even
            grid; the count is the constraint, not the track size. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16, maxWidth: 940, marginInline: "auto" }}>
          {GETS.map((g, i) => (
            <Reveal key={g.t} style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={card}>
                <h3 style={{ fontSize: 17.5, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 9px" }}>{g.t}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{g.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How a pilot works ── */}
      <section id="how" style={{ padding: sectionPad, maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ maxWidth: "40rem", marginBottom: 44 }}>
          <span style={kicker}>How it works</span>
          <h2 style={h2}>A pilot you can run in one <span style={serifItalic}>term.</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} style={{ animationDelay: `${i * 0.06}s` }}>
              <div style={card}>
                <div style={{ fontFamily: "var(--font-serif), 'Instrument Serif', serif", fontSize: 40, lineHeight: 1, color: "var(--accent)", marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{s.t}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Pricing / model ── */}
      <section id="pricing" style={{ padding: `0 clamp(20px,5vw,56px) ${sectionPad.split(" ")[0]}`, maxWidth: 1140, margin: "0 auto" }}>
        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 20, alignItems: "center", border: "1px solid var(--line)", borderRadius: 20, background: "var(--panel)", padding: "clamp(26px,4vw,40px)", boxShadow: "var(--rim)" }}>
            <div>
              <span style={kicker}>Pricing</span>
              <h2 style={{ ...h2, fontSize: "clamp(30px,4vw,46px)", margin: "12px 0 12px" }}>An institutional licence — <span style={serifItalic}>never</span> a student cost.</h2>
              <p style={{ ...lead, fontSize: 15.5 }}>
                Priced per student or as a site licence, so the cost sits with the institution, not the people you’re trying to help. Pilots are scoped per cohort and the pilot fee credits toward the licence.
              </p>
            </div>
            <div style={{ border: "1px solid var(--lineStrong)", borderRadius: 16, background: "var(--panel2)", padding: "24px 24px 26px" }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>Start here</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", margin: "8px 0 4px" }}>Cohort pilot</div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 18px" }}>One department or year group, one term. We measure the readiness lift together.</p>
              <div style={{ height: 46, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11, border: "1px dashed var(--lineStrong)", color: "var(--muted)", fontSize: 13.5, fontWeight: 600 }}>
                {PILOT_STATUS}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: sectionPad, maxWidth: 820, margin: "0 auto" }}>
        <div style={{ marginBottom: 34 }}>
          <span style={kicker}>Questions</span>
          <h2 style={{ ...h2, fontSize: "clamp(30px,4.2vw,48px)" }}>The honest answers.</h2>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {FAQS.map((f) => (
            <div key={f.q} style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", padding: "18px 22px" }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: "0 0 7px" }}>{f.q}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: `${sectionPad.split(" ")[0]} clamp(20px,5vw,56px) clamp(80px,10vw,120px)`, maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 className="pf-display" style={{ fontSize: "clamp(38px,6vw,64px)", margin: "0 0 16px" }}>
          Bring readiness coaching to <span style={serifItalic}>every</span> student.
        </h2>
        <p style={{ ...lead, margin: "0 auto 30px", textAlign: "center" }}>
          PathFinder for universities is still being built. When pilots open we’ll scope a cohort with you and show your careers team the dashboard they’d get.
        </p>
        {/* The form, not a chip. This was a dead <span> reading "Pilot
            programme not open yet" — accurate, and a full stop: the one
            surface aimed at buyers could not capture a buyer. The status is
            still stated plainly, in the header and inside the form, so
            nothing here implies pilots are open. What changed is that saying
            "we want one" is now possible. */}
        <PilotForm />
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--line)", padding: "28px clamp(20px,5vw,56px)", display: "flex", flexWrap: "wrap", gap: "12px 24px", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--muted)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size={20} />
          <span style={{ color: "var(--faint)" }}>· for universities</span>
        </div>
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>For students</Link>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
