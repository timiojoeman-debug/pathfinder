"use client";

/**
 * One contact's drawer: editable details, notes, a follow-up date, the stage, and
 * the way back to the tracker. Edits save on a short debounce and on close, the
 * same way the application drawer's notes do, so Escape or a click on the scrim
 * never loses what was typed.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_STAGES, CONTACT_STAGE_LABEL, HOW_WE_MET, HOW_WE_MET_LABEL, applicationsAtCompany, type ContactStage, type HowWeMet } from "@/lib/pf/contacts";
import { formatReminder } from "@/lib/pf/logic";
import { netContactKey, usePfStore } from "@/lib/pf/store";
import { safeHttpUrl } from "@/lib/jobs/types";
import { CloseBtn, DrawerShell } from "@/components/pf/drawer-shell";
import { Kicker } from "@/components/pf/ui";

interface Draft { name: string; company: string; role: string; howWeMet: HowWeMet; link: string; notes: string }

const fieldStyle = { height: 40, padding: "0 13px", fontSize: 13.5, minWidth: 0, width: "100%" } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", flex: "1 1 200px", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

export function ContactDrawer({ id }: { id: string }) {
  const contacts = usePfStore((s) => s.contacts);
  const board = usePfStore((s) => s.board);
  const updateContact = usePfStore((s) => s.updateContact);
  const moveContact = usePfStore((s) => s.moveContact);
  const setContactFollowUp = usePfStore((s) => s.setContactFollowUp);
  const removeContact = usePfStore((s) => s.removeContact);
  const selectContact = usePfStore((s) => s.selectContact);
  const closeDrawers = usePfStore((s) => s.closeDrawers);
  const openApp = usePfStore((s) => s.openApp);
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const c = contacts.find((x) => x.id === id);
  const [d, setD] = useState<Draft>(() => ({
    name: c?.name ?? "", company: c?.company ?? "", role: c?.role ?? "", howWeMet: c?.howWeMet ?? "other", link: c?.link ?? "", notes: c?.notes ?? "",
  }));
  const pending = useRef<Draft | null>(null);
  const edit = (patch: Partial<Draft>) => {
    const next = { ...d, ...patch };
    pending.current = next;
    setD(next);
  };
  const flush = () => {
    if (pending.current) updateContact(id, pending.current);
    pending.current = null;
  };
  useEffect(() => {
    if (pending.current === null) return;
    const t = setTimeout(flush, 600);
    return () => clearTimeout(t);
    // flush only reads refs and a stable store action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => flush, [id]);

  if (!c) return null;

  const clash = contacts.some((x) => x.id !== id && netContactKey(x) === netContactKey(d));
  const badLink = d.link.trim() !== "" && !safeHttpUrl(d.link);
  const apps = applicationsAtCompany(board, c.company);

  const work = () => {
    flush();
    selectContact(id);
    closeDrawers();
    if (window.location.pathname === "/networking") document.getElementById("net-research")?.scrollIntoView({ behavior: "smooth", block: "start" });
    else router.push("/networking#net-research");
  };

  return (
    <DrawerShell onClose={closeDrawers}>
      <div style={{ padding: "28px 30px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <Kicker style={{ fontSize: 10, marginBottom: 8 }} color="var(--accent)">● {CONTACT_STAGE_LABEL[c.stage]}</Kicker>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 2px", overflowWrap: "anywhere" }}>{c.name}</h2>
            <div style={{ fontSize: 15, color: "var(--muted)" }}>{[c.role, c.company].filter(Boolean).join(" at ") || "No company yet"}</div>
          </div>
          <CloseBtn onClose={closeDrawers} />
        </div>

        <button
          className="pf-shine pf-touch"
          onClick={work}
          style={{ cursor: "pointer", width: "100%", height: 44, borderRadius: 11, border: "none", background: "var(--accent)", color: "var(--onAccent)", fontSize: 13.5, fontWeight: 600, marginBottom: 20 }}
        >
          Work on this contact →
        </button>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <Field label="Stage">
            <select value={c.stage} onChange={(e) => moveContact(id, e.target.value as ContactStage)} className="pf-input pf-touch" style={fieldStyle}>
              {CONTACT_STAGES.map((s) => <option key={s} value={s}>{CONTACT_STAGE_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Follow up on">
            <input type="date" value={c.followUpOn ?? ""} onChange={(e) => setContactFollowUp(id, e.target.value || undefined)} className="pf-input pf-touch" style={fieldStyle} />
          </Field>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "0 0 18px" }}>
          {c.followUpOn ? `Shows up in Do next on ${formatReminder(c.followUpOn)}.` : "Set a date and it shows up in Do next when it arrives."}
          {" "}Moving a contact to Messaged by hand is only a stage change. Use &ldquo;Mark as sent&rdquo; on a real message to count it.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <Field label="Name"><input value={d.name} onChange={(e) => edit({ name: e.target.value })} className="pf-input pf-touch" style={fieldStyle} /></Field>
          <Field label="Company"><input value={d.company} onChange={(e) => edit({ company: e.target.value })} className="pf-input pf-touch" style={fieldStyle} /></Field>
          <Field label="Role (optional)"><input value={d.role} onChange={(e) => edit({ role: e.target.value })} className="pf-input pf-touch" style={fieldStyle} /></Field>
          <Field label="How you met">
            <select value={d.howWeMet} onChange={(e) => edit({ howWeMet: e.target.value as HowWeMet })} className="pf-input pf-touch" style={fieldStyle}>
              {HOW_WE_MET.map((h) => <option key={h} value={h}>{HOW_WE_MET_LABEL[h]}</option>)}
            </select>
          </Field>
          <Field label="Profile link (optional)"><input value={d.link} onChange={(e) => edit({ link: e.target.value })} placeholder="https://" className="pf-input pf-touch" style={fieldStyle} /></Field>
        </div>
        {clash && <div role="status" style={{ fontSize: 12, color: "var(--warnText)", marginBottom: 8 }}>Another contact already has this name and company, so that change isn&apos;t saved.</div>}
        {badLink && <div role="status" style={{ fontSize: 12, color: "var(--warnText)", marginBottom: 8 }}>The link needs to start with http:// or https://, so it isn&apos;t saved.</div>}
        {c.link && !badLink && (
          <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginBottom: 8, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
            Open their profile ↗
          </a>
        )}

        <Kicker style={{ fontSize: 9.5, margin: "14px 0 8px" }}>Notes</Kicker>
        <textarea
          value={d.notes}
          onChange={(e) => edit({ notes: e.target.value })}
          placeholder="What you talked about, what they suggested, what's next. Saves as you type."
          aria-label="Notes"
          className="pf-input"
          style={{ width: "100%", minHeight: 90, fontSize: 13.5, lineHeight: 1.65, margin: "0 0 6px", padding: "13px 15px", resize: "vertical" }}
        />
        <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "0 0 20px" }}>
          Notes stay on your side and are never sent to the AI. Keep to what you need to follow up.
        </p>

        {apps.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Kicker style={{ fontSize: 9.5, marginBottom: 8 }}>Your applications at {c.company}</Kicker>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {apps.map((a) => (
                <button
                  key={a.key}
                  onClick={() => openApp(a.key)}
                  className="pf-tap"
                  style={{ cursor: "pointer", minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
                >
                  {a.role} <span style={{ color: "var(--faint)", fontWeight: 500 }}>&nbsp;· {a.column}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!confirmRemove ? (
          <button
            onClick={() => setConfirmRemove(true)}
            className="pf-touch"
            style={{ cursor: "pointer", height: 44, padding: "0 18px", borderRadius: 11, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--risk)", fontSize: 13.5, fontWeight: 600 }}
          >
            Remove
          </button>
        ) : (
          <div role="alertdialog" aria-label="Confirm removal" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", border: "1px solid color-mix(in srgb,var(--risk) 30%,transparent)", borderRadius: 12, padding: "12px 14px" }}>
            <span style={{ fontSize: 13, flex: "1 1 200px" }}>Remove {c.name} from your contacts? Their notes and dates go with them.</span>
            <button
              onClick={() => { pending.current = null; removeContact(id); }}
              className="pf-touch"
              style={{ cursor: "pointer", height: 44, padding: "0 14px", borderRadius: 10, border: "none", background: "var(--risk)", color: "var(--onAccent)", fontSize: 13, fontWeight: 600 }}
            >
              Yes, remove
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              className="pf-touch"
              style={{ cursor: "pointer", height: 44, padding: "0 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
            >
              Keep them
            </button>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
