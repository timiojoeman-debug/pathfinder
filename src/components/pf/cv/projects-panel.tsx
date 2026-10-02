"use client";

/**
 * AI project ideas that close the gaps the CV analysis actually found.
 *
 * The gaps are read from the derived profile rather than typed, because a
 * student who could list their own skill gaps precisely would not need this
 * panel. When there are no gaps recorded yet the button stays disabled and says
 * why — the route's own prompt degrades into generic advice on an empty gap
 * list, and generic project ideas are the thing this feature exists to avoid.
 *
 * On success this sets `cvProjects`, which is what `projectsPct` in progress.ts
 * reads as "portfolio projects planned". That is the honest claim: a plan
 * exists. It stays well short of claiming anything has been built.
 */

import { useState } from "react";
import { usePfStore, useProfile } from "@/lib/pf/store";
import { useAiTask, type AiEnvelope } from "@/lib/pf/use-ai";
import { Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiList, AiSection, AiTag, GenerateButton } from "@/components/pf/ai-panel";

const mono = "'JetBrains Mono',monospace";

interface ProjectIdea {
  title: string;
  description?: string;
  problemItSolves?: string;
  techStack?: string[];
  keyFeatures?: string[];
  weeklyPlan?: { week: number; milestone: string; tasks?: string[] }[];
  qualityChecklist?: { quality: string; howToMeet: string }[];
  talkingPoints?: string[];
}

interface ProjectsData {
  projects?: ProjectIdea[];
}

export function ProjectsPanel() {
  const emit = usePfStore((s) => s.emit);
  const set = usePfStore((s) => s.set);
  const profile = useProfile();

  const [open, setOpen] = useState<string | null>(null);

  const { data, loading, error, needsAuth, run } = useAiTask<AiEnvelope<ProjectsData>>(
    "/api/project-builder/generate",
  );
  const projects = data?.data?.projects ?? [];

  const gaps = profile.missingSkills;
  const hasGaps = gaps.length > 0;

  const generate = async () => {
    const result = await run({
      // The route destructures `skillGaps` — `missingSkills` is silently ignored.
      skillGaps: gaps,
      existingSkills: profile.currentSkills,
      targetRole: profile.targetRole ? `${profile.targetRole} Intern` : "Software Engineering Intern",
    });
    if (result?.data?.projects?.length) {
      set({ cvProjects: true });
      emit("ProjectGenerated", "cv", `Planned ${result.data.projects.length} projects to close ${gaps.length} skill gaps`);
    }
  };

  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginBottom: 18 }}>
      <h2 className="pf-display-sm" style={{ fontSize: 22, margin: "0 0 3px" }}>Project ideas that close your gaps</h2>
      <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "54ch" }}>
        Three projects built around the keywords your CV is missing, each with a four-week plan and
        the points worth raising in an interview.
      </span>

      {hasGaps && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
          {gaps.slice(0, 10).map((g) => <AiTag key={g} tone="var(--warn)">{g}</AiTag>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 13 }}>
        <GenerateButton onClick={generate} loading={loading} disabled={!hasGaps} loadingLabel="Designing…">
          {projects.length ? "Regenerate ideas" : "Generate project ideas"}
        </GenerateButton>
        {!hasGaps && (
          <span style={{ fontSize: 11.5, color: "var(--faint)", maxWidth: "40ch", lineHeight: 1.5 }}>
            No skill gaps recorded yet. Set your direction and analyse your CV first. Without gaps
            this returns generic ideas.
          </span>
        )}
      </div>

      <AiError message={error} needsAuth={needsAuth} />

      {projects.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
          {projects.map((p) => {
            const on = open === p.title;
            return (
              <div key={p.title} style={{ border: "1px solid var(--line)", borderRadius: 13, background: "var(--panel2)", overflow: "hidden" }}>
                <button
                  onClick={() => setOpen(on ? null : p.title)}
                  aria-expanded={on}
                  style={{
                    cursor: "pointer", width: "100%", textAlign: "left", border: "none", background: "transparent",
                    padding: "15px 17px", display: "flex", gap: 11, alignItems: "flex-start", color: "var(--fg)",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{on ? "▾" : "▸"}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{p.title}</span>
                    {p.description && (
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>{p.description}</span>
                    )}
                  </span>
                </button>

                {on && (
                  <div style={{ padding: "0 17px 17px", borderTop: "1px solid var(--line2)" }}>
                    {p.problemItSolves && (
                      <AiSection title="The problem it solves">
                        <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{p.problemItSolves}</p>
                      </AiSection>
                    )}

                    {p.techStack?.length ? (
                      <AiSection title="Stack">
                        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                          {p.techStack.map((t) => <AiTag key={t} tone="var(--active)">{t}</AiTag>)}
                        </div>
                      </AiSection>
                    ) : null}

                    {p.keyFeatures?.length ? (
                      <AiSection title="Key features"><AiList items={p.keyFeatures} /></AiSection>
                    ) : null}

                    {p.weeklyPlan?.length ? (
                      <AiSection title="Four-week plan">
                        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                          {p.weeklyPlan.map((w) => (
                            <div key={w.week} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                              <span
                                className="pf-mono"
                                style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700, color: "var(--accent)", flexShrink: 0, paddingTop: 2, fontFamily: mono }}
                              >
                                W{w.week}
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{w.milestone}</span>
                                <AiList items={w.tasks} marker="·" />
                              </span>
                            </div>
                          ))}
                        </div>
                      </AiSection>
                    ) : null}

                    {p.qualityChecklist?.length ? (
                      <AiSection title="What makes it stand out">
                        <AiList items={p.qualityChecklist.map((q) => `${q.quality}: ${q.howToMeet}`)} />
                      </AiSection>
                    ) : null}

                    {p.talkingPoints?.length ? (
                      <AiSection title="Interview talking points"><AiList items={p.talkingPoints} /></AiSection>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          <AiCaveat>
            These are starting points, not specifications. Scope each one down to what you can
            actually finish. A small project you built and can explain beats an ambitious one you
            abandoned.
          </AiCaveat>
        </div>
      )}
    </Reveal>
  );
}
