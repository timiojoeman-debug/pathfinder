"use client";

/**
 * Static networking guidance from the TechTalk decks: the in-person events
 * playbook, the Role / Bridge / Problem one-liners, the who-to-ask matrix and
 * the nine personalisation signals. Nothing here calls AI or moves a progress
 * number: it is reference content, and the signals tick-boxes are local to the
 * visit.
 */

import { useState } from "react";
import { EVENT_PLAYBOOK } from "@/lib/pf/data";
import { composeOneLiners } from "@/lib/pf/logic";
import { NETWORKING_STRATEGY } from "@/lib/methodology";
import { usePfStore } from "@/lib/pf/store";
import { Panel } from "@/components/pf/ui";

const mono = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", ...extra,
});
const cell: React.CSSProperties = { border: "1px solid var(--line2)", borderRadius: 12, background: "var(--panel2)", padding: "14px 16px" };
const small: React.CSSProperties = { fontSize: 12, color: "var(--muted)", lineHeight: 1.55 };

export function EventsPlaybook() {
  const e = EVENT_PLAYBOOK;
  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <details>
        <summary style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 className="pf-display-sm" style={{ fontSize: 21, margin: 0, display: "inline" }}>Networking at events</h2>
          <span className="pf-mono" style={mono({ fontSize: 10 })}>in person · from finding the room to the follow-up</span>
        </summary>
        <p style={{ ...small, margin: "12px 0 16px" }}>
          You are probably not bad at talking to people; you may just not know what to do once you are in the room.
          The numbers below are TechTalk rules of thumb, not research.
        </p>

        <div className="pf-mono" style={mono({ marginBottom: 8 })}>1 · Where the events are</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 18 }}>
          {e.finding.map((g) => (
            <div key={g.group} style={cell}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{g.group}</div>
              <div style={small}>{g.items.join(", ")}</div>
            </div>
          ))}
        </div>

        <div className="pf-mono" style={mono({ marginBottom: 8 })}>2 · Which ones are worth going to</div>
        <ul style={{ ...small, margin: "0 0 18px", paddingLeft: 18 }}>
          {e.worthGoing.map((t) => <li key={t}>{t}</li>)}
        </ul>

        <div className="pf-mono" style={mono({ marginBottom: 8 })}>3 · Fifteen minutes of prep</div>
        <div style={{ marginBottom: 18 }}>
          {e.prep.map((p, i) => (
            <div key={p.step} style={{ display: "flex", gap: 10, padding: "4px 0" }}>
              <span className="pf-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{i + 1}</span>
              <span style={small}><strong style={{ color: "var(--fg)" }}>{p.step}.</strong> {p.note}</span>
            </div>
          ))}
        </div>

        <div className="pf-mono" style={mono({ marginBottom: 8 })}>4 · Six openers that are not small talk</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginBottom: 18 }}>
          {e.openers.map((o) => (
            <div key={o} style={{ ...cell, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.5, fontStyle: "italic" }}>“{o}”</div>
          ))}
        </div>

        <div className="pf-mono" style={mono({ marginBottom: 8 })}>5 · How to leave a conversation</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginBottom: 8 }}>
          {e.exits.map((o) => (
            <div key={o} style={{ ...cell, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.5, fontStyle: "italic" }}>“{o}”</div>
          ))}
        </div>
        <p style={{ ...small, margin: "0 0 18px" }}>{e.exitTip}</p>

        <div className="pf-mono" style={mono({ marginBottom: 8 })}>6 · The follow-up ladder · the longer you wait, the faster you are forgotten</div>
        {e.followUp.map((f, i) => (
          <div key={f.when} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line2)" }}>
            <span className="pf-mono" style={{ width: 22, height: 22, borderRadius: 7, background: f.now ? "var(--accent)" : "var(--panel3)", color: f.now ? "var(--onAccent)" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f.when}{f.now ? "" : " (keep showing up)"}</div>
              <div style={small}>{f.note}</div>
            </div>
          </div>
        ))}
      </details>
    </Panel>
  );
}

/** The three one-liner templates, composed from the student's direction answers. */
export function OneLinerCard() {
  const dirRole = usePfStore((s) => s.dirRole);
  const dirStack = usePfStore((s) => s.dirStack);
  const dirIndustry = usePfStore((s) => s.dirIndustry);
  const lines = composeOneLiners({ dirRole, dirStack, dirIndustry });
  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 className="pf-display-sm" style={{ fontSize: 21, margin: 0 }}>Your one-liner</h2>
        <span className="pf-mono" style={mono({ fontSize: 10 })}>role · bridge · problem</span>
      </div>
      <p style={{ ...small, margin: "0 0 14px" }}>
        Built from your Direction answers. Anything in [brackets] is something only you know: fill it in, then say it out loud.
        Pick the one that fits you; the other two are for other situations.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        {lines.map((l) => (
          <div key={l.id} style={cell}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</span>
              <span className="pf-mono" style={mono({ marginLeft: "auto" })}>best for: {l.bestFor}</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--fg)", marginBottom: 6 }}>{l.line}</div>
            <div className="pf-mono" style={mono({ textTransform: "none", letterSpacing: 0 })}>{l.template}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const yn = (v: boolean) => (v ? "Yes" : "No");

/** Above / below the line: who can give what. Nobody is asked for a job. */
export function WhoToAskMatrix() {
  const rows = NETWORKING_STRATEGY.whoToAsk;
  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 className="pf-display-sm" style={{ fontSize: 21, margin: 0 }}>Who to ask for what</h2>
        <span className="pf-mono" style={mono({ fontSize: 10 })}>nobody here is asked for a job</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 520 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--faint)" }}>
              {["Who", "Decision power", "Referral", "Insight", "Approach", "What to ask"].map((h) => (
                <th key={h} className="pf-mono" style={{ ...mono(), padding: "8px 10px 8px 0", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.who} style={{ borderTop: "1px solid var(--line2)", verticalAlign: "top" }}>
                <td style={{ padding: "10px 10px 10px 0", fontWeight: 700 }}>{r.who}</td>
                <td style={{ padding: "10px 10px 10px 0", color: "var(--muted)" }}>{r.line === "above" ? "Above the line" : "Below the line"}</td>
                <td style={{ padding: "10px 10px 10px 0", color: r.referral ? "var(--strong)" : "var(--risk)", fontWeight: 600 }}>{yn(r.referral)}</td>
                <td style={{ padding: "10px 10px 10px 0", color: r.insight ? "var(--strong)" : "var(--muted)", fontWeight: 600 }}>{yn(r.insight)}</td>
                <td style={{ padding: "10px 10px 10px 0", color: "var(--muted)" }}>{r.style}</td>
                <td style={{ padding: "10px 0", color: "var(--muted)", lineHeight: 1.5 }}>{r.ask}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** The nine things worth noticing on a profile. Ticks are local: they are a prompt for you, not progress. */
export function SignalsChecklist() {
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const signals = NETWORKING_STRATEGY.personalisationSignals;
  return (
    <Panel style={{ padding: "20px 22px", marginBottom: 18 }}>
      <h2 className="pf-display-sm" style={{ fontSize: 18, margin: "0 0 4px" }}>Nine things to look for</h2>
      <p style={{ ...small, margin: "0 0 10px" }}>Scan their profile for these, then mention the one or two you really noticed.</p>
      {signals.map((x) => (
        <label key={x.signal} style={{ display: "flex", gap: 9, padding: "5px 0", cursor: "pointer", alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={!!seen[x.signal]}
            onChange={(e) => setSeen((p) => ({ ...p, [x.signal]: e.target.checked }))}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>
            <strong>{x.signal}</strong>
            <span style={{ color: "var(--muted)" }}>: {x.look}</span>
          </span>
        </label>
      ))}
    </Panel>
  );
}
