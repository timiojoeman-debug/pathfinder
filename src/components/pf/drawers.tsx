"use client";

/**
 * Detail drawers — job posting drawer (Opportunity Discovery) and
 * application drawer (Tracker) with pipeline timeline, rejection diagnosis,
 * reminders and advance/reject/remove actions.
 */

import { useRouter } from "next/navigation";
import { DIAG_TIMINGS, JOB_DETAILS, REJECTION_DIAGNOSIS, STATIC_JOBS } from "@/lib/pf/data";
import { formatReminder } from "@/lib/pf/logic";
import { usePfStore } from "@/lib/pf/store";
import { Kicker, MarkDot } from "./ui";

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="pf-anim-fade"
      style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 60, cursor: "pointer" }}
    />
  );
}

function DrawerShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <Scrim onClose={onClose} />
      <div
        className="pf-anim-slidein"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px,94vw)", zIndex: 61, background: "var(--panelSolid)", borderLeft: "1px solid var(--line)", overflowY: "auto" }}
      >
        {children}
      </div>
    </>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      style={{ cursor: "pointer", width: 32, height: 32, borderRadius: 9, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontSize: 15, flexShrink: 0 }}
    >
      ✕
    </button>
  );
}

/* ── Job drawer ────────────────────────────────────────────────────── */

function JobDrawer({ company }: { company: string }) {
  const router = useRouter();
  const savedJobs = usePfStore((s) => s.savedJobs);
  const board = usePfStore((s) => s.board);
  const closeDrawers = usePfStore((s) => s.closeDrawers);
  const trackJob = usePfStore((s) => s.trackJob);

  const jobsAll = [...savedJobs, ...STATIC_JOBS];
  const jd = jobsAll.find((j) => j.company === company);
  if (!jd) return null;

  const det = JOB_DETAILS[jd.company] ?? {
    chips: [["Added by you", "var(--accent)"], ["Fit estimated from your baseline", "var(--muted)"]] as [string, string][],
    desc: "jdText" in jd && jd.jdText ? [jd.jdText] : ["No description stored for this role yet — paste one in the add-role form to unlock the full analysis."],
    resp: [],
    reqs: [] as [string, boolean][],
  };
  const slug = jd.company.toLowerCase();
  const tracked = board.some((col) => col.cards.some((c) => c.key === slug));

  const onTrack = () => {
    if (tracked) {
      closeDrawers();
      router.push("/tracker");
    } else {
      trackJob({ company: jd.company, role: jd.role, fit: jd.fit, tone: jd.tone });
    }
  };
  const onTailor = () => {
    closeDrawers();
    router.push("/cv");
  };

  return (
    <DrawerShell onClose={closeDrawers}>
      <div style={{ padding: "28px 30px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
          <div>
            <Kicker style={{ fontSize: 10, marginBottom: 8 }}>{jd.meta}</Kicker>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 2px" }}>{jd.company}</h2>
            <div style={{ fontSize: 15, color: "var(--muted)" }}>{jd.role}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
              <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="28" cy="28" r="23" fill="none" stroke="var(--panel3)" strokeWidth="5" />
                <circle cx="28" cy="28" r="23" fill="none" stroke={jd.tone} strokeWidth="5" strokeLinecap="round" strokeDasharray="144" strokeDashoffset={jd.dash} />
              </svg>
              <div className="pf-mono" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: jd.tone }}>{jd.fit}</div>
            </div>
            <CloseBtn onClose={closeDrawers} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "14px 0 20px" }}>
          {det.chips.map(([label, col]) => (
            <span key={label} className="pf-mono" style={{ whiteSpace: "nowrap", fontSize: 10, fontWeight: 600, color: col, border: `1px solid color-mix(in srgb, ${col} 28%, transparent)`, background: `color-mix(in srgb, ${col} 7%, transparent)`, borderRadius: 6, padding: "4px 9px" }}>
              {label}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button
            onClick={onTrack}
            style={{ cursor: "pointer", flex: 1, height: 44, borderRadius: 11, border: "none", background: tracked ? "var(--panel3)" : "var(--accent)", color: tracked ? "var(--fg)" : "#F7F1E4", fontSize: 13.5, fontWeight: 600 }}
          >
            {tracked ? "Tracked ✓ — view board" : "+ Track this role"}
          </button>
          <button
            onClick={onTailor}
            style={{ cursor: "pointer", flex: 1, height: 44, borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--fg)", fontSize: 13.5, fontWeight: 600 }}
          >
            Tailor CV for this role →
          </button>
        </div>

        <Kicker style={{ fontSize: 9.5, marginBottom: 10 }}>About the role</Kicker>
        {det.desc.map((d) => (
          <p key={d.slice(0, 40)} style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg)", margin: "0 0 12px" }}>{d}</p>
        ))}

        {det.resp.length > 0 && (
          <>
            <Kicker style={{ fontSize: 9.5, margin: "20px 0 10px" }}>What you&apos;ll do</Kicker>
            {det.resp.map((r) => (
              <div key={r} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--line2)" }}>
                <span style={{ color: "var(--accent)" }}>·</span>
                <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{r}</span>
              </div>
            ))}
          </>
        )}

        {det.reqs.length > 0 && (
          <>
            <Kicker style={{ fontSize: 9.5, margin: "20px 0 10px" }}>Requirements vs your profile</Kicker>
            {det.reqs.map(([text, have]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid var(--line2)" }}>
                <MarkDot mark={have ? "✓" : "!"} bg={have ? "var(--strong)" : "var(--warn)"} />
                <span style={{ flex: 1, fontSize: 13 }}>{text}</span>
                <span className="pf-mono" style={{ fontSize: 10, color: have ? "var(--strong)" : "var(--warn)" }}>{have ? "you have this" : "gap"}</span>
              </div>
            ))}
          </>
        )}

        <a href="#" onClick={(e) => e.preventDefault()} className="pf-mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 20, fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
          Open original posting ↗
        </a>
      </div>
    </DrawerShell>
  );
}

/* ── Application drawer ────────────────────────────────────────────── */

function AppDrawer({ cardKey }: { cardKey: string }) {
  const board = usePfStore((s) => s.board);
  const diags = usePfStore((s) => s.diags);
  const closeDrawers = usePfStore((s) => s.closeDrawers);
  const advanceCard = usePfStore((s) => s.advanceCard);
  const moveCard = usePfStore((s) => s.moveCard);
  const removeCard = usePfStore((s) => s.removeCard);
  const setRemind = usePfStore((s) => s.setRemind);
  const setDiag = usePfStore((s) => s.setDiag);

  let colIdx = -1;
  let card = null as (typeof board)[number]["cards"][number] | null;
  board.forEach((col, i) => {
    const f = col.cards.find((c) => c.key === cardKey);
    if (f) { colIdx = i; card = f; }
  });
  if (!card) return null;
  const c = card;

  const stages = ["Saved", "Applied", "Interview", "Offer"];
  const nextLabels = ["Mark as applied →", "Log interview →", "Log offer →"];
  const isRej = colIdx === 4;
  const timing = diags[cardKey] ?? null;
  const match = c.match || 70;

  return (
    <DrawerShell onClose={closeDrawers}>
      <div style={{ padding: "28px 30px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <Kicker style={{ fontSize: 10, marginBottom: 8 }} color={board[colIdx].tone}>● {board[colIdx].title}</Kicker>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 2px" }}>{c.company}</h2>
            <div style={{ fontSize: 15, color: "var(--muted)" }}>{c.role}</div>
          </div>
          <CloseBtn onClose={closeDrawers} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "13px 15px", background: "var(--panel)" }}>
            <Kicker style={{ fontSize: 8.5, marginBottom: 4 }}>CV match rate</Kicker>
            <div className="pf-mono" style={{ fontSize: 20, fontWeight: 700, color: match >= 65 ? "var(--strong)" : "var(--warn)" }}>{match}%</div>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "13px 15px", background: "var(--panel)" }}>
            <Kicker style={{ fontSize: 8.5, marginBottom: 4 }}>Status note</Kicker>
            <div style={{ fontSize: 13.5, fontWeight: 600, paddingTop: 3 }}>{c.when}</div>
          </div>
        </div>

        {!isRej && (
          <div>
            <Kicker style={{ fontSize: 9.5, marginBottom: 10 }}>Pipeline</Kicker>
            {stages.map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0" }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: i < colIdx ? "var(--strong)" : i === colIdx ? "var(--accent)" : "var(--panel2)",
                  color: i <= colIdx ? "#F7F1E4" : "var(--faint)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0,
                  border: `1px solid ${i <= colIdx ? "transparent" : "var(--line)"}`,
                }}>
                  {i < colIdx ? "✓" : i === colIdx ? "●" : "·"}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: i === colIdx ? 700 : 500, color: i === colIdx ? "var(--fg)" : "var(--muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {isRej && (
          <div style={{ border: "1px solid color-mix(in srgb,var(--risk) 26%,transparent)", borderRadius: 14, background: "color-mix(in srgb,var(--risk) 5%,transparent)", padding: "16px 18px" }}>
            <Kicker style={{ fontSize: 9.5, marginBottom: 10 }} color="var(--risk)">Diagnose · when did you hear back?</Kicker>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
              {DIAG_TIMINGS.map((t) => (
                <span
                  key={t}
                  onClick={() => setDiag(cardKey, t)}
                  style={{
                    cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 9,
                    border: `1px solid ${timing === t ? "var(--risk)" : "var(--line)"}`,
                    background: timing === t ? "var(--risk)" : "var(--panel2)",
                    color: timing === t ? "#F7F1E4" : "var(--muted)",
                    transition: "all .18s var(--ease)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            {timing && (
              <div style={{ fontSize: 13, lineHeight: 1.6, borderTop: "1px solid var(--line2)", paddingTop: 11 }}>
                <span style={{ fontWeight: 700 }}>Diagnosis:</span> {REJECTION_DIAGNOSIS[timing]}
              </div>
            )}
          </div>
        )}

        <Kicker style={{ fontSize: 9.5, margin: "18px 0 8px" }}>Notes</Kicker>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--muted)", margin: "0 0 18px", border: "1px dashed var(--lineStrong)", borderRadius: 12, padding: "13px 15px" }}>
          {c.note || "No notes yet."}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <Kicker style={{ fontSize: 9.5 }}>Reminder</Kicker>
          <input
            type="date"
            value={c.remind ?? ""}
            onChange={(e) => setRemind(cardKey, e.target.value)}
            className="pf-input"
            style={{ height: 38, padding: "0 12px", borderRadius: 10, fontSize: 13, background: "var(--panel)" }}
          />
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
            {c.remind ? `shows as “⏰ ${formatReminder(c.remind)}” on the card` : "shows as a chip on the card"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {colIdx < 3 && (
            <button
              onClick={() => advanceCard(cardKey)}
              style={{ cursor: "pointer", flex: 1, height: 44, borderRadius: 11, border: "none", background: "var(--accent)", color: "#F7F1E4", fontSize: 13.5, fontWeight: 600 }}
            >
              {nextLabels[colIdx]}
            </button>
          )}
          {colIdx >= 1 && colIdx <= 2 && (
            <button
              onClick={() => moveCard(cardKey, "rejected")}
              style={{ cursor: "pointer", height: 44, padding: "0 16px", borderRadius: 11, border: "1px solid color-mix(in srgb,var(--risk) 32%,transparent)", background: "var(--panel)", color: "var(--risk)", fontSize: 13.5, fontWeight: 600 }}
            >
              Mark rejected
            </button>
          )}
          <button
            onClick={() => removeCard(cardKey)}
            style={{ cursor: "pointer", height: 44, padding: "0 18px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--risk)", fontSize: 13.5, fontWeight: 600 }}
          >
            Remove
          </button>
        </div>
      </div>
    </DrawerShell>
  );
}

/* ── Mount point ───────────────────────────────────────────────────── */

export function Drawers() {
  const jobDetail = usePfStore((s) => s.jobDetail);
  const appDetail = usePfStore((s) => s.appDetail);

  if (jobDetail) return <JobDrawer company={jobDetail} />;
  if (appDetail) return <AppDrawer cardKey={appDetail} />;
  return null;
}
