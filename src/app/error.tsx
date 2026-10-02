"use client";

import Link from "next/link";
import { AuthShell, authButtonStyle } from "@/components/pf/auth-shell";

/*
 * No client-side reporter here on purpose: logger.ts only persists errors with
 * the service-role key, which never reaches the browser. Next already logs the
 * server-side error under the same digest, so showing the digest is what lets
 * a report be matched to that log line.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AuthShell
      kicker="Something went wrong"
      title="This page hit an error."
      footer={error.digest ? <>Reference: <span className="pf-mono">{error.digest}</span></> : undefined}
    >
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
        Try again. If it keeps happening, head back home and come in from there.
      </p>
      <button type="button" className="pf-shine" onClick={reset} style={authButtonStyle(true)}>Try again</button>
      <Link href="/" style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--accentText)", textDecoration: "none" }}>
        Back to home
      </Link>
    </AuthShell>
  );
}
