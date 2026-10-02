"use client";

/**
 * Static answer guides for the Questions tab: how to answer "How do you use AI?",
 * a Past / Present / Future "tell me about yourself", a Good-vs-Great checklist and the
 * recruiter screening-call module. No AI and no store writes; it only reads saved stories
 * so the "tell me about yourself" template can name three real pieces of work.
 *
 * Sources are the TechTalk June 2026 Masterclass (Days 1 and 3) and the recruiter deck;
 * the content lives in `INTERVIEW_PREP` so the prompts and this page cannot drift.
 */

import { INTERVIEW_PREP } from "@/lib/methodology";
import { usePfStore, type SavedStory } from "@/lib/pf/store";
import { Reveal } from "@/components/pf/ui";

const { aim, aiFluency, pastPresentFuture, goodVsGreat, practiceNote, screeningCall, practiceTimings, storyCategories } = INTERVIEW_PREP;

/** Story titles default to the category name, so those are not project names and are skipped. */
const CATEGORY_NAMES = new Set<string>(storyCategories.map((c) => c.name.toLowerCase()));

/** Up to three distinct project names from the student's own saved stories, padded with
 *  brackets so the template never invents one. */
export function projectNamesFromStories(stories: Pick<SavedStory, "title">[], max = 3): string[] {
  const out: string[] = [];
  for (const s of stories) {
    const t = s.title.trim();
    if (!t || CATEGORY_NAMES.has(t.toLowerCase()) || out.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    out.push(t);
    if (out.length === max) break;
  }
  while (out.length < max) out.push(`[Project ${out.length + 1}]`);
  return out;
}

const card = { border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "22px 24px", marginTop: 14 } as const;
const heading = { fontSize: 20, margin: "0 0 3px" } as const;
const sub = { fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, display: "block", maxWidth: "58ch" } as const;
const kicker = { fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", margin: "16px 0 8px" } as const;
const row = { display: "flex", gap: 9, fontSize: 12.5, lineHeight: 1.6, color: "var(--muted)" } as const;
const mark = { color: "var(--accent)", flexShrink: 0 } as const;
const source = { fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "14px 0 0" } as const;

function Items({ items, m = "—" }: { items: readonly string[]; m?: string }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((t) => (
        <li key={t} style={row}><span className="pf-mono" style={mark}>{m}</span><span>{t}</span></li>
      ))}
    </ul>
  );
}

export function AnswerGuides() {
  const stories = usePfStore((s) => s.savedStories);
  const names = projectNamesFromStories(stories);
  const real = names.filter((n) => !n.startsWith("[")).length;

  return (
    <Reveal style={{ maxWidth: 720 }}>
      <section style={card} aria-label="Answer structures">
        <h2 className="pf-display-sm" style={heading}>Answer structures</h2>
        <span style={sub}>
          Two answers come up in almost every first round. Both are short, so practise them to a clock.
        </span>

        <div className="pf-mono" style={kicker}>Tell me about yourself · {pastPresentFuture.duration}</div>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {pastPresentFuture.steps.map((st) => (
            <li key={st.name} style={row}>
              <span className="pf-mono" style={{ ...mark, width: 62 }}>{st.name}</span>
              <span>
                {st.action}
                {st.name === "Present" && (
                  <>
                    {" "}
                    <strong style={{ color: "var(--fg)" }}>{names.join(", ")}</strong>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p style={{ ...sub, marginTop: 8, fontSize: 11.5, color: "var(--faint)" }}>
          {real > 0
            ? `${real} of the three names come from your saved stories. Replace any in brackets with your own.`
            : "Name three pieces of work you can talk about for ten seconds each. Save a story with a project name as its title and it will appear here."}
        </p>

        <div className="pf-mono" style={kicker}>Good vs great</div>
        <p style={{ ...sub, marginBottom: 8 }}>{goodVsGreat.structure}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Good</div>
            <Items items={goodVsGreat.good} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: "var(--strong)" }}>Great</div>
            <Items items={goodVsGreat.great} m="✓" />
          </div>
        </div>

        <div className="pf-mono" style={kicker}>Practise out loud, but don&apos;t over-rehearse</div>
        <p style={{ ...sub, margin: 0 }}>{practiceNote}</p>
        <p style={{ ...sub, margin: "8px 0 0" }}>
          Timings to practise to:{" "}
          {Object.values(practiceTimings).map((t) => `${t.duration} (${t.use.toLowerCase()})`).join("; ")}.
        </p>
        <p style={source}>Source: TechTalk June 2026 Masterclass, Day 3.</p>
      </section>

      <section style={card} aria-label="How do you use AI">
        <h2 className="pf-display-sm" style={heading}>&quot;How do you use AI in your work?&quot;</h2>
        <span style={sub}>
          Expect it. Employers are asking some version of &quot;{aim.question}&quot; Use AIM, and have a real example behind it.
        </span>
        <ol style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {aim.steps.map((st) => (
            <li key={st.letter} style={row}>
              <span className="pf-mono" style={{ ...mark, width: 18, fontWeight: 700 }}>{st.letter}</span>
              <span><strong style={{ color: "var(--fg)" }}>{st.name}.</strong> {st.action}</span>
            </li>
          ))}
        </ol>
        <p style={{ ...sub, marginTop: 10 }}>{aim.caution}</p>
        <p style={{ ...sub, marginTop: 8 }}>
          Save the example as an <strong style={{ color: "var(--fg)" }}>AI usage</strong> story in the STARL tab, then say it out loud in {practiceTimings.brief.duration}.
        </p>

        <div className="pf-mono" style={kicker}>What fluent looks like</div>
        <p style={{ ...sub, marginBottom: 8 }}>
          A self-check against the four components, with the Capable-level evidence. Can you say each one about your own work, truthfully?
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {aiFluency.components.map((c) => (
            <li key={c.id} style={row}>
              <span className="pf-mono" style={{ ...mark, width: 104, fontWeight: 700 }}>{c.name}</span>
              <span>
                <span style={{ color: "var(--faint)" }}>{c.meaning}.</span>
                <br />
                {c.capable}
              </span>
            </li>
          ))}
        </ul>
        <p style={{ ...sub, marginTop: 12, fontSize: 11.5, color: "var(--faint)" }}>
          The rubric runs from {aiFluency.levels.map((l) => l.name).join(", ")}. {aiFluency.levels[0].name} means: {aiFluency.levels[0].heading.toLowerCase()}.
          The two upper levels are left out here because the slide detail was not legible.
        </p>
        <p style={source}>Source: {aiFluency.credit}.</p>
      </section>

      <section style={card} aria-label="Recruiter screening call">
        <h2 className="pf-display-sm" style={heading}>The recruiter screening call</h2>
        <span style={sub}>{screeningCall.purpose}</span>

        <div className="pf-mono" style={kicker}>Why people fail it</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {screeningCall.failureModes.map((f) => (
            <li key={f.name} style={row}>
              <span className="pf-mono" style={{ ...mark, width: 128, fontWeight: 700 }}>{f.name}</span>
              <span>{f.detail}</span>
            </li>
          ))}
        </ul>

        <div className="pf-mono" style={kicker}>Prepare these three, every time</div>
        <Items items={screeningCall.alwaysPrepare} m="?" />

        <div className="pf-mono" style={kicker}>How to deliver your answers</div>
        <Items items={screeningCall.delivery} />
        <p style={source}>Source: TechTalk, What Recruiters Are Really Looking For.</p>
      </section>
    </Reveal>
  );
}
