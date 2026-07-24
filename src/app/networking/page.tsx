"use client";

/**
 * Phase 04 — Networking. Persona-aware AI outreach generator with sent
 * counter and follow-up drafts, coffee-chat playbook and the four-step
 * follow-up cadence.
 */

import { useState } from "react";
import {
  COFFEE_CHAT_FRAMEWORK,
  FOLLOW_UP_CADENCE,
  NETWORK_PERSONA_ANGLES,
  OUTREACH_MESSAGES,
  OUTREACH_PERSONAS,
  type OutreachPersona,
} from "@/lib/pf/data";
import { followUpMessage, targetKeywords } from "@/lib/pf/logic";
import { usePfStore } from "@/lib/pf/store";
import { useAuthStore } from "@/lib/stores";
import { Chip, PageHeader, Panel, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";
import { ContactWorkspace } from "@/components/pf/networking/contact-workspace";
import { StartupPanel } from "@/components/pf/networking/startup-panel";
import { NaturalnessBadge, type Naturalness } from "@/components/pf/networking/naturalness-note";

const PERSONA_API_TYPE: Record<OutreachPersona, "recruiter" | "hiringManager" | "peer"> = {
  "Recruiter": "recruiter",
  "Hiring manager": "hiringManager",
  "Peer / alumnus": "peer",
  "Startup founder": "peer",
};

interface AiOutreach { paras: string[]; followUp: string | null; naturalness: Naturalness | null }

export default function NetworkingPage() {
  const s = usePfStore();
  const user = useAuthStore((a) => a.user);
  const senderName = user?.email ? user.email.split("@")[0].replace(/[._]/g, " ") : "";
  const netMsg = OUTREACH_MESSAGES[s.netPersona];
  const [aiMsg, setAiMsg] = useState<AiOutreach | null>(null);
  const [generating, setGenerating] = useState(false);

  // AI outreach via the active site's generator; the design's persona
  // templates remain the instant fallback.
  const regenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/networking/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: PERSONA_API_TYPE[s.netPersona],
          recipientName: netMsg.to.split(" ·")[0],
          senderName,
          roleTitle: s.dirRole ? `${s.dirRole} Intern` : "SWE Intern",
          company: netMsg.to.split(", ").pop() ?? "the company",
          technologies: targetKeywords(s.dirStack).slice(0, 3).join(", "),
          sharedAttributes: s.netPersona === "Startup founder" ? "Built a project on their product; founder-led team" : (s.dirRole ? `${s.dirRole} student` : "Student targeting internships"),
        }),
      });
      const json: unknown = res.ok ? await res.json() : null;
      const j = json as { message?: string; followUp?: string; naturalness?: Naturalness } | null;
      if (j?.message && j.message.trim().length > 60) {
        setAiMsg({
          paras: j.message.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean),
          followUp: typeof j.followUp === "string" && j.followUp.trim() ? j.followUp : null,
          // The route scores every message it generates; showing the real
          // verdict is the only honest version of the badge in the header.
          naturalness: j.naturalness ?? null,
        });
      }
    } catch {
      /* template message stays */
    } finally {
      setGenerating(false);
    }
  };

  const pickPersona = (p: OutreachPersona) => {
    setAiMsg(null);
    s.set({ netPersona: p, netFollow: false });
  };

  const followMsg = aiMsg?.followUp ?? followUpMessage(netMsg.to);

  return (
    <div>
      <PageHeader label="Phase 04 · Connections" title="Networking">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "58ch" }}>
          70–80% of roles are filled before they&apos;re posted. Referred candidates get{" "}
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>~4× the interview rate</span> — this is where 70% of your effort goes.
        </p>
      </PageHeader>

      <NextStep />

      <ContactWorkspace />
      <StartupPanel />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        {NETWORK_PERSONA_ANGLES.map((p) => (
          <Reveal key={p.kind} style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel)", padding: "20px 22px" }}>
            <div className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: p.tone, marginBottom: 8 }}>{p.kind}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{p.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>{p.angle}</div>
          </Reveal>
        ))}
      </div>

      <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Coffee chat playbook</h2>
          <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)" }}>The four-part framework · 20–30 min</span>
          <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "var(--accent)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
            never ask for a job — the referral follows
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Prep, ~30 min: re-read their profile + one recent thing · 30-second intro ready · 5–6 open questions prepared (you&apos;ll use 3–4) · video on · you watch the clock.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {COFFEE_CHAT_FRAMEWORK.map((c) => (
            <div key={c.n} style={{ border: "1px solid var(--line2)", borderRadius: 12, background: "var(--panel2)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pf-mono" style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "#F7F1E4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{c.n}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{c.time}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>{c.note}</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "var(--fg)", borderLeft: "2px solid var(--lineStrong)", paddingLeft: 9, fontStyle: "italic" }}>“{c.script}”</div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 18 }}>
        <Reveal style={{ border: "1px solid var(--lineStrong)", borderRadius: 18, background: "var(--panelSolid)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px dashed var(--lineStrong)", background: "var(--accentSoft)" }}>
            <span style={{ display: "flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, background: "var(--accent)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>AI outreach · tailored to {netMsg.to}</span>
            {/* Only claimed once a message has actually been scored — the
                template shown before that has no verdict to report. */}
            <NaturalnessBadge result={aiMsg?.naturalness} />
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "14px 22px 0" }}>
            {OUTREACH_PERSONAS.map((p) => (
              <Chip key={p} size="sm" label={p} on={s.netPersona === p} onClick={() => pickPersona(p)} />
            ))}
          </div>

          <div style={{ padding: "18px 24px" }}>
            <div className="pf-mono" style={{ fontSize: 11, color: "var(--faint)", marginBottom: 12 }}>Subject · {netMsg.subject}</div>
            {aiMsg ? (
              aiMsg.paras.map((p, i) => (
                <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: i === aiMsg.paras.length - 1 ? "var(--muted)" : "var(--fg)", margin: i === aiMsg.paras.length - 1 ? "0 0 16px" : "0 0 12px" }}>{p}</p>
              ))
            ) : (
              <>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg)", margin: "0 0 12px" }}>{netMsg.p1}</p>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg)", margin: "0 0 12px" }}>{netMsg.p2}</p>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--muted)", margin: "0 0 16px" }}>{netMsg.close}</p>
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--line2)", paddingTop: 14 }}>
              <button
                onClick={s.generateOutreach}
                style={{ cursor: "pointer", height: 42, padding: "0 20px", borderRadius: 11, border: "none", background: "var(--accent)", color: "#F7F1E4", fontSize: 13, fontWeight: 600 }}
              >
                Mark as sent &amp; log it →
              </button>
              <button
                onClick={() => void regenerate()}
                disabled={generating}
                style={{ cursor: generating ? "default" : "pointer", height: 42, padding: "0 18px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: generating ? "var(--faint)" : "var(--fg)", fontSize: 13, fontWeight: 600 }}
              >
                {generating ? "Generating…" : "Regenerate with AI"}
              </button>
              {!s.netFollow && (
                <button
                  onClick={() => s.set({ netFollow: true })}
                  style={{ cursor: "pointer", height: 42, padding: "0 18px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
                >
                  Generate follow-up
                </button>
              )}
              <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--muted)" }}>{s.netSent} outreach messages logged → tracker stat</span>
            </div>

            {s.netFollow && (
              <div style={{ marginTop: 14, border: "1px dashed var(--lineStrong)", borderRadius: 12, padding: "14px 16px", background: "var(--panel2)" }}>
                <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 7 }}>
                  Follow-up · send 4–10 days after, with proof of action
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>{followMsg}</p>
              </div>
            )}
          </div>
        </Reveal>

        <Panel style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 3px" }}>Follow-up cadence</h2>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>The 4-step sequence</span>
          <div style={{ marginTop: 14 }}>
            {FOLLOW_UP_CADENCE.map((c) => (
              <div key={c.n} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line2)" }}>
                <span className="pf-mono" style={{ width: 22, height: 22, borderRadius: 7, background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{c.n}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.note}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
