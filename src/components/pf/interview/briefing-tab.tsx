"use client";

/**
 * Company research briefing. The company comes from a saved opportunity where
 * one exists, and can be typed otherwise — a student interviewing somewhere
 * they never saved should not be locked out of prep.
 *
 * The prompt asks the model to flag its own uncertainty about a company's tech
 * stack, and that flag is surfaced rather than hidden: a confident-looking list
 * of technologies a company may not use is worse than no list at all.
 */

import { useState } from "react";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

interface BriefingData {
  companyOverview?: string;
  techStack?: string[];
  techStackConfidence?: "high" | "medium" | "low";
  values?: string[];
  whyThisCompany?: string[];
  questionsToAsk?: string[];
  uncertainties?: string[];
}

const CONFIDENCE_TONE = {
  high: "var(--strong)",
  medium: "var(--warn)",
  low: "var(--risk)",
} as const;

/** Each level gets its own instruction. Collapsing medium into the "low"
 *  warning made a usable list read as untrustworthy, and collapsing it into
 *  "high" would do the opposite — which is the failure that actually costs a
 *  student credibility in the room. */
const CONFIDENCE_NOTE = {
  high: "Well documented publicly — still worth confirming on their engineering blog.",
  medium: "Partly inferred. Confirm the specifics on their engineering blog before quoting any of it.",
  low: "Low confidence. Verify on their engineering blog or careers page before you rely on any of this.",
} as const;

/** One line describing who is asking, so "why this company" lands on the
 *  student's real skills instead of generic flattery. */
function studentProfileLine(
  role: string | null,
  skills: string[],
  leetSolved: number,
): string {
  const bits = [
    role ? `Targeting ${role} internships` : "University student targeting software internships",
    skills.length ? `Skills: ${skills.slice(0, 8).join(", ")}` : null,
    leetSolved > 0 ? `${leetSolved} technical problems solved` : null,
  ].filter(Boolean);
  return bits.join(". ") + ".";
}

export function BriefingTab() {
  const savedJobs = usePfStore((s) => s.savedJobs);
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const { data, loading, error, needsAuth, run } = useAiTask<AiEnvelope<BriefingData>>(
    "/api/interview/company-briefing",
  );
  const brief = data?.data;

  const trimmedCompany = company.trim();

  const pickSaved = (c: string, r: string) => {
    setCompany(c);
    setRole(r);
  };

  const generate = async () => {
    if (!trimmedCompany) return;
    const roleName = role.trim() || (profile.targetRole ? `${profile.targetRole} Intern` : "internship");
    const result = await run({
      companyName: trimmedCompany,
      roleName,
      studentProfile: studentProfileLine(profile.targetRole, profile.currentSkills, profile.leetSolved),
    });
    if (result?.data?.companyOverview) {
      emit("AiConsulted", "interview", `Researched ${trimmedCompany} for ${roleName}`);
    }
  };

  return (
    <Reveal style={{ maxWidth: 720 }}>
      <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>Company briefing</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "52ch" }}>
          What they do, what they value, and three angles for &quot;why this company?&quot; that connect to your actual work — plus questions worth asking back.
        </span>

        {savedJobs.length > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 15 }}>
            {savedJobs.map((j) => {
              const on = trimmedCompany.toLowerCase() === j.company.toLowerCase();
              return (
                <button
                  key={j.company + j.role}
                  onClick={() => pickSaved(j.company, j.role)}
                  style={{
                    cursor: "pointer", height: 32, padding: "0 13px", borderRadius: 9,
                    border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                    background: on ? "var(--accentSoft)" : "var(--panel2)",
                    color: on ? "var(--accentText)" : "var(--muted)",
                    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                    transition: "all .2s var(--ease)",
                  }}
                >
                  {j.company}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            className="pf-input"
            style={{ height: 44, padding: "0 15px", flex: "1 1 200px", minWidth: 0 }}
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={profile.targetRole ? `${profile.targetRole} Intern` : "Role (optional)"}
            className="pf-input"
            style={{ height: 44, padding: "0 15px", flex: "1 1 200px", minWidth: 0 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <GenerateButton
            onClick={generate}
            loading={loading}
            disabled={!trimmedCompany}
            loadingLabel="Researching…"
          >
            {brief ? "Regenerate briefing" : "Generate briefing"}
          </GenerateButton>
        </div>

        <AiError message={error} needsAuth={needsAuth} />
      </div>

      {brief && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{trimmedCompany}</div>
          {brief.companyOverview && (
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{brief.companyOverview}</p>
          )}

          {brief.techStack?.length ? (
            <AiSection title="Likely tech stack">
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 9 }}>
                {brief.techStack.map((t) => (
                  <AiTag key={t} tone="var(--active)">{t}</AiTag>
                ))}
              </div>
              {brief.techStackConfidence && (
                <div style={{ fontSize: 11.5, color: CONFIDENCE_TONE[brief.techStackConfidence] ?? "var(--faint)", lineHeight: 1.5 }}>
                  {CONFIDENCE_NOTE[brief.techStackConfidence]}
                </div>
              )}
            </AiSection>
          ) : null}

          {brief.values?.length ? (
            <AiSection title="What they value"><AiList items={brief.values} /></AiSection>
          ) : null}

          {brief.whyThisCompany?.length ? (
            <AiSection title={'Your angle on "why this company?"'}><AiList items={brief.whyThisCompany} /></AiSection>
          ) : null}

          {brief.questionsToAsk?.length ? (
            <AiSection title="Questions to ask them"><AiList items={brief.questionsToAsk} marker="?" /></AiSection>
          ) : null}

          {brief.uncertainties?.length ? (
            <AiSection title="Verify before you use it"><AiList items={brief.uncertainties} marker="!" /></AiSection>
          ) : null}

          <AiCaveat>
            Generated from public knowledge, which goes stale and is sometimes wrong. Check anything you plan to say out loud against their site.
          </AiCaveat>
        </div>
      )}
    </Reveal>
  );
}
