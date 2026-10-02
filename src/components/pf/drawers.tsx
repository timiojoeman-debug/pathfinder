"use client";

/**
 * Detail drawers — job posting drawer (Opportunity Discovery) and
 * application drawer (Tracker) with pipeline timeline, rejection diagnosis,
 * reminders and advance/reject/remove actions.
 */

import { useRouter } from "next/navigation";
import { DIAG_TIMINGS, REJECTION_DIAGNOSIS } from "@/lib/pf/data";
import { cardWhen, formatReminder, trackCardKey } from "@/lib/pf/logic";
import { usePfStore } from "@/lib/pf/store";
import { safeHttpUrl } from "@/lib/jobs/types";
import { Kicker } from "./ui";
import { FollowUpDraft } from "./tracker/follow-up-draft";
import { useEffect, useRef, useState } from "react";

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

function JobDrawer({ jobKey }: { jobKey: string }) {
  const router = useRouter();
  const savedJobs = usePfStore((s) => s.savedJobs);
  const board = usePfStore((s) => s.board);
  const closeDrawers = usePfStore((s) => s.closeDrawers);
  const trackJob = usePfStore((s) => s.trackJob);
  const setTailorJD = usePfStore((s) => s.setTailorJD);

  // Keyed on company + role; a bare company name still resolves for older callers.
  const jd = savedJobs.find((j) => trackCardKey(j.company, j.role) === jobKey) ?? savedJobs.find((j) => j.company === jobKey);
  if (!jd) return null;

  // Every chip states where this role and its number actually came from.
  const chips: [string, string][] = [
    ...(jd.meta.startsWith("Added by you") ? [["Added by you", "var(--accent)"] as [string, string]] : []),
    jd.fitKnown === false ? ["Not scored", "var(--faint)"] : ["Scored from your CV", "var(--strong)"],
  ];
  // Re-checked at render: jobs persisted before the mappers filtered links can hold any scheme.
  const postingUrl = safeHttpUrl(jd.url);
  const desc = jd.jdText?.trim()
    ? jd.jdText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [postingUrl
        ? "This listing came without a description. Open the original posting to read it, or paste the advert into the add-role form to score it."
        : "No description stored for this role yet. Paste one into the add-role form to score it."];
  const slug = trackCardKey(jd.company, jd.role);
  const tracked = board.some((col) => col.cards.some((c) => c.key === slug || trackCardKey(c.company, c.role) === slug));

  const onTrack = () => {
    if (tracked) {
      closeDrawers();
      router.push("/tracker");
    } else {
      trackJob({ company: jd.company, role: jd.role, fit: jd.fitKnown === false ? null : jd.fit, tone: jd.tone });
    }
  };
  // Carry the advert into the CV Tailor panel, so the student lands ready to audit against it.
  // Always set it, even to "": otherwise a posting with no JD lands on the previous posting's audit.
  const onTailor = () => {
    setTailorJD(jd.jdText?.trim() ?? "");
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
              <div className="pf-mono" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: jd.tone }}>{jd.fitKnown === false ? "—" : jd.fit}</div>
            </div>
            <CloseBtn onClose={closeDrawers} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "14px 0 20px" }}>
          {chips.map(([label, col]) => (
            <span key={label} className="pf-mono" style={{ whiteSpace: "nowrap", fontSize: 10, fontWeight: 600, color: col, border: `1px solid color-mix(in srgb, ${col} 28%, transparent)`, background: `color-mix(in srgb, ${col} 7%, transparent)`, borderRadius: 6, padding: "4px 9px" }}>
              {label}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button
            onClick={onTrack}
            style={{ cursor: "pointer", flex: 1, height: 44, borderRadius: 11, border: "none", background: tracked ? "var(--panel3)" : "var(--accent)", color: tracked ? "var(--fg)" : "var(--onAccent)", fontSize: 13.5, fontWeight: 600 }}
          >
            {tracked ? "Tracked ✓ · view board" : "+ Track this role"}
          </button>
          <button
            onClick={onTailor}
            style={{ cursor: "pointer", flex: 1, height: 44, borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--fg)", fontSize: 13.5, fontWeight: 600 }}
          >
            Tailor CV for this role →
          </button>
        </div>

        <Kicker style={{ fontSize: 9.5, marginBottom: 10 }}>About the role</Kicker>
        {desc.map((d, i) => (
          <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg)", margin: "0 0 12px", whiteSpace: "pre-line" }}>{d}</p>
        ))}

        {jd.coverLetter && (
          <>
            <Kicker style={{ fontSize: 9.5, margin: "20px 0 10px" }}>Your cover letter draft</Kicker>
            {jd.coverLetter.split(/\n{2,}/).map((p, i) => (
              <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)", margin: "0 0 10px" }}>{p}</p>
            ))}
            <p style={{ fontSize: 11.5, color: "var(--faint)", fontStyle: "italic", margin: 0 }}>
              An AI first draft. Review and personalise it before sending.
            </p>
          </>
        )}

        {postingUrl && (
          <a href={postingUrl}target="_blank" rel="noopener noreferrer" className="pf-mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 20, fontSize: 11, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
            Open original posting ↗
          </a>
        )}
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
  const setCardDate = usePfStore((s) => s.setCardDate);
  const setDiag = usePfStore((s) => s.setDiag);
  const setCardNote = usePfStore((s) => s.setCardNote);
  const setStore = usePfStore((s) => s.set);
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Notes are controlled and saved on a short debounce and on unmount, so an edit
  // survives Escape, a click on the scrim or a card swap. The draft-follow-up
  // panel reads this live text, not the last saved copy.
  const storedNote = board.flatMap((col) => col.cards).find((x) => x.key === cardKey)?.note ?? "";
  const [noteDraft, setNoteDraft] = useState(storedNote);
  const pendingNote = useRef<string | null>(null);
  useEffect(() => {
    if (pendingNote.current === null) return;
    const t = setTimeout(() => {
      if (pendingNote.current !== null) setCardNote(cardKey, pendingNote.current.trim());
      pendingNote.current = null;
    }, 600);
    return () => clearTimeout(t);
  }, [noteDraft, cardKey, setCardNote]);
  useEffect(
    () => () => {
      if (pendingNote.current !== null) setCardNote(cardKey, pendingNote.current.trim());
    },
    [cardKey, setCardNote],
  );

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
  const match = c.match ?? null;

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
            <div className="pf-mono" style={{ fontSize: 20, fontWeight: 700, color: match === null ? "var(--faint)" : match >= 65 ? "var(--strong)" : "var(--warn)" }} title={match === null ? "Not scored" : undefined}>{match === null ? "–" : `${match}%`}</div>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "13px 15px", background: "var(--panel)" }}>
            <Kicker style={{ fontSize: 8.5, marginBottom: 4 }}>Status note</Kicker>
            <div style={{ fontSize: 13.5, fontWeight: 600, paddingTop: 3 }}>{cardWhen(c)}</div>
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
                  color: i <= colIdx ? "var(--onAccent)" : "var(--faint)",
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
                    color: timing === t ? "var(--onAccent)" : "var(--muted)",
                    transition: "all .18s var(--ease)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            {timing && (
              <div style={{ fontSize: 13, lineHeight: 1.6, borderTop: "1px solid var(--line2)", paddingTop: 11 }}>
                <span style={{ fontWeight: 700 }}>Likely signal:</span> {REJECTION_DIAGNOSIS[timing]}
              </div>
            )}
          </div>
        )}

        {colIdx === 2 && (
          <button
            onClick={() => {
              setStore({ ivTab: "briefing", ivBriefingFor: { company: c.company, role: c.role } });
              closeDrawers();
              router.push("/interview");
            }}
            style={{ cursor: "pointer", width: "100%", marginTop: 14, height: 42, borderRadius: 11, border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", background: "var(--accentSoft)", color: "var(--accentText)", fontSize: 13.5, fontWeight: 600 }}
          >
            Prep for this interview: open the {c.company} briefing →
          </button>
        )}

        {c.link && (
          <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 14, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
            Open the posting ↗
          </a>
        )}

        <Kicker style={{ fontSize: 9.5, margin: "18px 0 8px" }}>Notes</Kicker>
        <textarea
          value={noteDraft}
          onChange={(e) => {
            pendingNote.current = e.target.value;
            setNoteDraft(e.target.value);
          }}
          placeholder="Who you spoke to, what they said, what's next. Saves as you type."
          aria-label="Notes"
          className="pf-input"
          style={{ width: "100%", minHeight: 80, fontSize: 13.5, lineHeight: 1.65, margin: "0 0 18px", padding: "13px 15px", resize: "vertical" }}
        />

        {colIdx === 1 && (
          <>
            <Kicker style={{ fontSize: 9.5, margin: "0 0 8px" }}>Follow up</Kicker>
            <FollowUpDraft cardKey={cardKey} company={c.company} role={c.role} appliedDate={c.appliedDate} followedUpAt={c.followedUpAt} note={noteDraft} />
          </>
        )}

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

        <Kicker style={{ fontSize: 9.5, margin: "0 0 8px" }}>Scheme dates</Kicker>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          {(["opens", "deadline"] as const).map((f) => (
            <label key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
              {f === "opens" ? "Opens" : "Deadline"}
              <input
                type="date"
                value={c[f] ?? ""}
                onChange={(e) => setCardDate(cardKey, f, e.target.value)}
                className="pf-input"
                style={{ height: 38, padding: "0 12px", borderRadius: 10, fontSize: 13, background: "var(--panel)" }}
              />
            </label>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "0 0 22px" }}>
          From the company&apos;s own careers page. PathFinder works back from these: outreach about six weeks out,
          the referral ask one to two weeks before the deadline.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          {colIdx < 3 && (
            <button
              onClick={() => advanceCard(cardKey)}
              style={{ cursor: "pointer", flex: 1, height: 44, borderRadius: 11, border: "none", background: "var(--accent)", color: "var(--onAccent)", fontSize: 13.5, fontWeight: 600 }}
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
          {!confirmRemove && (
            <button
              onClick={() => setConfirmRemove(true)}
              style={{ cursor: "pointer", height: 44, padding: "0 18px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--risk)", fontSize: 13.5, fontWeight: 600 }}
            >
              Remove
            </button>
          )}
        </div>
        {confirmRemove && (
          <div role="alertdialog" aria-label="Confirm removal" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, border: "1px solid color-mix(in srgb,var(--risk) 30%,transparent)", borderRadius: 12, padding: "12px 14px" }}>
            <span style={{ fontSize: 13, flex: "1 1 200px" }}>Remove {c.company} from the tracker? Its notes and dates go with it.</span>
            <button
              onClick={() => removeCard(cardKey)}
              style={{ cursor: "pointer", height: 38, padding: "0 14px", borderRadius: 10, border: "none", background: "var(--risk)", color: "var(--onAccent)", fontSize: 13, fontWeight: 600 }}
            >
              Yes, remove
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              style={{ cursor: "pointer", height: 38, padding: "0 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
            >
              Keep it
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

/* ── Mount point ───────────────────────────────────────────────────── */

export function Drawers() {
  const jobDetail = usePfStore((s) => s.jobDetail);
  const appDetail = usePfStore((s) => s.appDetail);

  if (jobDetail) return <JobDrawer jobKey={jobDetail} />;
  if (appDetail) return <AppDrawer key={appDetail} cardKey={appDetail} />;
  return null;
}
