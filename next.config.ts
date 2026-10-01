import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Production security headers. CSP is intentionally pragmatic for now — the app
 * is inline-style heavy and relies on Next's inline hydration bootstrap, so
 * `'unsafe-inline'` is permitted for styles/scripts. The hardening path is a
 * per-request nonce (tracked as a follow-up); everything else is strict.
 */
const csp = [
  "default-src 'self'",
  // Next injects a small inline bootstrap; dev/Turbopack additionally needs eval.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  // The landing streams its hero video into a blob URL so scroll-scrubbing never stalls on a range request.
  "media-src 'self' blob:",
  "font-src 'self' data:",
  // Server routes proxy OpenAI/job APIs; the browser talks to same-origin + Supabase.
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS only takes effect over HTTPS; harmless otherwise. 1 year + preload.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
