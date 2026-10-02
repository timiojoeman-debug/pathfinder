"use client";

/**
 * "Draft follow-up" for a tracked application, in the application drawer.
 *
 * Uses `/api/network/follow-up` with `kind: "application"`, which has its own
 * prompt: the coffee-chat cadence assumes a conversation already happened, and
 * an application follow-up must never imply one. Drafting is not sending, so
 * the nudge only clears when the student marks the follow-up as sent.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { AiCaveat, AiError, GenerateButton } from "@/components/pf/ai-panel";
import { NaturalnessNote, type Naturalness } from "@/components/pf/networking/naturalness-note";

interface FollowUpData {
  message?: string;
}

const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

export function FollowUpDraft({
  cardKey, company, role, appliedDate, followedUpAt, note,
}: { cardKey: string; company: string; role: string; appliedDate?: number; followedUpAt?: number; note: string }) {
  const emit = usePfStore((s) => s.emit);
  const markFollowedUp = usePfStore((s) => s.markFollowedUp);
  const [contact, setContact] = useState("");
  const { data, loading, error, needsAuth, run } = useAiTask<AiEnvelope<FollowUpData> & { naturalness?: Naturalness }>(
    "/api/network/follow-up",
  );
  const draft = data?.data;

  const generate = async () => {
    const res = await run({
      kind: "application",
      company,
      role,
      ...(contact.trim() ? { contactName: contact.trim() } : {}),
      ...(appliedDate ? { appliedOn: fmt(appliedDate) } : {}),
      chatNotes: note,
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button
          onClick={() => markFollowedUp(cardKey)}
          style={{ cursor: "pointer", height: 34, padding: "0 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel2)", color: "var(--fg)", fontSize: 12.5, fontWeight: 600 }}
        >
          Mark follow-up sent
        </button>
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
          {followedUpAt ? `Last followed up ${fmt(followedUpAt)}.` : "Clears the follow-up nudge for two weeks."}
        </span>
      </div>
    </div>
  );
}
