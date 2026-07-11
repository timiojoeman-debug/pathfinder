/**
 * Single-use security tokens for email verification and password reset.
 *
 * The raw token travels in the emailed link; only its SHA-256 hash is stored,
 * so a database leak can't be replayed. Tokens are single-use and time-boxed.
 */

/** Cryptographically-strong URL-safe token (32 bytes → 43 base64url chars). */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 hex hash of a token — what we persist and compare against. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const TOKEN_TTL_MS = {
  verifyEmail: 1000 * 60 * 60 * 24, // 24h
  passwordReset: 1000 * 60 * 30, // 30m
} as const;
