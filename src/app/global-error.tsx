"use client";

import "./globals.css";
import "./pf-theme.css";

/*
 * Last resort, shown only when the root layout itself fails, so it cannot rely
 * on the layout's fonts, theme controller or providers. Kept deliberately
 * minimal: paper tokens, the serif fallback, a retry and a way home.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="pf" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "min(420px, 94vw)", textAlign: "center" }}>
            <h1 className="pf-display" style={{ fontSize: 32, margin: "0 0 12px" }}>PathFinder hit an error.</h1>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
              Try again, or reload the page.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ cursor: "pointer", height: 46, padding: "0 22px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--onAccent)", fontSize: 14, fontWeight: 600 }}
            >
              Try again
            </button>
            {/* A plain <a>, not next/link: the router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ display: "block", marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--accentText)", textDecoration: "none" }}>Back to home</a>
            {error.digest && (
              <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 18 }}>Reference: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
