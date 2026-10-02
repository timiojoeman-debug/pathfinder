"use client";

/**
 * Static guidance on a gap in the CV (TechTalk recruiter deck, slides 015-018).
 * No AI and no state: the bands and labels are the speaker's rules of thumb.
 */

import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiList, AiSection, AiTag } from "@/components/pf/ai-panel";
import { CAREER_GAP } from "@/lib/methodology/recruiter-signals";

export function CareerGapCard() {
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 18 }}>
      <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 3px" }}>If your CV has a gap</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch" }}>
        A gap year, a break after a placement or time out for any reason. How much it matters depends on its length.
      </span>

      <AiSection title="How much the length matters">
        <AiList items={CAREER_GAP.bands.map((b) => `${b.range}: ${b.advice}`)} />
      </AiSection>

      <AiSection title="Over six months, give it a title on your CV">
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {CAREER_GAP.labels.map((l) => <AiTag key={l}>{l}</AiTag>)}
        </div>
      </AiSection>

      <AiSection title="Explaining it in an interview">
        <AiList items={[...CAREER_GAP.interview]} />
      </AiSection>

      <AiCaveat>
        These are one recruiter&apos;s rules of thumb from a TechTalk session, not a measured
        threshold. Say what is true: only name three things you really did.
      </AiCaveat>
    </Reveal>
  );
}
