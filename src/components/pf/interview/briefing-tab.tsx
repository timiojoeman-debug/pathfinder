"use client";

/**
 * Company research briefing. The company comes from a saved opportunity or a
 * tracker card where one exists, and can be typed otherwise — a student
 * interviewing somewhere they never saved should not be locked out of prep.
 * The tracker's "Prep" action hands a company over through `ivBriefingFor`.
 * The last briefing per company is kept in the store, so it survives a reload.
 *
 * The prompt asks the model to flag its own uncertainty about a company's tech
 * stack, and that flag is surfaced rather than hidden: a confident-looking list
 * of technologies a company may not use is worse than no list at all.
 */

import { useEffect, useMemo, useState } from "react";
import { usePfStore, useProfile, type SavedBriefing } from "@/lib/pf/store";
import { studentProfileLine } from "@/lib/pf/ai-context";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

type BriefingData = SavedBriefing["data"];

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

export function BriefingTab() {
  const savedJobs = usePfStore((s) => s.savedJobs);
  const board = usePfStore((s) => s.board);
  const ivBriefings = usePfStore((s) => s.ivBriefings);
  const briefingFor = usePfStore((s) => s.ivBriefingFor);
  const saveBriefing = usePfStore((s) => s.saveBriefing);
  const setStore = usePfStore((s) => s.set);
  const emit = usePfStore((s) => s.emit);
  const profile = useProfile();

  const [company, setCompany] = useState(briefingFor?.company ?? "");
  const [role, setRole] = useState(briefingFor?.role ?? "");

  // The hand-over from the tracker is read once, into the fields above.
  useEffect(() => {
    if (briefingFor) setStore({ ivBriefingFor: null });
  }, [briefingFor, setStore]);

  const { loading, error, needsAuth, run } = useAiTask<AiEnvelope<BriefingData>>(
    "/api/interview/company-briefing",
  );

  const trimmedCompany = company.trim();
  // Shown from the store, so the last briefing for this company is there after a reload.
  const saved = ivBriefings[trimmedCompany.toLowerCase()] ?? null;
  const brief = saved?.data;

  /** Saved jobs and tracker cards, one chip per company and role. */
  const picks = useMemo(() => {
    const seen = new Set<string>();
    const out: { company: string; role: string }[] = [];
    for (const x of [...board.flatMap((col) => (col.id === "rejected" ? [] : col.cards)), ...savedJobs]) {
      const k = `${x.company.toLowerCase()}::${x.role.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ company: x.company, role: x.role });
    }
    return out;
  }, [board, savedJobs]);

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
      studentProfile: studentProfileLine(profile),
    });
    if (result?.data?.companyOverview) {
      saveBriefing({ company: trimmedCompany, role: roleName, data: result.data });
      emit("AiConsulted", "interview", `Researched ${trimmedCompany} for ${roleName}`);
    }
  };

  return (
    <Reveal style={{ maxWidth: 720 }}>
      <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px" }}>
        <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 3px" }}>Company briefing</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "52ch" }}>
          What they do, what they value, and three angles for &quot;why this company?&quot; that connect to your actual work — plus questions worth asking back.
        </span>

        {picks.length > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 15 }}>
            {picks.map((j) => {
              const on = trimmedCompany.toLowerCase() === j.company.toLowerCase() && role.trim().toLowerCase() === j.role.toLowerCase();
              return (
                <button
                  key={j.company + j.role}
                  onClick={() => pickSaved(j.company, j.role)}
                  title={j.role}
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

      {saved && brief && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{saved.company}</div>
          <div className="pf-mono" style={{ fontSize: 10, color: "var(--faint)", margin: "2px 0 8px" }}>
            {saved.role} · generated {new Date(saved.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </div>
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
