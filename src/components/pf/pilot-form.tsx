"use client";

import { useId, useState, type CSSProperties } from "react";

/**
 * Pilot enquiry form for /universities.
 *
 * The page had no conversion path: every CTA was once a mailto: to an address
 * that did not exist, and the fix at the time was to delete them and show a
 * static "not open yet" chip. Honest, but it left a careers director with
 * nowhere to raise their hand.
 *
 * Two rules this component exists to keep:
 *
 *  - It never claims more than it does. Pilots are genuinely not open, so the
 *    copy says the enquiry is recorded, not that someone will reply by Tuesday.
 *    Nothing here sends an email, so nothing here says it will.
 *  - It never reports success it did not get. The route answers 500 when the
 *    insert fails; this renders that as a failure the person can retry, rather
 *    than a thank-you over a row that was never written. A form that always
 *    says thanks is the same dead end as a mailto: to nowhere, just better
 *    disguised.
 */

const mono = "var(--font-mono), 'JetBrains Mono', monospace";

type Status = { kind: "idle" | "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function PilotForm() {
  const id = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const field: CSSProperties = {
    width: "100%",
    height: 46,
    padding: "0 14px",
    borderRadius: 11,
    border: "1px solid var(--line)",
    background: "var(--bg)",
    color: "var(--fg)",
    fontSize: 15,
    fontFamily: "inherit",
  };
  const labelStyle: CSSProperties = {
    display: "block",
    fontFamily: mono,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "var(--muted)",
    margin: "0 0 7px",
    textAlign: "left",
  };
  const row: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.kind === "sending") return;
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/pilot-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution: String(form.get("institution") ?? ""),
          contactName: String(form.get("contactName") ?? ""),
          email: String(form.get("email") ?? ""),
          role: String(form.get("role") ?? "") || undefined,
          cohortSize: String(form.get("cohortSize") ?? "") || undefined,
          note: String(form.get("note") ?? "") || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus({ kind: "error", message: body?.error ?? "Something went wrong. Please try again." });
        return;
      }
      setStatus({ kind: "sent" });
    } catch {
      /* Network-level failure. Distinguished from a 500 because the advice
         differs: this one is worth retrying immediately. */
      setStatus({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div
        role="status"
        style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "34px 28px", boxShadow: "var(--rim)", textAlign: "center" }}
      >
        <p style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 10px" }}>
          Recorded. Thank you.
        </p>
        {/* Deliberately no "we'll be in touch within X days": nothing on the
            other end of this is automated, and a promise nobody scheduled is
            the kind of small dishonesty this page exists to avoid. */}
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, margin: 0, maxWidth: "34rem", marginInline: "auto" }}>
          Your details are on the pilot list. Pilots are not open yet. When they are, institutions on this list are the ones we scope with first.
        </p>
      </div>
    );
  }

  const busy = status.kind === "sending";

  return (
    <form
      onSubmit={onSubmit}
      style={{ border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)", padding: "28px 26px", boxShadow: "var(--rim)", textAlign: "left" }}
    >
      <div style={{ ...row, marginBottom: 14 }}>
        <div>
          <label htmlFor={`${id}-inst`} style={labelStyle}>Institution *</label>
          <input id={`${id}-inst`} name="institution" required maxLength={200} autoComplete="organization" style={field} placeholder="University of ..." />
        </div>
        <div>
          <label htmlFor={`${id}-name`} style={labelStyle}>Your name *</label>
          <input id={`${id}-name`} name="contactName" required maxLength={120} autoComplete="name" style={field} />
        </div>
      </div>

      <div style={{ ...row, marginBottom: 14 }}>
        <div>
          <label htmlFor={`${id}-email`} style={labelStyle}>Work email *</label>
          <input id={`${id}-email`} name="email" type="email" required maxLength={200} autoComplete="email" style={field} />
        </div>
        <div>
          <label htmlFor={`${id}-role`} style={labelStyle}>Role</label>
          <input id={`${id}-role`} name="role" maxLength={120} style={field} placeholder="Careers manager" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor={`${id}-cohort`} style={labelStyle}>Cohort you&apos;d pilot with</label>
        <input id={`${id}-cohort`} name="cohortSize" maxLength={60} style={field} placeholder="e.g. one department, ~400 finalists" />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label htmlFor={`${id}-note`} style={labelStyle}>Anything else</label>
        <textarea id={`${id}-note`} name="note" maxLength={2000} rows={3} style={{ ...field, height: "auto", padding: "12px 14px", lineHeight: 1.55, resize: "vertical" }} />
      </div>

      {status.kind === "error" && (
        <p role="alert" style={{ fontSize: 14, color: "var(--risk)", margin: "0 0 14px", lineHeight: 1.5 }}>
          {status.message}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={busy}
          className="pf-cta"
          style={{
            display: "inline-flex", alignItems: "center", gap: 9, height: 52, padding: "0 26px", borderRadius: 13,
            background: "var(--fg)", color: "var(--bg)", fontSize: 15.5, fontWeight: 600, border: "none",
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.65 : 1,
            boxShadow: "0 10px 26px rgba(56,44,32,.16),var(--rim)",
          }}
        >
          {busy ? "Sending…" : "Join the pilot list →"}
        </button>
        <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          No commitment. Pilots are not open yet.
        </span>
      </div>
    </form>
  );
}
