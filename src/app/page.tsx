import { DotGrid } from "@/components/ui/dot-grid";
import { GlowCard } from "@/components/ui/glow-card";
import { MagBtn } from "@/components/ui/mag-btn";
import { Mono, Tag, Section, Heading, WordReveal, AnimBar } from "@/components/ui/typography";
import { I } from "@/components/ui/icons";
import Link from 'next/link';
import { Problem, Solution, HowItWorks, NextBestAction, Features, SocialProof, FinalCTA, Footer } from "@/components/ui/landing-sections"; // Extracting the rest to keep page.tsx clean

/* ═══════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
      <DotGrid />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 65% 55% at 50% 45%, transparent 40%, white 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "200px",
          background: "linear-gradient(to top, white, transparent)",
          pointerEvents: "none",
        }}
      />

      <Section style={{ padding: "160px 24px 120px", textAlign: "center", width: "100%", position: "relative", zIndex: 2 }}>
        <div style={{ animation: "fadeInUp 0.7s cubic-bezier(0.25,1,0.5,1) 0.2s both" }}>
          <Tag>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <I.Terminal /> v0.1 — Early Access
            </span>
          </Tag>
        </div>

        <h1
          style={{
            fontSize: "clamp(40px, 6.5vw, 72px)",
            fontWeight: 500,
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
            color: "var(--c-900)",
            margin: "32px auto 22px",
            maxWidth: "700px",
          }}
        >
          <WordReveal text="The career OS for" delay={400} />
          <br />
          <span style={{ position: "relative", display: "inline-block" }}>
            <WordReveal
              text="landing internships"
              delay={800}
              style={{
                backgroundImage: "linear-gradient(transparent 60%, var(--c-100) 60%)",
                paddingBottom: "4px",
              }}
            />
          </span>
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 1.7vw, 17px)",
            color: "var(--c-400)",
            lineHeight: 1.65,
            maxWidth: "420px",
            margin: "0 auto 36px",
            animation: "fadeInUp 0.7s cubic-bezier(0.25,1,0.5,1) 0.56s both"
          }}
        >
          AI-powered pipeline that takes you from first application to signed offer. Step by step.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            animation: "fadeInUp 0.7s cubic-bezier(0.25,1,0.5,1) 0.68s both"
          }}
        >
          <Link href="/direction" style={{ textDecoration: 'none' }}>
            <MagBtn variant="primary" size="lg">
              Get Started <I.Arrow />
            </MagBtn>
          </Link>
          <a href="#process" style={{ textDecoration: 'none' }}>
            <MagBtn variant="secondary" size="lg">
              See how it works
            </MagBtn>
          </a>
        </div>

        <div
          style={{
            marginTop: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            animation: "fadeInUp 0.7s cubic-bezier(0.25,1,0.5,1) 0.8s both"
          }}
        >
          {["Free during beta", "No credit card", "5 min setup"].map((t, i) => (
            <span
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12.5px",
                color: "var(--c-300)",
                fontWeight: 500,
              }}
            >
              <span style={{ color: "var(--c-900)" }}>
                <I.Check />
              </span>{" "}
              {t}
            </span>
          ))}
        </div>

        {/* Dashboard preview with border beam */}
        <div style={{ marginTop: "64px", animation: "fadeInUp 0.7s cubic-bezier(0.25,1,0.5,1) 0.92s both" }}>
          <div
            className="preview-frame"
            style={{
              position: "relative",
              background: "var(--c-white)",
              border: "1px solid var(--c-150)",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.06)",
              maxWidth: "820px",
              margin: "0 auto",
            }}
          >
            {/* Border beam animation */}
            <div className="border-beam" />

            {/* Titlebar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid var(--c-100)",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--c-200)", transition: "background 0.2s" }}
                    className="dot-btn"
                  />
                ))}
              </div>
              <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-300)", fontWeight: 500 }}>
                pathfinder / dashboard
              </div>
              <div style={{ width: "42px" }} />
            </div>

            {/* Content */}
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "180px 1fr", gap: "16px", minHeight: "280px" }} className="dash-grid text-left">
              {/* Sidebar */}
              <div style={{ borderRight: "1px solid var(--c-100)", paddingRight: "16px" }}>
                <Mono className="block mb-3.5 text-[10px]">Pipeline</Mono>
                {[
                  { name: "Direction", done: true },
                  { name: "CV Review", done: true },
                  { name: "Job Search", active: true },
                  { name: "Networking" },
                  { name: "Interviews" },
                  { name: "Tracker" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="sidebar-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "7px 8px",
                      borderRadius: "6px",
                      marginBottom: "2px",
                      background: item.active ? "var(--c-50)" : "transparent",
                      transition: "all 0.15s ease",
                      cursor: "default",
                    }}
                  >
                    <div
                      className="pip"
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: item.done ? "var(--c-900)" : item.active ? "var(--c-400)" : "var(--c-200)",
                        transition: "transform 0.2s",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: item.active ? 600 : 400,
                        color: item.active ? "var(--c-900)" : item.done ? "var(--c-600)" : "var(--c-300)",
                      }}
                    >
                      {item.name}
                    </span>
                    {item.done && (
                      <span style={{ marginLeft: "auto", color: "var(--c-400)" }}>
                        <I.Check />
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  className="nba-preview"
                  style={{
                    background: "var(--c-50)",
                    border: "1px solid var(--c-100)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span className="zap-icon text-[var(--c-900)]">
                      <I.Zap />
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, color: "var(--c-900)", letterSpacing: "0.03em" }}>
                      NEXT ACTION
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "var(--c-400)",
                        background: "var(--c-white)",
                        border: "1px solid var(--c-150)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      HIGH
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--c-600)", lineHeight: 1.5, margin: 0 }}>
                    Apply to <strong style={{ color: "var(--c-900)" }}>3 matching roles</strong> at Stripe, Vercel & Linear —
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}> 92% match</span>
                  </p>
                </div>

                <div className="preview-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", flex: 1 }}>
                  {[
                    { label: "CV Score", val: "92%", bar: 92 },
                    { label: "Applied", val: "12", bar: 48 },
                    { label: "Interviews", val: "4", bar: 33 },
                    { label: "Response", val: "33%", bar: 33 },
                  ].map((st, i) => (
                    <div
                      key={i}
                      className="stat-cell"
                      style={{
                        border: "1px solid var(--c-100)",
                        borderRadius: "8px",
                        padding: "12px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-300)", marginBottom: "8px", fontWeight: 500 }}>
                        {st.label}
                      </div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 600,
                          color: "var(--c-900)",
                          letterSpacing: "-0.03em",
                          marginBottom: "10px",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {st.val}
                      </div>
                      <AnimBar width={st.bar} delay={1800 + i * 150} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <NextBestAction />
      <Features />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </>
  );
}
