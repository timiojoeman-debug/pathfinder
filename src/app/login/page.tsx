"use client";

/**
 * Sign in / create account — the JWT auth flow of the active site
 * (/api/auth/login, /api/auth/signup) in the warm-paper design.
 */

import Link from "next/link";
import { BrandMark, Contours } from "@/components/pf/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuthStore } from "@/lib/stores";

export default function LoginPage() {
  const router = useRouter();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Try again.");
        return;
      }
      await checkAuth();
      router.push("/intel");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const tab = (on: boolean): React.CSSProperties => ({
    cursor: "pointer", flex: 1, height: 40, borderRadius: 10, border: "1px solid var(--line)",
    background: on ? "var(--accent)" : "var(--panel)", color: on ? "var(--onAccent)" : "var(--muted)",
    fontSize: 13, fontWeight: 600, transition: "background-color .2s var(--ease), border-color .2s var(--ease), color .2s var(--ease), transform .16s cubic-bezier(.23,1,.32,1)",
  });

  return (
    <div className="pf" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Contours />
      <div className="pf-anim-up" style={{ width: "min(420px, 94vw)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, justifyContent: "center", marginBottom: 26, textDecoration: "none", color: "var(--fg)" }}>
          <BrandMark size={28} />
        </Link>

        <div className="pf-panel" style={{ padding: "26px 28px", background: "var(--panelSolid)" }}>
          {/* The page's one heading: screen readers navigate by it. Styled as the kicker it replaced. */}
          <h1 className="pf-kicker" style={{ margin: "0 0 16px", fontWeight: 400 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => { setMode("login"); setError(null); }} style={tab(mode === "login")}>Sign in</button>
            <button onClick={() => { setMode("signup"); setError(null); }} style={tab(mode === "signup")}>Create account</button>
          </div>

          <form onSubmit={submit}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.ac.uk"
              required
              className="pf-input"
              style={{ width: "100%", height: 44, padding: "0 15px", marginBottom: 14 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Password {mode === "signup" && <span style={{ fontWeight: 500, color: "var(--faint)" }}>(8+ characters)</span>}
              </span>
              {mode === "login" && (
                <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Forgot?</Link>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="pf-input"
              style={{ width: "100%", height: 44, padding: "0 15px", marginBottom: 18 }}
            />

            {error && (
              <div style={{ fontSize: 12.5, color: "var(--risk)", marginBottom: 14, lineHeight: 1.5 }}>{error}</div>
            )}

            <button className="pf-shine"
              type="submit"
              disabled={busy}
              style={{ cursor: busy ? "default" : "pointer", width: "100%", height: 46, borderRadius: 12, border: "none", background: busy ? "var(--panel3)" : "var(--accent)", color: busy ? "var(--faint)" : "var(--onAccent)", fontSize: 14, fontWeight: 600 }}
            >
              {busy ? "One moment…" : mode === "login" ? "Sign in →" : "Create account →"}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--faint)", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
          Accounts unlock the AI mentor across every phase.{" "}
          <Link href="/intel" style={{ color: "var(--accentText)", textDecoration: "none", fontWeight: 600 }}>Explore without one →</Link>
        </p>
      </div>
    </div>
  );
}
