import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";

/**
 * Fetch a job-posting URL server-side and return its extracted text, so a
 * student can paste a link instead of the whole description.
 *
 * This grounds the downstream analysis in the REAL posting text — it never asks
 * a model to describe a URL it can't read (which invents requirements). If the
 * page can't be read (JS-rendered board, blocked, timeout), it fails with a
 * clear "paste it instead" message rather than guessing.
 *
 * SSRF guards:
 *   - http/https only; embedded credentials (user:pass@) rejected.
 *   - The host must not be loopback / private / link-local — checked for IPv4,
 *     IPv6 literals (incl. IPv4-mapped), and localhost/.local names.
 *   - Redirects are followed MANUALLY and re-validated at every hop, so a public
 *     URL can't 302 into the metadata endpoint or an internal host. Capped at
 *     MAX_REDIRECTS.
 *   - Only extracted public text is ever returned; status/headers are not.
 * Residual: a DNS name that resolves to a private IP (DNS rebinding) isn't
 * caught here — fetch doesn't expose the connect IP to pin it. Blocking IP
 * literals + re-checking redirects covers the practical cases.
 */

const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 8000;
const UA = "Mozilla/5.0 (compatible; PathFinderBot/1.0)";

const BLOCKED_IPV4 =
  /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/;

/** Loopback / private / link-local host? Covers IPv4, IPv6 literals, and names. */
export function isBlockedHost(hostname: string): boolean {
  let h = hostname.toLowerCase().trim();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1); // unwrap IPv6 literal
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;

  if (h.includes(":")) {
    // IPv6 literal. WHATWG URL normalises IPv4-mapped forms to hex
    // (::ffff:169.254.169.254 → ::ffff:a9fe:a9fe), so match the mapped prefix
    // wholesale rather than the dotted address — a real job posting is never at
    // an IPv4-mapped IPv6 literal.
    if (h === "::1" || h === "::") return true; // loopback / unspecified
    if (h.startsWith("fe80:")) return true; // link-local
    if (/^f[cd][0-9a-f]{0,2}:/.test(h)) return true; // unique-local fc00::/7
    if (h.startsWith("::ffff:")) return true; // IPv4-mapped
    return false; // other (global) IPv6 is allowed
  }

  // IPv4 literal or DNS name.
  if (h === "0.0.0.0") return true;
  return BLOCKED_IPV4.test(h);
}

/** Thrown when a URL (initial or a redirect target) fails the SSRF guard. */
class BlockedUrlError extends Error {}

/** Validate scheme + credentials + host; throws BlockedUrlError on failure. */
function assertFetchable(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("Only http/https links are supported.");
  }
  if (url.username || url.password) {
    throw new BlockedUrlError("Links with embedded credentials aren't allowed.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new BlockedUrlError("That host isn't allowed.");
  }
}

/**
 * Fetch `start`, following redirects manually so each hop is re-validated.
 * Returns the first non-redirect response. Throws BlockedUrlError if any hop
 * points somewhere disallowed.
 */
async function fetchWithGuardedRedirects(start: URL, signal: AbortSignal): Promise<Response> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url.toString(), {
      signal,
      redirect: "manual",
      headers: { "User-Agent": UA },
    });

    if (res.status < 300 || res.status >= 400) return res;

    const location = res.headers.get("location");
    if (!location) return res; // 3xx without a target — let content checks fail it

    let next: URL;
    try {
      next = new URL(location, url); // resolve relative redirects against the current URL
    } catch {
      throw new BlockedUrlError("The link redirected somewhere invalid.");
    }
    assertFetchable(next); // re-run the full guard on the redirect target
    url = next;
  }
  throw new BlockedUrlError("The link redirected too many times.");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const raw = typeof __p.data.url === "string" ? __p.data.url.trim() : "";

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Enter a valid URL (including https://)." }, { status: 400 });
    }

    try {
      assertFetchable(url);
    } catch (e) {
      if (e instanceof BlockedUrlError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchWithGuardedRedirects(url, controller.signal);
    } catch (e) {
      // A blocked redirect is a client error (bad link), not a server fault.
      if (e instanceof BlockedUrlError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Couldn't read that page (HTTP ${res.status}). Paste the description below instead.` },
        { status: 502 },
      );
    }
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html") && !ctype.includes("text/plain")) {
      return NextResponse.json(
        { error: "That link isn't a readable job posting. Paste the description below instead." },
        { status: 415 },
      );
    }

    const html = (await res.text()).slice(0, 200_000);
    const text = stripHtml(html).slice(0, 8000);
    if (text.length < 120) {
      return NextResponse.json(
        { error: "Couldn't extract enough text (the page may need JavaScript). Paste the description below instead." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "The page took too long to load. Paste the description below instead." : "Couldn't fetch that link. Paste the description below instead." },
      { status: 502 },
    );
  }
}
