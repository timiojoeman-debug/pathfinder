"use client";

/**
 * "Your contacts": everyone the student is talking to, one column per stage, so
 * nobody is forgotten when the working contact changes. It follows the tracker's
 * model (a board, dates that become recommendations) but is deliberately plain:
 * moving a card by hand is bookkeeping, not evidence. Only "Mark as sent" on a real
 * message counts as outreach (see the store).
 */

import { useState, type FormEvent } from "react";
import { CONTACT_STAGES, CONTACT_STAGE_LABEL, HOW_WE_MET, HOW_WE_MET_LABEL, type Contact, type ContactStage, type HowWeMet } from "@/lib/pf/contacts";
import { formatReminder, isoToday } from "@/lib/pf/logic";
import { usePfStore, type AddContactResult } from "@/lib/pf/store";
import { Panel } from "@/components/pf/ui";
import { Icon } from "@/components/pf/icons";

const field = { height: 40, padding: "0 13px", fontSize: 13, minWidth: 0 } as const;

const ADD_MESSAGE: Record<Exclude<AddContactResult, "added">, string> = {
  "no-name": "Add their name first.",
  duplicate: "You already have a contact with that name and company.",
  "bad-link": "The link needs to start with http:// or https://.",
};

function AddContact() {
  const addContact = usePfStore((s) => s.addContact);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [howWeMet, setHowWeMet] = useState<HowWeMet>("linkedin");
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const ready = name.trim().length > 0 && company.trim().length > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const r = addContact({ name, company, role, howWeMet, link });
    if (r !== "added") {
      setMsg(ADD_MESSAGE[r]);
      return;
    }
    setMsg(`Added ${name.trim()}. Open their card to add notes or a follow-up date.`);
    setName("");
    setCompany("");
    setRole("");
    setLink("");
  };

  return (
    <form onSubmit={submit} aria-label="Add a contact" style={{ borderTop: "1px solid var(--line2)", paddingTop: 14, marginTop: 14 }}>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, marginRight: 4 }}>Add contact</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" className="pf-input pf-touch" style={{ ...field, flex: "1 1 140px" }} />
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" aria-label="Company" className="pf-input pf-touch" style={{ ...field, flex: "1 1 140px" }} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" aria-label="Role" className="pf-input pf-touch" style={{ ...field, flex: "1 1 140px" }} />
        <select value={howWeMet} onChange={(e) => setHowWeMet(e.target.value as HowWeMet)} aria-label="How you met" className="pf-input pf-touch" style={{ ...field, flex: "0 1 auto" }}>
          {HOW_WE_MET.map((h) => <option key={h} value={h}>{HOW_WE_MET_LABEL[h]}</option>)}
        </select>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Profile link (optional)" aria-label="Link" className="pf-input pf-touch" style={{ ...field, flex: "2 1 200px" }} />
        <button
          type="submit"
          disabled={!ready}
          className="pf-shine pf-touch"
          style={{ cursor: ready ? "pointer" : "default", height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: ready ? "var(--accent)" : "var(--panel3)", color: ready ? "var(--onAccent)" : "var(--faint)", fontSize: 13, fontWeight: 600 }}
        >
          Add
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "8px 0 0" }}>
        Only add what you need to follow up. No personal phone numbers or home addresses.
      </p>
      {msg && <div role="status" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{msg}</div>}
    </form>
  );
}

function ContactCard({ c, today }: { c: Contact; today: string }) {
  const openContact = usePfStore((s) => s.openContact);
  const moveContact = usePfStore((s) => s.moveContact);
  const due = !!c.followUpOn && c.followUpOn <= today && c.stage !== "referred" && c.stage !== "not-now";
  return (
    <div className="pf-hover-border" style={{ border: "1px solid var(--line)", borderRadius: 11, background: "var(--panel)", padding: "10px 11px", marginBottom: 9, boxShadow: "var(--rim)" }}>
      <button
        onClick={() => openContact(c.id)}
        aria-label={`Open ${c.name}`}
        className="pf-touch"
        style={{ cursor: "pointer", display: "block", width: "100%", textAlign: "left", padding: "2px 2px 6px", border: "none", background: "none", color: "var(--fg)" }}
      >
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{c.name}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", overflowWrap: "anywhere" }}>{[c.role, c.company].filter(Boolean).join(" at ") || "No company yet"}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
          <span className="pf-mono" style={{ fontSize: 9.5, color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 5, padding: "2px 7px" }}>{HOW_WE_MET_LABEL[c.howWeMet]}</span>
          {c.followUpOn && (
            <span className="pf-mono" style={{ fontSize: 9.5, color: due ? "var(--warn)" : "var(--muted)", border: `1px solid ${due ? "color-mix(in srgb,var(--warn) 30%,transparent)" : "var(--line)"}`, borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
              ⏰ {formatReminder(c.followUpOn)}
            </span>
          )}
        </span>
      </button>
      <select
        value={c.stage}
        onChange={(e) => moveContact(c.id, e.target.value as ContactStage)}
        aria-label={`Move ${c.name} to`}
        className="pf-input pf-touch"
        style={{ width: "100%", height: 32, padding: "0 8px", fontSize: 12 }}
      >
        {CONTACT_STAGES.map((s) => <option key={s} value={s}>{CONTACT_STAGE_LABEL[s]}</option>)}
      </select>
    </div>
  );
}

export function ContactsBoard() {
  const contacts = usePfStore((s) => s.contacts);
  const clearContacts = usePfStore((s) => s.clearContacts);
  const [confirmClear, setConfirmClear] = useState(false);
  const today = isoToday();

  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ display: "flex", color: "var(--accent)" }}><Icon name="users" size={18} /></span>
        <h2 className="pf-display-sm" style={{ fontSize: 21, margin: 0 }}>Your contacts</h2>
        <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)" }}>
          {contacts.length} {contacts.length === 1 ? "person" : "people"} · private to you
        </span>
        {contacts.length > 0 && !confirmClear && (
          <button
            onClick={() => setConfirmClear(true)}
            className="pf-touch"
            style={{ cursor: "pointer", marginLeft: "auto", height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid var(--lineStrong)", background: "var(--panel)", color: "var(--risk)", fontSize: 12.5, fontWeight: 600 }}
          >
            Delete all contacts
          </button>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 14px" }}>
        Everyone you research or message, at the stage they&apos;re at. Moving a card by hand is just a stage change;
        progress only counts a message you mark as sent and a chat you log.
      </p>

      {confirmClear && (
        <div role="alertdialog" aria-label="Confirm delete all contacts" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14, border: "1px solid color-mix(in srgb,var(--risk) 30%,transparent)", borderRadius: 12, padding: "12px 14px" }}>
          <span style={{ fontSize: 13, flex: "1 1 260px" }}>
            Delete all {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}, with their notes and dates?
            Only anonymous counts stay (messages sent, chats and referrals, with the company but not the name), so your progress and referrals received don&apos;t change.
          </span>
          <button
            onClick={() => { clearContacts(); setConfirmClear(false); }}
            className="pf-touch"
            style={{ cursor: "pointer", height: 40, padding: "0 14px", borderRadius: 10, border: "none", background: "var(--risk)", color: "var(--onAccent)", fontSize: 13, fontWeight: 600 }}
          >
            Yes, delete all
          </button>
          <button
            onClick={() => setConfirmClear(false)}
            className="pf-touch"
            style={{ cursor: "pointer", height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)", fontSize: 13, fontWeight: 600 }}
          >
            Keep them
          </button>
        </div>
      )}

      <div className="pf-contacts-board">
        {CONTACT_STAGES.map((stage) => {
          const here = contacts.filter((c) => c.stage === stage);
          return (
            <section key={stage} aria-label={CONTACT_STAGE_LABEL[stage]} className={here.length ? "pf-contacts-col" : "pf-contacts-col pf-contacts-col-empty"} style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel2)", padding: 10, minHeight: 90 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 3px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{CONTACT_STAGE_LABEL[stage]}</span>
                <span className="pf-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{here.length}</span>
              </div>
              {here.map((c) => <ContactCard key={c.id} c={c} today={today} />)}
              {here.length === 0 && <div style={{ fontSize: 11.5, color: "var(--faint)", padding: "0 3px" }}>None yet</div>}
            </section>
          );
        })}
      </div>

      {contacts.length === 0 && (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "12px 0 0" }}>
          No contacts yet. Add the first person you research or message, and they&apos;ll stay here when you move on to the next.
        </p>
      )}

      <AddContact />
    </Panel>
  );
}
