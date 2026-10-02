"use client";

/**
 * Settings — account, appearance, and data & privacy controls (GDPR export +
 * account deletion). This is the home for the legally-required data rights the
 * audit flagged as missing.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/lib/stores";
import { setTheme, useThemeMode } from "@/lib/theme";
import { PageHeader, Panel, Kicker } from "@/components/pf/ui";

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderTop: "1px solid var(--line2)", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const btn = (variant: "solid" | "outline" | "danger"): React.CSSProperties => ({
  cursor: "pointer", height: 38, padding: "0 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
  border: variant === "outline" ? "1px solid var(--lineStrong)" : variant === "danger" ? "1px solid color-mix(in srgb,var(--risk) 40%,transparent)" : "none",
  background: variant === "solid" ? "var(--accent)" : variant === "danger" ? "color-mix(in srgb,var(--risk) 10%,transparent)" : "var(--panel)",
  color: variant === "solid" ? "#F7F1E4" : variant === "danger" ? "var(--risk)" : "var(--fg)",
});

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const mode = useThemeMode();
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggleTheme = () => setTheme(mode === "dark" ? "light" : "dark");

  const exportData = async () => {
    setExporting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) { setMsg("Export failed — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pathfinder-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg("Export failed — please try again.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      // Clear local data regardless — the account is gone (or never existed server-side).
      try { localStorage.removeItem("pathfinder-redesign-v1"); } catch { /* ignore */ }
      await logout().catch(() => {});
      if (res.ok) {
        router.push("/");
      } else {
        setMsg("Deletion failed — please try again.");
        setDeleting(false);
      }
    } catch {
      setMsg("Deletion failed — please try again.");
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader label="Account" title="Settings">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0 }}>Manage your account, appearance, and your data.</p>
      </PageHeader>

      {msg && (
        <div style={{ fontSize: 13, color: "var(--risk)", marginBottom: 16 }}>{msg}</div>
      )}

      {/* Account */}
      <Panel style={{ padding: "20px 24px", marginBottom: 18 }}>
        <Kicker style={{ marginBottom: 4 }}>Account</Kicker>
        {user ? (
          <>
            <Row title="Signed in as" desc={user.email}>
              <button onClick={() => void logout().then(() => router.push("/"))} style={btn("outline")}>Sign out</button>
            </Row>
          </>
        ) : (
          <Row title="You&apos;re browsing as a guest" desc="Sign in to sync your journey across devices and unlock the AI mentor.">
            <Link href="/login" style={{ ...btn("solid"), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Sign in →</Link>
          </Row>
        )}
      </Panel>

      {/* Appearance */}
      <Panel style={{ padding: "20px 24px", marginBottom: 18 }}>
        <Kicker style={{ marginBottom: 4 }}>Appearance</Kicker>
        <Row title="Theme" desc="Warm paper by day, night for focus. Your choice is remembered on this device.">
          <button onClick={toggleTheme} style={btn("outline")}>
            {mode === "dark" ? "Switch to Paper" : "Switch to Night"}
          </button>
        </Row>
      </Panel>

      {/* Data & Privacy */}
      <Panel style={{ padding: "20px 24px", marginBottom: 18 }}>
        <Kicker style={{ marginBottom: 4 }}>Data &amp; privacy</Kicker>
        <Row title="Export my data" desc="Download everything PathFinder holds about you as a JSON file.">
          <button onClick={exportData} disabled={exporting} style={btn("outline")}>
            {exporting ? "Preparing…" : "Export"}
          </button>
        </Row>
        <Row title="Privacy policy & terms" desc="How we handle your data, and the terms of use.">
          <span style={{ display: "flex", gap: 10 }}>
            <Link href="/privacy" style={{ ...btn("outline"), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ ...btn("outline"), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Terms</Link>
          </span>
        </Row>
        <Row title="Delete my account" desc="Permanently remove your account and all associated data. This cannot be undone.">
          <button onClick={() => { setConfirmOpen(true); setConfirmText(""); }} style={btn("danger")}>Delete account</button>
        </Row>
      </Panel>

      {/* Delete confirmation */}
      {confirmOpen && (
        <>
          <div onClick={() => setConfirmOpen(false)} className="pf-anim-fade" style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 80 }} />
          <div className="pf-anim-up" style={{ position: "fixed", top: "26vh", left: "50%", transform: "translateX(-50%)", width: "min(440px,92vw)", zIndex: 81, background: "var(--panelSolid)", border: "1px solid var(--lineStrong)", borderRadius: 16, padding: "24px 26px", boxShadow: "0 30px 70px rgba(30,22,12,.35)" }}>
            <h2 className="pf-display-sm" style={{ fontSize: 24, margin: "0 0 8px" }}>Delete your account?</h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px" }}>
              This permanently deletes your account and every application, contact, CV analysis, and interview log tied to it. There is no undo. Type <strong style={{ color: "var(--fg)" }}>DELETE</strong> to confirm.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="pf-input"
              style={{ width: "100%", height: 44, padding: "0 15px", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmOpen(false)} style={btn("outline")}>Cancel</button>
              <button
                onClick={deleteAccount}
                disabled={confirmText !== "DELETE" || deleting}
                style={{ ...btn("danger"), background: confirmText === "DELETE" ? "var(--risk)" : "color-mix(in srgb,var(--risk) 10%,transparent)", color: confirmText === "DELETE" ? "#fff" : "var(--risk)", opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
