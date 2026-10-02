"use client";

/**
 * Phase 04 — Networking. Persona-aware AI outreach generator with sent
 * counter and follow-up drafts, coffee-chat playbook and the four-step
 * follow-up cadence.
 */

import {
  COFFEE_CHAT_FRAMEWORK,
  FOLLOW_UP_CADENCE,
  NETWORK_PERSONA_ANGLES,
  NETWORK_RESEARCH_STEPS,
  OUTREACH_PERSONAS,
  STAKEHOLDER_SEARCH,
  type OutreachPersona,
} from "@/lib/pf/data";
import { buildOutreachTemplate, composeSharedAttributes, followUpMessage, outreachSubject, targetKeywords } from "@/lib/pf/logic";
import { netContactKey, netDraftKey, usePfStore, type NetContact } from "@/lib/pf/store";
import { useState } from "react";
import { useAiTask } from "@/lib/pf/use-ai";
import { Chip, PageHeader, Panel, Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, GenerateButton } from "@/components/pf/ai-panel";
import { NextStep } from "@/components/pf/next-step";
import { ContactWorkspace } from "@/components/pf/networking/contact-workspace";
import { ProfileResearch } from "@/components/pf/networking/profile-research";
import { StartupPanel } from "@/components/pf/networking/startup-panel";
import { EventsPlaybook, OneLinerCard, SignalsChecklist, WhoToAskMatrix } from "@/components/pf/networking/playbooks";
import { NaturalnessBadge, type Naturalness } from "@/components/pf/networking/naturalness-note";

const PERSONA_API_TYPE: Record<OutreachPersona, "recruiter" | "hiringManager" | "peer"> = {
  "Recruiter": "recruiter",
  "Hiring manager": "hiringManager",
  "Peer / alumnus": "peer",
  "Startup founder": "peer",
};

/** `/api/networking/outreach` answers at the root (aiShape), not in an envelope. */
interface OutreachResult {
  message?: string;
  questions?: string[];
  topics?: string[];
  followUp?: string | null;
  naturalness?: Naturalness;
}

export default function NetworkingPage() {
  const s = usePfStore();

  // The real recipient the student is writing to: one shared, persisted contact
  // across Research, Outreach and the Contact workspace, never a fabricated
  // named contact. The draft stays honestly blank until the student fills it in.
  // No sender name is sent: the account holds only an email, and a name guessed
  // from it signs a university student's messages "s1234567".
  const contact = s.netContact;
  // Research belongs to the person it was run on. Once the contact changes, both
  // the findings and the profile text pasted for them stop being about this person.
  const staleResearch = !!s.netResearch && s.netResearch.key !== netContactKey(contact);
  const research = staleResearch ? null : s.netResearch?.data ?? null;
  const draftKey = netDraftKey(s.netPersona, contact);
  // The last draft is shown only for the contact and persona it was written for.
  const aiMsg = s.netDraft?.key === draftKey ? s.netDraft : null;
  const outreach = useAiTask<OutreachResult>("/api/networking/outreach");
  const [emptyReply, setEmptyReply] = useState(false);

  const editContact = (patch: Partial<NetContact>) => s.set({ netContact: { ...contact, ...patch } });

  const role = s.dirRole ? `${s.dirRole} Intern` : "SWE Intern";
  const techs = targetKeywords(s.dirStack, s.dirRole).slice(0, 3).join(", ");
  const subject = outreachSubject(s.netPersona, role);
  const templateParas = buildOutreachTemplate(s.netPersona, {
    name: contact.name,
    company: contact.company,
    role,
    techs,
  });
  const recipientLabel = contact.name.trim() || contact.company.trim() || "your contact";

  // What the AI personalises on: research findings first, then the raw profile
  // text the student pasted, then a neutral fallback. Never invented.
  const researchBits = [...(research?.connectionPoints ?? []), ...(research?.outreachAngles ?? [])].filter(Boolean);
  const sharedAttributes = composeSharedAttributes(
    research,
    staleResearch ? {} : { about: contact.about, experience: contact.experience },
    s.dirRole ? `${s.dirRole} student targeting internships` : "Student targeting internships",
  );

  // AI outreach built from the real contact the student entered. On any
  // failure the structural template stays and the reason is shown.
  const regenerate = async () => {
    const key = draftKey;
    setEmptyReply(false);
    const r = await outreach.run({
      type: PERSONA_API_TYPE[s.netPersona],
      recipientName: contact.name.trim() || undefined,
      roleTitle: role,
      company: contact.company.trim() || undefined,
      technologies: techs,
      // The research findings + what the student actually pasted about this
      // person — no invented common ground.
      sharedAttributes,
    });
    const paras = (r?.message ?? "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
    if (!r) return;
    if (!paras.length) {
      setEmptyReply(true);
      return;
    }
    s.set({
      netDraft: {
        key,
        paras,
        followUp: r.followUp?.trim() || null,
        // The route scores every message it generates; showing the real
        // verdict is the only honest version of the badge in the header.
        naturalness: r.naturalness ?? null,
        questions: r.questions ?? [],
        topics: r.topics ?? [],
      },
    });
    s.emit("AiConsulted", "networking", `Drafted outreach to ${recipientLabel}`, { kind: "outreach" });
  };

  const pickPersona = (p: OutreachPersona) => s.set({ netPersona: p, netFollow: false });

  // Say what is actually on screen after a failure: the last real draft, or the template.
  const kept = aiMsg ? "Your previous draft is kept below." : "Here's the structural template instead: fill in the bracketed parts.";
  const outreachError = outreach.error
    ? outreach.needsAuth ? outreach.error : `${outreach.error} ${kept}`
    : emptyReply ? `The AI writer came back with an empty message. ${kept}` : null;

  const followMsg = aiMsg?.followUp ?? followUpMessage(contact.name);

  return (
    <div>
      <PageHeader label="Phase 04 · Connections" title="Networking">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "58ch" }}>
          Many roles are filled before they&apos;re ever posted, and a{" "}
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>referral</span> is one of the strongest routes to an interview.
          That is why most of your effort goes here.
        </p>
      </PageHeader>

      <NextStep />

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "2 1 460px", minWidth: 0 }}>
          <ProfileResearch
            contact={contact}
            onContactChange={(c) => s.set({ netContact: c })}
            onResult={({ contact: c, data }) => s.set({ netResearch: { key: netContactKey(c), name: c.name.trim(), data }, netDraft: null })}
          />
        </div>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <SignalsChecklist />
        </div>
      </div>
      <ContactWorkspace
        contact={{ name: contact.name, company: contact.company }}
        onContactChange={editContact}
      />
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

      <WhoToAskMatrix />

      {/* Who to reach, what they're called, and how to research them */}
      <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <h2 className="pf-display-sm" style={{ fontSize: 21, margin: 0 }}>Who to reach, and what they&apos;re called</h2>
          <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)" }}>the titles to search on LinkedIn / Glassdoor</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
          {STAKEHOLDER_SEARCH.map((st) => (
            <div key={st.kind} style={{ border: "1px solid var(--line2)", borderRadius: 12, background: "var(--panel2)", padding: "14px 16px" }}>
              <div className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: st.tone, marginBottom: 8 }}>{st.kind}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                {st.goesBy.map((t) => (
                  <span key={t} className="pf-mono" style={{ fontSize: 10, color: "var(--muted)", border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 6, padding: "3px 8px" }}>{t}</span>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--fg)", lineHeight: 1.5, marginBottom: 6 }}><span style={{ color: "var(--faint)" }}>Find them: </span>{st.where}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}><span style={{ color: "var(--faint)" }}>Research: </span>{st.research}</div>
            </div>
          ))}
        </div>
        <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8 }}>How to research before you reach out</div>
        {NETWORK_RESEARCH_STEPS.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0" }}>
            <span className="pf-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>{step}</span>
          </div>
        ))}
      </Panel>

      <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <h2 className="pf-display-sm" style={{ fontSize: 21, margin: 0 }}>Coffee chat playbook</h2>
          <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)" }}>The four-part framework · 20–30 min</span>
          <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "var(--accent)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
            never ask for a job; the referral follows
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Prep, ~30 min: re-read their profile + one recent thing · 30-second intro ready · 5–6 open questions prepared (you&apos;ll use 3–4) · video on · you watch the clock.
        </div>
        {aiMsg && (aiMsg.questions.length > 0 || aiMsg.topics.length > 0) && (
          <div style={{ border: "1px dashed var(--lineStrong)", borderRadius: 12, padding: "4px 16px 14px", marginBottom: 14 }}>
            {aiMsg.questions.length > 0 && (
              <AiSection title={`Questions for ${recipientLabel}`}><AiList items={aiMsg.questions} /></AiSection>
            )}
            {aiMsg.topics.length > 0 && (
              <AiSection title="Topics to raise"><AiList items={aiMsg.topics} /></AiSection>
            )}
            <AiCaveat>
              Drafted alongside your outreach from what you entered about {recipientLabel}. Keep the ones that
              fit what you actually know about them, and drop the rest.
            </AiCaveat>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {COFFEE_CHAT_FRAMEWORK.map((c) => (
            <div key={c.n} style={{ border: "1px solid var(--line2)", borderRadius: 12, background: "var(--panel2)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pf-mono" style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent)", color: "var(--onAccent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{c.n}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{c.time}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>{c.note}</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "var(--fg)", borderLeft: "2px solid var(--lineStrong)", paddingLeft: 9, fontStyle: "italic" }}>“{c.script}”</div>
            </div>
          ))}
        </div>
      </Panel>

      <OneLinerCard />
      <EventsPlaybook />

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 18 }}>
        <Reveal style={{ border: "1px solid var(--lineStrong)", borderRadius: 18, background: "var(--panelSolid)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px dashed var(--lineStrong)", background: "var(--accentSoft)" }}>
            <span style={{ display: "flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, background: "var(--accent)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--onAccent)"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>AI outreach · tailored to {recipientLabel}</span>
            {/* Only claimed once a message has actually been scored — the
                template shown before that has no verdict to report. */}
            <NaturalnessBadge result={aiMsg?.naturalness} />
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "14px 22px 0" }}>
            {OUTREACH_PERSONAS.map((p) => (
              <Chip key={p} size="sm" label={p} on={s.netPersona === p} onClick={() => pickPersona(p)} />
            ))}
          </div>

          {/* Who you're writing to — the same shared contact as "Research a
              contact" above, so researching a person personalises this draft.
              Prefill the company from a saved role, or type it. */}
          <div style={{ padding: "14px 22px 0" }}>
            {s.savedJobs.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {s.savedJobs.slice(0, 6).map((j) => (
                  <Chip
                    key={j.company + j.role}
                    size="sm"
                    label={j.company}
                    on={contact.company.trim().toLowerCase() === j.company.toLowerCase()}
                    onClick={() => editContact({ company: j.company })}
                  />
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                value={contact.name}
                onChange={(e) => editContact({ name: e.target.value })}
                placeholder="Their name (optional)"
                className="pf-input"
                style={{ height: 40, padding: "0 13px", flex: "1 1 160px", minWidth: 0, fontSize: 13 }}
              />
              <input
                value={contact.company}
                onChange={(e) => editContact({ company: e.target.value })}
                placeholder="Their company"
                className="pf-input"
                style={{ height: 40, padding: "0 13px", flex: "1 1 160px", minWidth: 0, fontSize: 13 }}
              />
            </div>
            {staleResearch ? (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>
                Your research was on {s.netResearch?.name || "a different contact"}, so it isn&apos;t used here.
                Research {contact.name.trim() || "this contact"} above to personalise this draft.
              </div>
            ) : research ? (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--strong)", lineHeight: 1.5 }}>
                ✓ Personalising on your research of {contact.name.trim() || "this contact"}
                {researchBits.length ? `, with ${researchBits.length} connection point${researchBits.length > 1 ? "s" : ""} to draw on` : ""}.
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>
                Paste their profile in &ldquo;Research a contact&rdquo; above to personalise this. Otherwise the AI writes from your target role alone.
              </div>
            )}
          </div>

          <div style={{ padding: "16px 24px" }}>
            <div className="pf-mono" style={{ fontSize: 11, color: "var(--faint)", marginBottom: 12 }}>Subject · {subject}</div>
            {aiMsg ? (
              <>
                {aiMsg.paras.map((p, i) => (
                  <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: i === aiMsg.paras.length - 1 ? "var(--muted)" : "var(--fg)", margin: i === aiMsg.paras.length - 1 ? "0 0 4px" : "0 0 12px" }}>{p}</p>
                ))}
                <div style={{ marginBottom: 14 }}>
                  <AiCaveat>A first draft from what you entered. Check every detail is true and put it in your own voice before sending.</AiCaveat>
                </div>
              </>
            ) : (
              <>
                <div className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8 }}>
                  Structural template: fill the bracketed parts, or generate a tailored version
                </div>
                {templateParas.map((p, i) => (
                  <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: i === templateParas.length - 1 ? "var(--muted)" : "var(--fg)", margin: i === templateParas.length - 1 ? "0 0 16px" : "0 0 12px" }}>{p}</p>
                ))}
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--line2)", paddingTop: 14 }}>
              <button className="pf-shine"
                onClick={() => s.generateOutreach({ name: contact.name, company: contact.company, message: (aiMsg ? aiMsg.paras : templateParas).join(" ") })}
                disabled={!contact.name.trim()}
                title={contact.name.trim() ? undefined : "Add who you're writing to first"}
                style={{ cursor: contact.name.trim() ? "pointer" : "default", height: 42, padding: "0 20px", borderRadius: 11, border: "none", background: contact.name.trim() ? "var(--accent)" : "var(--panel3)", color: contact.name.trim() ? "var(--onAccent)" : "var(--faint)", fontSize: 13, fontWeight: 600 }}
              >
                Mark as sent &amp; log it →
              </button>
              <GenerateButton onClick={() => void regenerate()} loading={outreach.loading} variant="ghost">
                {aiMsg ? "Regenerate with AI" : "Generate with AI"}
              </GenerateButton>
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

            <AiError message={outreachError} needsAuth={outreach.needsAuth} />

            {s.netFollow && (
              <div style={{ marginTop: 14, border: "1px dashed var(--lineStrong)", borderRadius: 12, padding: "14px 16px", background: "var(--panel2)" }}>
                <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 7 }}>
                  Follow-up · send 4–10 days after, with proof of action
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>{followMsg}</p>
                {aiMsg?.followUp && <AiCaveat>Drafted with your outreach. Swap in the real thing you did since, before sending.</AiCaveat>}
              </div>
            )}
          </div>
        </Reveal>

        <Panel style={{ padding: "20px 22px" }}>
          <h2 className="pf-display-sm" style={{ fontSize: 21, margin: "0 0 3px" }}>Follow-up cadence</h2>
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
