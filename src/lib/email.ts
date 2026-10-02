/**
 * Provider-agnostic transactional email.
 *
 * Uses Resend's REST API when `RESEND_API_KEY` is set (no SDK dependency). When
 * it isn't — local dev, or before a provider is configured — the email is
 * logged (including any action link) so flows are fully testable without a
 * provider. Never throws: a failed send returns `{ ok: false }` and the caller
 * decides what to surface.
 */

import { logger } from "./logger";

const FROM = process.env.EMAIL_FROM || "PathFinder <onboarding@resend.dev>";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback + what gets logged in dev (put the link here). */
  text: string;
}

export async function sendEmail({ to, subject, html, text }: EmailInput): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    // Dev / unconfigured: surface the email (and its link) in the logs.
    logger.info("email (not sent — no provider configured)", { to, subject, preview: text });
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html, text }),
    });
    if (!res.ok) {
      logger.error("email send failed", { to, subject, status: res.status });
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    logger.error("email send threw", { to, subject, error: e instanceof Error ? e.message : String(e) });
    return { ok: false };
  }
}

/**
 * Base URL for links inside emails (verification, password reset).
 *
 * This used to fall back straight to localhost, so a deployment without
 * NEXT_PUBLIC_APP_URL set — which is how it shipped — mailed real users a
 * "reset your password" button pointing at http://localhost:3000. Vercel
 * injects the host on every deployment, so derive it rather than depending on
 * someone remembering to configure it.
 *
 * Order: an explicit override wins; then the stable production domain (right
 * for emails, which outlive any single deployment); then the per-deployment
 * URL so preview builds mail working links too.
 */
function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  if (process.env.NODE_ENV === "production") {
    logger.error(
      "appUrl() fell back to localhost in production — email links will be unusable. Set NEXT_PUBLIC_APP_URL.",
    );
  }
  return "http://localhost:3000";
}

const shell = (heading: string, body: string, cta: { label: string; href: string }) => `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#382C20;">
    <div style="font-weight:700;font-size:18px;margin-bottom:16px;">PathFinder</div>
    <h1 style="font-size:20px;margin:0 0 12px;">${heading}</h1>
    <p style="font-size:14px;line-height:1.6;color:#6C5D4B;">${body}</p>
    <a href="${cta.href}" style="display:inline-block;margin:18px 0;padding:12px 22px;background:#9C5730;color:#F7F1E4;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">${cta.label}</a>
    <p style="font-size:12px;color:#A08E77;line-height:1.6;">If the button doesn't work, paste this link into your browser:<br>${cta.href}</p>
  </div>`;

export function verificationEmail(token: string): Omit<EmailInput, "to"> {
  const href = `${appUrl()}/verify-email?token=${token}`;
  return {
    subject: "Verify your PathFinder email",
    html: shell("Confirm your email", "Welcome to PathFinder. Confirm this address to secure your account.", { label: "Verify email", href }),
    text: `Verify your PathFinder email: ${href}`,
  };
}

export function passwordResetEmail(token: string): Omit<EmailInput, "to"> {
  const href = `${appUrl()}/reset-password?token=${token}`;
  return {
    subject: "Reset your PathFinder password",
    html: shell("Reset your password", "We received a request to reset your password. This link expires in 30 minutes. If it wasn't you, ignore this email.", { label: "Reset password", href }),
    text: `Reset your PathFinder password (expires in 30m): ${href}`,
  };
}
