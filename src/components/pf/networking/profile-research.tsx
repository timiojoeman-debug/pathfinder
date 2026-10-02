"use client";

/**
 * Research a specific person before you reach out to them.
 *
 * The student pastes what they can see on the target's public profile
 * (LinkedIn, Glassdoor, a company bio) and gets back the genuine common ground
 * and outreach angles that profile supports. This is the "prep" that makes the
 * outreach and coffee-chat tools land — cold outreach with no research is the
 * thing this whole phase exists to replace.
 *
 * It is deliberately paste-in rather than fetch-by-URL: the app does not scrape
 * profiles, and asking a model to describe a LinkedIn page from a URL alone is
 * how you get invented facts about a real person. It reads only what the
 * student actually pasted, and the route now fails visibly rather than serving
 * generic angles when the model is down.
 */

import { useState } from "react";
import { usePfStore } from "@/lib/pf/store";
import { useAiTask } from "@/lib/pf/use-ai";
import { Panel } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, GenerateButton } from "@/components/pf/ai-panel";

export interface AnalysisData {
  summary?: string;
  connectionPoints?: string[];
  outreachAngles?: string[];
  conversationStarters?: string[];
}

export interface ResearchContact {
  name: string;
  company: string;
  about: string;
  experience: string;
}

const EMPTY_CONTACT: ResearchContact = { name: "", company: "", about: "", experience: "" };

interface ProfileResearchProps {
  /** When provided, the contact fields are controlled by the parent so the
   *  outreach generator can share the same person. Omitted → internal state. */
  contact?: ResearchContact;
  onContactChange?: (contact: ResearchContact) => void;
  /** Fired when a research result comes back, so the parent can personalise
   *  the outreach message from the same findings. */
  onResult?: (payload: { contact: ResearchContact; data: AnalysisData }) => void;
}

export function ProfileResearch({ contact, onContactChange, onResult }: ProfileResearchProps = {}) {
  const emit = usePfStore((s) => s.emit);

  const [internal, setInternal] = useState<ResearchContact>(EMPTY_CONTACT);
  const c = contact ?? internal;
  const update = (patch: Partial<ResearchContact>) => {
    const next = { ...c, ...patch };
    if (onContactChange) onContactChange(next);
    else setInternal(next);
  };

  const { data, loading, error, needsAuth, run } = useAiTask<AnalysisData>(
    "/api/networking/analyze-profile",
  );

  const hasContent = c.about.trim().length > 0 || c.experience.trim().length > 0;

  const analyse = async () => {
    if (!hasContent) return;
    const result = await run({
      recipientName: c.name.trim() || undefined,
      company: c.company.trim() || undefined,
      about: c.about.trim() || undefined,
      experience: c.experience.trim() || undefined,
    });
    if (result?.summary) {
      emit("AiConsulted", "networking", `Researched ${c.name.trim() || "a contact"} before outreach`, { kind: "profile-research" });
      onResult?.({ contact: c, data: result });
    }
  };

  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <h2 className="pf-display-sm" style={{ fontSize: 21, margin: "0 0 3px" }}>Research a contact</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "58ch" }}>
        Paste what you can see on their profile. The real common ground you find is what turns a cold
        message into a reply.
      </span>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 15 }}>
        <input
          value={c.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Their name (optional)"
          className="pf-input"
          style={{ height: 44, padding: "0 15px", flex: "1 1 180px", minWidth: 0 }}
        />
        <input
          value={c.company}
          onChange={(e) => update({ company: e.target.value })}
          placeholder="Company (optional)"
          className="pf-input"
          style={{ height: 44, padding: "0 15px", flex: "1 1 180px", minWidth: 0 }}
        />
      </div>

      <textarea
        value={c.about}
        onChange={(e) => update({ about: e.target.value })}
        placeholder="Their About / bio: include their school, degree, and current role if you can see them…"
        className="pf-input"
        style={{ width: "100%", minHeight: 80, marginTop: 10, padding: "12px 15px", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
      />
      <textarea
        value={c.experience}
        onChange={(e) => update({ experience: e.target.value })}
        placeholder="Their experience / recent roles: past companies, projects, anything you could genuinely connect on…"
        className="pf-input"
        style={{ width: "100%", minHeight: 80, marginTop: 10, padding: "12px 15px", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <GenerateButton onClick={analyse} loading={loading} disabled={!hasContent} loadingLabel="Reading…">
          {data ? "Re-analyse" : "Find the angles"}
        </GenerateButton>
        {!hasContent && (
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Paste their About or experience first.</span>
        )}
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {data && (
        <div style={{ marginTop: 18 }}>
          {data.summary && (
            <AiSection title="In short">
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{data.summary}</p>
            </AiSection>
          )}
          {data.connectionPoints?.length ? (
            <AiSection title="Common ground"><AiList items={data.connectionPoints} /></AiSection>
          ) : null}
          {data.outreachAngles?.length ? (
            <AiSection title="Angles worth opening on"><AiList items={data.outreachAngles} /></AiSection>
          ) : null}
          {data.conversationStarters?.length ? (
            <AiSection title="Questions to ask"><AiList items={data.conversationStarters} marker="?" /></AiSection>
          ) : null}

          <AiCaveat>
            Drawn only from what you pasted, so check every &quot;shared&quot; point is real before you
            lean on it. Nothing lands worse than a connection you invented.
          </AiCaveat>
        </div>
      )}
    </Panel>
  );
}
