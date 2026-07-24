"use client";

/**
 * One contact, through the whole arc: prep the coffee chat, write the follow-up
 * from what was actually said, then ask for the referral.
 *
 * These are three separate routes but one relationship, so they share the
 * contact fields and the chat notes rather than making a student retype the
 * same person three times. The order is deliberate — each stage unlocks from
 * the input the previous one produces, which is also what the routes require:
 * `/network/follow-up` refuses step 1 without notes, and a referral asked for
 * before a conversation happened is the ask this methodology exists to prevent.
 */

import { useState } from "react";
import { FOLLOW_UP_CADENCE } from "@/lib/pf/data";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { cvStrengthLines, networkingProfileLine } from "@/lib/pf/ai-context";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Panel } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";
import { NaturalnessNote, type Naturalness } from "@/components/pf/networking/naturalness-note";

const mono = "'JetBrains Mono',monospace";

interface PrepData {
  researchBrief?: string;
  sharedAttributes?: string[];
  openingScript?: string;
  conversationQuestions?: { category: string; question: string }[];
  closingStrategy?: { approach?: "direct" | "indirect"; script?: string; reason?: string };
  followUpReminder?: string;
}

interface FollowUpData {
  message?: string;
  timing?: string;
  purpose?: string;
  nextStepReminder?: string;
}

interface ReferralData {
  referralMessage?: string;
  wordCount?: number;
  instructions?: string;
}

type FollowUpEnvelope = AiEnvelope<FollowUpData> & { naturalness?: Naturalness };

/** A generated message shown as copyable prose rather than an editable field —
 *  the student should rewrite it in their own client, in their own voice. */
function MessageBlock({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px dashed var(--lineStrong)", background: "var(--panel2)", borderRadius: 12,
        padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "var(--fg)", whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
}

function Field({
  value, onChange, placeholder, flex = "1 1 160px",
}: { value: string; onChange: (v: string) => void; placeholder: string; flex?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pf-input"
      style={{ height: 44, padding: "0 15px", flex, minWidth: 0 }}
    />
  );
}

export function ContactWorkspace() {
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(1);

  const prep = useAiTask<AiEnvelope<PrepData>>("/api/network/coffee-chat-prep");
  const follow = useAiTask<FollowUpEnvelope>("/api/network/follow-up");
  const referral = useAiTask<AiEnvelope<ReferralData>>("/api/network/referral-package");

  const contactName = name.trim();
  const contactCompany = company.trim();
  const chatNotes = notes.trim();

  // Real count from the event log, so the prompt's "how experienced is this
  // student at coffee chats" signal is evidence, not a guess.
  const coffeeChatsDone = profile.events.filter((e) => e.type === "CoffeeChatCompleted").length;

  const canPrep = contactName.length > 0 && contactCompany.length > 0;
  // Step 1 is the thank-you note; the route hard-refuses it without notes.
  const canFollow = contactName.length > 0 && (step > 1 || chatNotes.length > 0);
  const canRefer = contactName.length > 0 && role.trim().length > 0;

  const runPrep = async () => {
    const result = await prep.run({
      contactName,
      contactRole: role.trim(),
      contactCompany,
      studentProfile: networkingProfileLine(profile),
      coffeeChatsDone,
    });
    if (result?.data) emit("AiConsulted", "networking", `Prepped a coffee chat with ${contactName}`);
  };

  const runFollow = async () => {
    const result = await follow.run({ contactName, chatNotes, cadenceStep: step });
    if (result?.data?.message) {
      emit("AiConsulted", "networking", `Drafted follow-up step ${step} for ${contactName}`);
    }
  };

  const runReferral = async () => {
    const result = await referral.run({
      studentProfile: networkingProfileLine(profile),
      contactName,
      roleName: role.trim(),
      chatNotes,
      cvStrengths: cvStrengthLines(profile),
    });
    if (result?.data?.referralMessage) {
      emit("AiConsulted", "networking", `Built a referral package for ${contactName}`);
    }
  };

  const brief = prep.data?.data;
  const followUp = follow.data?.data;
  const pack = referral.data?.data;

  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 3px" }}>Contact workspace</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "58ch" }}>
        One person, start to finish — prep the chat, write the follow-up from what they actually said,
        then make the referral easy for them to act on.
      </span>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 15 }}>
        <Field value={name} onChange={setName} placeholder="Contact name" />
        <Field value={role} onChange={setRole} placeholder="Their role / the role you want" flex="1 1 200px" />
        <Field value={company} onChange={setCompany} placeholder="Company" />
      </div>

      {/* ── 1 · Coffee chat prep ── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", fontFamily: mono }}>
            1 · Before the chat
          </span>
          <GenerateButton onClick={runPrep} loading={prep.loading} disabled={!canPrep} loadingLabel="Prepping…">
            {brief ? "Re-prep chat" : "Prep the chat"}
          </GenerateButton>
          {!canPrep && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Name and company first.</span>}
        </div>

        <AiError message={prep.error} needsAuth={prep.needsAuth} />

        {brief && (
          <div>
            {brief.researchBrief && (
              <AiSection title="Research brief">
                <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{brief.researchBrief}</p>
              </AiSection>
            )}
            {brief.sharedAttributes?.length ? (
              <AiSection title="Common ground">
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {brief.sharedAttributes.map((a) => <AiTag key={a}>{a}</AiTag>)}
                </div>
              </AiSection>
            ) : null}
            {brief.openingScript && (
              <AiSection title="Opening"><MessageBlock text={brief.openingScript} /></AiSection>
            )}
            {brief.conversationQuestions?.length ? (
              <AiSection title="Questions to bring">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {brief.conversationQuestions.map((q) => (
                    <div key={q.question} style={{ display: "flex", gap: 9, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <AiTag tone="var(--active)">{q.category}</AiTag>
                      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, flex: "1 1 220px" }}>{q.question}</span>
                    </div>
                  ))}
                </div>
              </AiSection>
            ) : null}
            {brief.closingStrategy?.script && (
              <AiSection title={`Closing · ${brief.closingStrategy.approach ?? "indirect"}`}>
                <MessageBlock text={brief.closingStrategy.script} />
                {brief.closingStrategy.reason && (
                  <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "8px 0 0" }}>
                    {brief.closingStrategy.reason}
                  </p>
                )}
              </AiSection>
            )}
            <AiCaveat>
              Prep, not a script. Read it once, then have the conversation — reciting these lines is
              more obvious on a call than being unprepared.
            </AiCaveat>
          </div>
        )}
      </div>

      {/* ── 2 · Follow-up ── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line2)" }}>
        <span className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", fontFamily: mono, display: "block", marginBottom: 9 }}>
          2 · After the chat
        </span>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you actually talk about? Anything they suggested you do?"
          style={{
            width: "100%", minHeight: 90, padding: 13, borderRadius: 13,
            border: "1px dashed var(--lineStrong)", background: "var(--panelSolid)", color: "var(--fg)",
            fontSize: 13, lineHeight: 1.6, fontFamily: "'Manrope',sans-serif", outline: "none", resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 11 }}>
          {FOLLOW_UP_CADENCE.map((c) => {
            const n = Number(c.n);
            const on = step === n;
            return (
              <button
                key={c.n}
                onClick={() => setStep(n)}
                title={c.note}
                style={{
                  cursor: "pointer", height: 32, padding: "0 13px", borderRadius: 9,
                  border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  background: on ? "var(--accentSoft)" : "var(--panel2)",
                  color: on ? "var(--accentText)" : "var(--muted)",
                  fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", transition: "all .2s var(--ease)",
                }}
              >
                {c.n} · {c.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 11 }}>
          <GenerateButton onClick={runFollow} loading={follow.loading} disabled={!canFollow} loadingLabel="Writing…">
            {followUp ? "Rewrite follow-up" : "Write the follow-up"}
          </GenerateButton>
          {!canFollow && (
            <span style={{ fontSize: 11.5, color: "var(--faint)", maxWidth: "38ch", lineHeight: 1.5 }}>
              {contactName ? "A thank-you needs your notes — it has to reference what they said." : "Add the contact name first."}
            </span>
          )}
        </div>

        <AiError message={follow.error} needsAuth={follow.needsAuth} />

        {followUp?.message && (
          <div style={{ marginTop: 14 }}>
            {followUp.timing && (
              <div className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8, fontFamily: mono }}>
                Send · {followUp.timing}
              </div>
            )}
            <MessageBlock text={followUp.message} />
            <NaturalnessNote result={follow.data?.naturalness} />
            {followUp.nextStepReminder && (
              <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "9px 0 0" }}>
                {followUp.nextStepReminder}
              </p>
            )}
            <AiCaveat>
              Edit before sending. A follow-up that reads like it was generated undoes the credibility
              the conversation just earned you.
            </AiCaveat>
          </div>
        )}
      </div>

      {/* ── 3 · Referral ── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", fontFamily: mono }}>
            3 · The referral
          </span>
          <GenerateButton onClick={runReferral} loading={referral.loading} disabled={!canRefer} loadingLabel="Building…" variant="ghost">
            {pack ? "Rebuild package" : "Build referral package"}
          </GenerateButton>
          {!canRefer && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Needs the contact name and the role.</span>}
        </div>

        <AiError message={referral.error} needsAuth={referral.needsAuth} />

        {pack?.referralMessage && (
          <div style={{ marginTop: 14 }}>
            <div className="pf-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8, fontFamily: mono }}>
              Written for {contactName} to forward{typeof pack.wordCount === "number" ? ` · ${pack.wordCount} words` : ""}
            </div>
            <MessageBlock text={pack.referralMessage} />
            {pack.instructions && (
              <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "9px 0 0" }}>{pack.instructions}</p>
            )}
            {referral.data?.nextSteps?.length ? (
              <AiSection title="Next steps"><AiList items={referral.data.nextSteps} /></AiSection>
            ) : null}
            <AiCaveat>
              This is written in your contact&apos;s voice for them to forward. Check every claim in it
              is one they could actually stand behind before you send it to them.
            </AiCaveat>
          </div>
        )}
      </div>
    </Panel>
  );
}
