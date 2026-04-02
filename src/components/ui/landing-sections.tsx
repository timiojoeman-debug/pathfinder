"use client";

import { useParallax, useCountUp, useReveal } from "./hooks";
import { GlowCard } from "./glow-card";
import { Heading, Mono, Section } from "./typography";
import { I } from "./icons";
import { MagBtn } from "./mag-btn";

/* ═══════════════════════════════════════════════════════════════
   PROBLEM
   ═══════════════════════════════════════════════════════════════ */
export function Problem() {
  const [pRef, pOff] = useParallax(-0.03);
  const problems = [
    { num: "01", title: "Spray and pray", desc: "Hundreds of untargeted applications. No strategy, no tailoring, no signal." },
    { num: "02", title: "2% response rate", desc: "Fewer than 1 in 50 hear back. The process is broken, not you." },
    { num: "03", title: "No feedback loop", desc: "No system to tell you what's wrong, what to fix, or what to do next." },
  ];

  return (
    <Section>
      <div
        ref={(el) => {
          // @ts-ignore
          if (pRef) pRef.current = el;
        }}
        style={{ transform: `translateY(${pOff}px)` }}
      >
        <Heading sub="You're not a bad candidate. You just don't have infrastructure.">The current process doesn't work</Heading>
      </div>
      <div className="problem-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {problems.map((p, i) => (
          <GlowCard key={i} delay={i * 100}>
            <Mono className="block mb-5 text-[28px] font-light text-[var(--c-150)]">{p.num}</Mono>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--c-900)", marginBottom: "10px", letterSpacing: "-0.02em" }}>{p.title}</h3>
            <p style={{ fontSize: "14px", color: "var(--c-400)", lineHeight: 1.65, margin: 0 }}>{p.desc}</p>
          </GlowCard>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOLUTION
   ═══════════════════════════════════════════════════════════════ */
export function Solution() {
  const [ref, vis] = useReveal();
  const [pRef, pOff] = useParallax(-0.02);
  return (
    <Section>
      <div
        ref={(el) => {
          // @ts-ignore
          if (ref) ref.current = el;
          // @ts-ignore
          if (pRef) pRef.current = el;
        }}
        style={{
          textAlign: "center",
          maxWidth: "580px",
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: `translateY(${vis ? pOff : 16 + pOff}px)`,
          transition: "all 0.7s cubic-bezier(0.25,1,0.5,1)",
        }}
      >
        <Mono className="block mb-6">The Solution</Mono>
        <h2
          style={{
            fontSize: "clamp(28px, 3.8vw, 44px)",
            fontWeight: 500,
            color: "var(--c-900)",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: "18px",
          }}
        >
          Structure, not luck
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "var(--c-400)",
            lineHeight: 1.7,
            margin: "0 auto 36px",
          }}
        >
          PathFinder replaces guesswork with a six-phase pipeline. AI guidance at every step. One clear action at a time.
        </p>
        <div
          className="proof-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid var(--c-150)",
            borderRadius: "10px",
            padding: "12px 20px",
            transition: "all 0.25s ease",
          }}
        >
          <I.Check />
          <span style={{ fontSize: "14px", color: "var(--c-600)", fontWeight: 500 }}>3× more interview callbacks on average</span>
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════ */
export function HowItWorks() {
  const phases = [
    { icon: <I.Compass />, title: "Direction", desc: "Map ideal roles and companies" },
    { icon: <I.File />, title: "CV Optimise", desc: "AI line-by-line analysis" },
    { icon: <I.Search />, title: "Discovery", desc: "Skill-matched opportunities" },
    { icon: <I.Users />, title: "Networking", desc: "Targeted outreach generation" },
    { icon: <I.Mic />, title: "Interviews", desc: "Company-specific practice" },
    { icon: <I.Chart />, title: "Tracker", desc: "Full application pipeline" },
  ];

  return (
    <Section id="process">
      <div style={{ textAlign: "center" }}>
        <Mono className="block mb-6">Process</Mono>
        <Heading center sub="Six phases. Each maximises your probability at the next.">
          How PathFinder works
        </Heading>
      </div>

      <div style={{ position: "relative" }}>
        {/* Connecting line */}
        <div
          className="connect-line"
          style={{
            position: "absolute",
            top: "52px",
            left: "8%",
            right: "8%",
            height: "1px",
            background: "var(--c-150)",
            zIndex: 0,
          }}
        />

        <div
          className="phase-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "8px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {phases.map((p, i) => (
            <GlowCard key={i} delay={i * 70} style={{ background: "var(--c-150)" }}>
              <div style={{ textAlign: "center" }}>
                <div
                  className="phase-icon"
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    border: "1px solid var(--c-150)",
                    margin: "0 auto 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--c-500)",
                    background: "var(--c-white)",
                    transition: "all 0.3s cubic-bezier(0.25,1,0.5,1)",
                  }}
                >
                  {p.icon}
                </div>
                <Mono className="block mb-2 text-[9.5px]">Phase {i + 1}</Mono>
                <h3 style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--c-900)", marginBottom: "5px" }}>{p.title}</h3>
                <p style={{ fontSize: "12px", color: "var(--c-400)", lineHeight: 1.45, margin: 0 }}>{p.desc}</p>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NEXT BEST ACTION
   ═══════════════════════════════════════════════════════════════ */
export function NextBestAction() {
  const [ref, vis] = useReveal();
  const actions = [
    { text: "Update CV with quantified impact metrics", tag: "cv" },
    { text: "Apply to 3 matched SWE internships at Stripe", tag: "jobs" },
    { text: "Follow up with recruiter at Vercel", tag: "network" },
    { text: "Practice system design — interview tomorrow", tag: "prep" },
  ];

  return (
    <Section>
      <div className="nba-section" style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: "72px", alignItems: "center" }}>
        <div>
          <Mono className="block mb-6">Core Concept</Mono>
          <Heading sub="PathFinder analyses your entire pipeline and surfaces the highest-impact action. Every day.">One action at a time</Heading>
          <p style={{ fontSize: "14.5px", color: "var(--c-400)", lineHeight: 1.7, marginTop: "-20px" }}>
            No spreadsheet paralysis. No guessing. Just the next thing that moves the needle.
          </p>
        </div>
        <div
          ref={(el) => {
            // @ts-ignore
            if (ref) ref.current = el;
          }}
        >
          <div style={{ border: "1px solid var(--c-150)", borderRadius: "14px", overflow: "hidden" }}>
            {actions.map((a, i) => (
              <div
                key={i}
                className="action-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "17px 20px",
                  borderBottom: i < actions.length - 1 ? "1px solid var(--c-100)" : "none",
                  background: i === 0 ? "var(--c-50)" : "var(--c-white)",
                  opacity: vis ? 1 : 0,
                  transform: vis ? "translateX(0)" : "translateX(24px)",
                  transition: `all 0.5s cubic-bezier(0.25,1,0.5,1) ${200 + i * 80}ms`,
                  cursor: "default",
                }}
              >
                {i === 0 && (
                  <span className="zap-icon" style={{ color: "var(--c-900)", flexShrink: 0 }}>
                    <I.Zap />
                  </span>
                )}
                {i > 0 && (
                  <div
                    className="action-checkbox"
                    style={{ width: "18px", height: "18px", borderRadius: "5px", border: "1.5px solid var(--c-200)", flexShrink: 0, transition: "all 0.2s" }}
                  />
                )}
                <span
                  style={{
                    fontSize: "13.5px",
                    flex: 1,
                    color: i === 0 ? "var(--c-900)" : "var(--c-500)",
                    fontWeight: i === 0 ? 600 : 400,
                  }}
                >
                  {a.text}
                </span>
                <span
                  className="action-tag"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: "var(--c-400)",
                    background: "var(--c-50)",
                    border: "1px solid var(--c-150)",
                    padding: "3px 10px",
                    borderRadius: "5px",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {a.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════════════════════ */
export function Features() {
  const features = [
    { icon: <I.File />, title: "CV Analysis", desc: "Line-by-line feedback with match scores per role. Actionable, not generic." },
    { icon: <I.Search />, title: "Job Matching", desc: "Roles matched on skills and experience level. Not keyword soup." },
    { icon: <I.Users />, title: "Network Copilot", desc: "AI outreach tailored per recruiter and company. Emails that work." },
    { icon: <I.Mic />, title: "Interview Sim", desc: "Practice with AI interviewers mirroring real company formats." },
  ];

  return (
    <Section id="features">
      <div style={{ textAlign: "center" }}>
        <Mono className="block mb-6">Features</Mono>
        <Heading center sub="Everything you need. Nothing you don't.">
          The toolkit
        </Heading>
      </div>
      <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {features.map((f, i) => (
          <GlowCard key={i} delay={i * 90}>
            <div
              className="feature-icon"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                border: "1px solid var(--c-150)",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-500)",
                transition: "all 0.3s cubic-bezier(0.25,1,0.5,1)",
              }}
            >
              {f.icon}
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--c-900)", marginBottom: "10px", letterSpacing: "-0.02em" }}>{f.title}</h3>
            <p style={{ fontSize: "14px", color: "var(--c-400)", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
          </GlowCard>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOCIAL PROOF
   ═══════════════════════════════════════════════════════════════ */
export function SocialProof() {
  const [ref, vis] = useReveal();
  const v1 = useCountUp(3, 1500, vis);
  const v2 = useCountUp(89, 1700, vis);
  const v3 = useCountUp(14, 1300, vis);

  const testimonials = [
    { quote: "Zero responses to 4 interviews in 3 weeks. Completely different outcome.", name: "Sarah Chen", role: "Stanford · CS", initials: "SC" },
    { quote: "The next-action feature removed all the paralysis. I just do what it says.", name: "Marcus Johnson", role: "Stripe · SWE Intern", initials: "MJ" },
    { quote: "CV score from 54 to 91. More useful than any career counsellor.", name: "Priya Patel", role: "Georgia Tech · CS", initials: "PP" },
  ];

  return (
    <Section id="results">
      <div style={{ textAlign: "center" }}>
        <Mono className="block mb-6">Results</Mono>
        <Heading center sub="Data from students using PathFinder in the last 6 months.">
          Measured outcomes
        </Heading>
      </div>

      <div
        ref={(el) => {
          // @ts-ignore
          if (ref) ref.current = el;
        }}
        className="stats-row"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "48px" }}
      >
        {[
          { value: `${v1}×`, label: "Interview callbacks" },
          { value: `${v2}%`, label: "Land ≥1 interview" },
          { value: `${v3}d`, label: "Avg. first response" },
        ].map((st, i) => (
          <GlowCard key={i} delay={i * 100}>
            <div style={{ textAlign: "center" }}>
              <div
                className="stat-number"
                style={{
                  fontSize: "clamp(40px, 5vw, 52px)",
                  fontWeight: 500,
                  letterSpacing: "-0.04em",
                  marginBottom: "8px",
                  color: "var(--c-900)",
                  fontVariantNumeric: "tabular-nums",
                  transition: "transform 0.3s cubic-bezier(0.25,1,0.5,1)",
                }}
              >
                {st.value}
              </div>
              <div style={{ fontSize: "13px", color: "var(--c-400)", fontWeight: 500 }}>{st.label}</div>
            </div>
          </GlowCard>
        ))}
      </div>

      <div className="testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {testimonials.map((t, i) => (
          <GlowCard key={i} delay={i * 100}>
            <p style={{ fontSize: "14.5px", color: "var(--c-600)", lineHeight: 1.65, marginBottom: "24px" }}>"{t.quote}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid var(--c-100)", paddingTop: "18px" }}>
              <div
                className="avatar"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--c-900)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  transition: "all 0.3s cubic-bezier(0.25,1,0.5,1)",
                }}
              >
                {t.initials}
              </div>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--c-900)" }}>{t.name}</div>
                <div style={{ fontSize: "12px", color: "var(--c-400)" }}>{t.role}</div>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════════════ */
export function FinalCTA() {
  const [ref, vis] = useReveal();
  return (
    <Section>
      <div
        ref={(el) => {
          // @ts-ignore
          if (ref) ref.current = el;
        }}
        className="cta-box"
        style={{
          textAlign: "center",
          padding: "clamp(56px, 7vw, 96px) 40px",
          borderRadius: "16px",
          border: "1px solid var(--c-150)",
          position: "relative",
          overflow: "hidden",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.7s cubic-bezier(0.25,1,0.5,1)",
        }}
      >
        <div className="border-beam" />
        <h2
          style={{
            fontSize: "clamp(28px, 3.8vw, 44px)",
            fontWeight: 500,
            color: "var(--c-900)",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: "16px",
          }}
        >
          Stop guessing. Start shipping applications.
        </h2>
        <p
          style={{
            fontSize: "15.5px",
            color: "var(--c-400)",
            maxWidth: "400px",
            margin: "0 auto 32px",
            lineHeight: 1.65,
          }}
        >
          Join the students who replaced anxiety with a system that works.
        </p>
        <MagBtn variant="primary" size="lg">
          Get Started <I.Arrow />
        </MagBtn>
        <p style={{ fontSize: "12px", color: "var(--c-300)", marginTop: "16px", fontWeight: 500 }}>
          Free during early access · No credit card
        </p>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */
export function Footer() {
  return (
    <footer
      style={{
        maxWidth: "1060px",
        margin: "0 auto",
        padding: "28px 24px 36px",
        borderTop: "1px solid var(--c-100)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "5px",
            background: "var(--c-900)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 12l10 10 10-10L12 2z" />
          </svg>
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--c-400)" }}>PathFinder</span>
      </div>
      <div style={{ display: "flex", gap: "24px" }}>
        {["Privacy", "Terms", "Contact"].map((item) => (
          <a
            key={item}
            href="#"
            className="nav-link"
            style={{
              fontSize: "12.5px",
              color: "var(--c-300)",
              textDecoration: "none",
              position: "relative",
              padding: "2px 0",
            }}
          >
            {item}
          </a>
        ))}
      </div>
      <Mono className="text-[10.5px] text-[var(--c-300)]">© 2026 PathFinder</Mono>
    </footer>
  );
}
