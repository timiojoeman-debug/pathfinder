"use client";

/**
 * Phase 06 — Application Tracking. Weekly cadence, projected callback rate,
 * conversion funnel with leak diagnosis, rejection-pattern insight, and the
 * five-stage drag-and-drop kanban board.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent, type FormEvent } from "react";
import { DIAG_FIX, REJECTION_DIAGNOSIS, type BoardColumn } from "@/lib/pf/data";
import { callbackSummary, cardWhen, dominantRejectionTiming, formatReminder, isoToday, rejectionInsight, trackerDerived } from "@/lib/pf/logic";
import { usePfStore } from "@/lib/pf/store";
import { PageHeader, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";

/** Add an application by hand: one the student found outside Opportunity Discovery. */
function AddApplication() {
  const board = usePfStore((s) => s.board);
  const addCard = usePfStore((s) => s.addCard);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [column, setColumn] = useState<BoardColumn["id"]>("applied");
  const [link, setLink] = useState("");
  const [appliedOn, setAppliedOn] = useState(isoToday());
  const [msg, setMsg] = useState<string | null>(null);

  const ready = company.trim().length > 0 && role.trim().length > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      setMsg("The link needs to start with http:// or https://.");
      return;
    }
    if (!addCard({ company, role, column, link, appliedOn: column === "saved" ? undefined : appliedOn })) {
      setMsg(`${company.trim()} · ${role.trim()} is already on the board.`);
      return;
    }
    setMsg(null);
    setCompany("");
    setRole("");
    setLink("");
  };

  const field = { height: 40, padding: "0 13px", fontSize: 13, minWidth: 0 } as const;
  return (
    <Reveal style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel)", padding: "16px 20px", marginBottom: 14 }}>
      <form onSubmit={submit} aria-label="Add an application" style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, marginRight: 4 }}>Add an application</span>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" aria-label="Company" className="pf-input" style={{ ...field, flex: "1 1 140px" }} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" aria-label="Role" className="pf-input" style={{ ...field, flex: "1 1 160px" }} />
        <select value={column} onChange={(e) => setColumn(e.target.value as BoardColumn["id"])} aria-label="Stage" className="pf-input" style={{ ...field, flex: "0 0 auto" }}>
          {board.map((col) => <option key={col.id} value={col.id}>{col.title}</option>)}
        </select>
        {column !== "saved" && (
          <input type="date" value={appliedOn} max={isoToday()} onChange={(e) => setAppliedOn(e.target.value)} aria-label="Applied on" title="When you applied" className="pf-input" style={{ ...field, flex: "0 0 auto" }} />
        )}
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link to the posting (optional)" aria-label="Link" className="pf-input" style={{ ...field, flex: "2 1 200px" }} />
        <button
          type="submit"
          disabled={!ready}
          style={{ cursor: ready ? "pointer" : "default", height: 40, padding: "0 16px", borderRadius: 10, border: "none", background: ready ? "var(--accent)" : "var(--panel3)", color: "#F7F1E4", fontSize: 13, fontWeight: 600 }}
        >
          Add
        </button>
      </form>
      {msg && <div role="status" style={{ fontSize: 12, color: "var(--warn)", marginTop: 8 }}>{msg}</div>}
    </Reveal>
  );
}

export default function TrackerPage() {
  const s = usePfStore();
  const router = useRouter();
  const d = trackerDerived(s.board, s.netSent);
  const callback = callbackSummary(d.submitted, d.interviews);
  const insight = rejectionInsight(s.diags, REJECTION_DIAGNOSIS);
  const dominant = dominantRejectionTiming(s.diags);
  const fix = dominant ? DIAG_FIX[dominant.timing] : undefined;

  /** Open the Briefing tab on the Interview page with this company already picked. */
  const prep = (company: string, role: string) => {
    s.set({ ivTab: "briefing", ivBriefingFor: { company, role } });
    router.push("/interview");
  };

  const onCardDragStart = (e: DragEvent, key: string) => {
    e.dataTransfer.setData("text/plain", key);
  };

  return (
    <div>
      <PageHeader label="Phase 06 · Momentum" title="Application Tracking">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "56ch" }}>
          One calm board so nothing slips. Rejection timing is <span style={{ color: "var(--fg)", fontWeight: 600 }}>diagnostic data</span> — minutes mean ATS, days mean positioning.
        </p>
      </PageHeader>

      <NextStep />

      <Reveal style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 14, marginBottom: 14 }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>This week</span>
            <span className="pf-mono" style={{ fontSize: 13, fontWeight: 700, color: d.weeklyTone }}>{d.weeklyCount} / {d.weeklyGoal}</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: "var(--panel3)", overflow: "hidden", marginBottom: 10 }}>
            <div className="pf-anim-grow" style={{ height: "100%", borderRadius: 4, width: d.weeklyPct, background: d.weeklyTone }} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{d.weeklyNote}</div>
        </div>
        <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel)", padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 6 }}>Your callback rate</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{callback.value}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{callback.note}</div>
        </div>
      </Reveal>

      <Reveal style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
        {d.stats.map((st) => (
          <div key={st.label} style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)", padding: "16px 18px" }}>
            <div className="pf-mono" style={{ fontSize: 9, letterSpacing: ".11em", textTransform: "uppercase", color: "var(--faint)" }}>{st.label}</div>
            <div className="pf-mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.03em", color: st.color, marginTop: 6 }}>{st.value}</div>
          </div>
        ))}
      </Reveal>

      <Reveal style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel)", padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Conversion funnel</h2>
          <Link href={d.leakHref} className="pf-mono" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
            {d.leakLabel} →
          </Link>
        </div>
        {d.funnel.map((fn) => (
          <div key={fn.label} style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 11 }}>
            <span style={{ width: 70, fontSize: 12.5, fontWeight: 600 }}>{fn.label}</span>
            <span style={{ flex: 1, height: 7, borderRadius: 4, background: "var(--panel3)", overflow: "hidden" }}>
              <span className="pf-anim-grow" style={{ display: "block", height: "100%", width: fn.pct, background: fn.color }} />
            </span>
            <span className="pf-mono" style={{ fontSize: 14, fontWeight: 700, width: 26, textAlign: "right" }}>{fn.value}</span>
          </div>
        ))}
      </Reveal>

      {insight && (
        <Reveal style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid color-mix(in srgb,var(--risk) 30%,transparent)", background: "color-mix(in srgb,var(--risk) 7%,transparent)", borderRadius: 14, padding: "14px 18px", marginBottom: 14 }}>
          <span style={{ display: "flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, background: "var(--risk)", color: "#fff", fontSize: 12, flexShrink: 0 }}>!</span>
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>
            <span style={{ fontWeight: 700 }}>Pattern detected.</span> {insight}
          </span>
          {fix && (
            <Link href={fix.href} className="pf-mono" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap", marginLeft: "auto" }}>
              {fix.label} →
            </Link>
          )}
        </Reveal>
      )}

      <AddApplication />

      <div style={{ fontSize: 11.5, color: "var(--faint)", marginBottom: 10 }}>
        Drag cards between stages — moving to Applied stamps the date that drives your weekly counter.
      </div>

      <Reveal style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, alignItems: "start" }}>
        {s.board.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const key = e.dataTransfer.getData("text/plain");
              if (key) s.moveCard(key, col.id);
            }}
            style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--panel2)", padding: 12, minHeight: 220 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.tone }} />
                {col.title}
              </span>
              <span className="pf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{col.cards.length}</span>
            </div>
            {col.cards.map((c) => (
              <div
                key={c.key}
                onClick={() => s.openApp(c.key)}
                draggable
                onDragStart={(e) => onCardDragStart(e, c.key)}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const k = e.dataTransfer.getData("text/plain");
                  if (k) s.moveCardBefore(k, c.key);
                }}
                className="pf-hover-border"
                style={{ cursor: "grab", border: "1px solid var(--line)", borderRadius: 11, background: "var(--panel)", padding: "12px 13px", marginBottom: 9, boxShadow: "var(--rim)", transition: "transform .2s var(--ease),border-color .2s var(--ease)" }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.company}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>{c.role}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className="pf-mono" style={{ fontSize: 9.5, color: c.tone, border: `1px solid color-mix(in srgb, ${c.tone} 30%, transparent)`, borderRadius: 5, padding: "2px 7px" }}>{c.tag}</span>
                  {c.remind && (
                    <span className="pf-mono" style={{ fontSize: 9.5, color: "var(--warn)", border: "1px solid color-mix(in srgb,var(--warn) 30%,transparent)", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                      ⏰ {formatReminder(c.remind)}
                    </span>
                  )}
                  {c.deadline && (
                    <span className="pf-mono" style={{ fontSize: 9.5, color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                      closes {formatReminder(c.deadline)}
                    </span>
                  )}
                  <span className="pf-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--faint)" }}>{cardWhen(c)}</span>
                </div>
                {col.id === "interview" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); prep(c.company, c.role); }}
                    className="pf-mono"
                    style={{ cursor: "pointer", marginTop: 9, width: "100%", height: 28, borderRadius: 8, border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", background: "var(--accentSoft)", color: "var(--accentText)", fontSize: 10.5, fontWeight: 600 }}
                  >
                    Prep for {c.company} →
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </Reveal>
    </div>
  );
}
