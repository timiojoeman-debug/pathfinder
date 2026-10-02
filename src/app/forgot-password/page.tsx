"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell, authInputStyle, authButtonStyle } from "@/components/pf/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      // Always resolves ok — the server never reveals whether the email exists.
      await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      kicker="Account recovery"
      title="Reset your password"
      footer={<><Link href="/login" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Back to sign in</Link></>}
    >
      {sent ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
          If an account exists for <strong style={{ color: "var(--fg)" }}>{email}</strong>, we&apos;ve sent a password-reset link. It expires in 30 minutes. Check your inbox (and spam).
        </p>
      ) : (
        <form onSubmit={submit}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.ac.uk"
            required
            className="pf-input"
            style={authInputStyle}
          />
          <button type="submit" className="pf-shine" disabled={busy} style={authButtonStyle(!busy)}>
            {busy ? "Sending…" : "Send reset link →"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
