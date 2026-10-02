"use client";

/**
 * "Draft follow-up" for a tracked application, in the application drawer.
 *
 * It reuses `/api/network/follow-up`, which is built around the coffee-chat
 * cadence. Step 4 ("still very interested in the role, here's an update") is
 * the one that fits an application gone quiet, and step 4 is the only step the
 * route does not refuse without chat notes. The notes sent here say plainly that
 * there was no conversation, so the model does not thank anyone for a chat that
 * never happened.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { AiCaveat, AiError, GenerateButton } from "@/components/pf/ai-panel";
import { NaturalnessNote, type Naturalness } from "@/components/pf/networking/naturalness-note";

interface FollowUpData {
  message?: string;
  timing?: string;
  nextStepReminder?: string;
}

/** The cadence step for "keep them posted, still interested". */
const APPLICATION_STEP = 4;

export function applicationFollowUpNotes(card: { company: string; role: string; appliedDate?: number; note?: string }): string {
  const when = card.appliedDate
    ? ` on ${new Date(card.appliedDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
    : "";
  return [
    `I applied for the ${card.role} role at ${card.company}${when} and have not heard back.`,
    "There was no conversation: this is a polite follow-up on a submitted application, not a thank-you for a chat.",
    card.note?.trim() ? `My notes on this application: ${card.note.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function FollowUpDraft({ company, role, appliedDate, note }: { company: string; role: string; appliedDate?: number; note?: string }) {
  const emit = usePfStore((s) => s.emit);
  const [contact, setContact] = useState("");
  const { data, loading, error, needsAuth, run } = useAiTask<AiEnvelope<FollowUpData> & { naturalness?: Naturalness }>(
    "/api/network/follow-up",
  );
  const draft = data?.data;

  const generate = async () => {
    const res = await run({
      contactName: contact.trim() || `the ${company} recruiting team`,
      chatNotes: applicationFollowUpNotes({ company, role, appliedDate, note }),
      cadenceStep: APPLICATION_STEP,
      contactType: "recruiter",
    });
    if (res?.data?.message) emit("AiConsulted", "tracker", `Drafted a follow-up on ${role} at ${company}`);
  };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", padding: "14px 16px", marginBottom: 22 }}>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Recruiter's name (optional)"
          aria-label="Recruiter's name"
          className="pf-input"
          style={{ height: 38, padding: "0 12px", fontSize: 13, flex: "1 1 180px", minWidth: 0 }}
        />
        <GenerateButton onClick={generate} loading={loading} loadingLabel="Writing…">
          {draft?.message ? "Rewrite follow-up" : "Draft follow-up"}
        </GenerateButton>
      </div>
      <AiError message={error} needsAuth={needsAuth} />
      {draft?.message && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              border: "1px dashed var(--lineStrong)", background: "var(--panel2)", borderRadius: 12,
              padding: "13px 15px", fontSize: 13, lineHeight: 1.7, color: "var(--fg)", whiteSpace: "pre-wrap",
            }}
          >
            {draft.message}
          </div>
          <NaturalnessNote result={data?.naturalness} />
          <AiCaveat>
            A first draft. Check the facts, put it in your own words, and send it once: a second chase rarely helps.
          </AiCaveat>
        </div>
      )}
    </div>
  );
}
