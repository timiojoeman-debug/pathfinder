"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AuthShell, authInputStyle, authButtonStyle } from "@/components/pf/auth-shell";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Reset failed — request a new link."); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch {
      setError("Reset failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell kicker="Account recovery" title="Reset link missing" footer={<Link href="/forgot-password" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Request a new link</Link>}>
        <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>This page needs a valid reset link. Request a fresh one and open it from your email.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="Account recovery"
      title="Choose a new password"
      footer={<Link href="/login" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Back to sign in</Link>}
    >
      {done ? (
        <p style={{ fontSize: 13.5, color: "var(--strong)", lineHeight: 1.6 }}>Password updated. Taking you to sign in…</p>
      ) : (
        <form onSubmit={submit}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>New password <span style={{ fontWeight: 500, color: "var(--faint)" }}>(8+ characters)</span></div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} className="pf-input" style={authInputStyle} />
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Confirm password</div>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required className="pf-input" style={authInputStyle} />
          {error && <div style={{ fontSize: 12.5, color: "var(--risk)", marginBottom: 14 }}>{error}</div>}
          <button type="submit" disabled={busy} style={authButtonStyle(!busy)}>{busy ? "Updating…" : "Update password →"}</button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="pf" style={{ minHeight: "100vh" }} />}>
      <ResetForm />
    </Suspense>
  );
}
