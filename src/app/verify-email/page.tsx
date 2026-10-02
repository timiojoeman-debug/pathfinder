"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell, authButtonStyle } from "@/components/pf/auth-shell";

type State = "checking" | "ok" | "fail" | "notoken";

function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>(token ? "checking" : "notoken");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetch("/api/auth/verify-email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json().then((j) => ({ ok: res.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (ok && j.verified) setState("ok");
        else { setState("fail"); setError(j.error || "This link is invalid or has expired."); }
      })
      .catch(() => { if (!cancelled) { setState("fail"); setError("Verification failed. Please try again."); } });
    return () => { cancelled = true; };
  }, [token]);

  const body: Record<State, { kicker: string; title: string; text: string }> = {
    checking: { kicker: "Email verification", title: "Verifying…", text: "One moment while we confirm your email." },
    ok: { kicker: "Email verification", title: "Email verified ✓", text: "Your email is confirmed. You're all set." },
    fail: { kicker: "Email verification", title: "Couldn't verify", text: error ?? "This link is invalid or has expired." },
    notoken: { kicker: "Email verification", title: "Check your inbox", text: "We've sent a verification link to your email. Open it to confirm your address." },
  };
  const b = body[state];

  return (
    <AuthShell
      kicker={b.kicker}
      title={b.title}
      footer={<Link href="/intel" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Go to PathFinder</Link>}
    >
      <p style={{ fontSize: 13.5, color: state === "ok" ? "var(--strong)" : state === "fail" ? "var(--risk)" : "var(--muted)", lineHeight: 1.6, marginBottom: state === "ok" ? 16 : 0 }}>{b.text}</p>
      {state === "ok" && (
        <Link href="/intel" className="pf-shine" style={{ ...authButtonStyle(true), display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Continue →</Link>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="pf" style={{ minHeight: "100vh" }} />}>
      <Verify />
    </Suspense>
  );
}
