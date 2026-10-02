"use client";

import Link from "next/link";
import { AuthShell, authButtonStyle } from "@/components/pf/auth-shell";

export default function NotFound() {
  return (
    <AuthShell kicker="404 · Not found" title="This page isn't on the map.">
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
        The link may be out of date, or the address mistyped.
      </p>
      <Link href="/" style={{ ...authButtonStyle(true), display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
        Back to home
      </Link>
    </AuthShell>
  );
}
