/**
 * Has a saved role's posting closed?
 *
 * Two evidence levels, kept apart so the UI never overstates:
 *  - "closed": the URL is in the job cache and its row is inactive, i.e. the
 *    employer's own board stopped listing it.
 *  - "may-have-closed": a server-side status check on any other link got 404 or 410.
 *    Many sites answer bots with 403/429/5xx, and a 200 proves little (soft 404s),
 *    so only a hard "gone" counts and everything else is "unknown".
 *
 * The status check fetches a URL a user supplied, so it is an SSRF surface:
 *  - only http(s) on the protocol's own port, no credentials in the URL;
 *  - the address is validated AT CONNECT TIME by a custom `lookup` that checks every
 *    address a name resolves to, so a DNS answer cannot change between check and use;
 *  - every redirect hop is re-validated, and only the status code is read.
 * It uses node:http(s) rather than fetch because `fetch` takes no per-request lookup and
 * undici is not a declared dependency, so a custom dispatcher is not safely importable.
 */

import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

export type Freshness = "closed" | "may-have-closed" | "ok" | "unknown";

const PROBE_TIMEOUT_MS = 5_000;
const DNS_TIMEOUT_MS = 3_000;
const MAX_REDIRECTS = 3;

function ipv4Private(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // 192.0.0.0/24 and 192.0.2.0/24 only
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

/**
 * True for any address a user-supplied URL must not reach. IPv4 is a deny-list of the private
 * ranges; IPv6 is an allow-list: only global unicast 2000::/3, minus 6to4 (2002::/16), Teredo
 * (2001::/32) and the documentation range. That rejects ::1, ::, link-local, unique-local,
 * IPv4-mapped and IPv4-compatible forms, NAT64 (64:ff9b::/96) and zone-id forms by construction.
 */
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return ipv4Private(ip);
  if (v !== 6 || ip.includes("%")) return true; // not an address, or carries a zone id: refuse
  const parts = ip.toLowerCase().split(":");
  const first = parseInt(parts[0] || "0", 16);
  if (first < 0x2000 || first > 0x3fff) return true; // outside 2000::/3
  if (first === 0x2002) return true; // 6to4 embeds an IPv4 address
  const second = parts[1] === "" ? 0 : parseInt(parts[1], 16); // "2001::" expands to 2001:0:...
  if (first === 0x2001 && (second === 0 || second === 0xdb8)) return true; // Teredo, documentation
  return false;
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Resolve a host and return its addresses, throwing if ANY of them (or the host itself) is not public. */
async function resolvePublic(host: string): Promise<{ address: string; family: number }[]> {
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("address not allowed");
    return [{ address: host, family: isIP(host) }];
  }
  const addrs = await withTimeout(lookup(host, { all: true }), DNS_TIMEOUT_MS, "dns lookup");
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("address not allowed");
  return addrs;
}

type LookupCallback = (err: Error | null, address?: string | { address: string; family: number }[], family?: number) => void;

/**
 * `lookup` for node:http(s). The socket connects to exactly the address validated here, which
 * closes the window a DNS-rebinding host would use between a pre-check and the connection.
 */
export function guardedLookup(hostname: string, options: { all?: boolean } | number | undefined, callback: LookupCallback): void {
  const all = typeof options === "object" && options !== null && options.all;
  resolvePublic(hostname).then(
    (addrs) => (all ? callback(null, addrs) : callback(null, addrs[0].address, addrs[0].family)),
    (err: Error) => callback(err),
  );
}

/** Throws unless `raw` is a plain public http(s) URL. A fast fail; the connection re-checks. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid url");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocol not allowed");
  if (u.username || u.password) throw new Error("credentials not allowed");
  // URL drops a port equal to the scheme's default, so any port left here must equal it: https://x:80 is refused.
  if (u.port && u.port !== (u.protocol === "https:" ? "443" : "80")) throw new Error("port not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("host not allowed");
  }
  await resolvePublic(host);
  return u;
}

export interface ProbeResponse {
  status: number;
  location?: string;
}

/**
 * One request, status and Location only. The body is never read.
 *
 * Two bounds: the caller's `signal` (the route's overall deadline) and a hard 5s timer of its own.
 * The http `timeout` option is only an idle timeout, so a host dripping a byte every few seconds
 * would hold the socket open; the timer destroys the request regardless.
 */
export function nodeSend(u: URL, method: "HEAD" | "GET", signal?: AbortSignal): Promise<ProbeResponse> {
  return new Promise((resolve, reject) => {
    const done = () => clearTimeout(timer);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        method,
        hostname: u.hostname.replace(/^\[|\]$/g, ""),
        port: u.port || undefined,
        path: `${u.pathname}${u.search}`,
        headers: { "user-agent": "PathFinder-link-check/1.0" },
        lookup: guardedLookup as never,
        timeout: PROBE_TIMEOUT_MS,
        signal,
      },
      (res) => {
        done();
        const loc = res.headers.location;
        res.destroy();
        resolve({ status: res.statusCode ?? 0, location: typeof loc === "string" ? loc : undefined });
      },
    );
    const timer = setTimeout(() => req.destroy(new Error("timeout")), PROBE_TIMEOUT_MS);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => {
      done();
      reject(err);
    });
    req.end();
  });
}

/**
 * The HTTP status of `raw` (HEAD, then GET if HEAD is refused), following up to
 * 3 redirects with every hop re-validated. null when the URL is refused or unreachable, or
 * once `signal` aborts (checked between hops, and passed down to cancel the request in flight).
 *
 * Following a redirect from https to http is deliberate: only the status code is read, nothing
 * sensitive is sent (no cookies or credentials), and a closed posting often redirects that way.
 */
export async function probeStatus(
  raw: string,
  send: (u: URL, method: "HEAD" | "GET", signal?: AbortSignal) => Promise<ProbeResponse> = nodeSend,
  signal?: AbortSignal,
): Promise<number | null> {
  let url = raw;
  let method: "HEAD" | "GET" = "HEAD";
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (signal?.aborted) return null;
    try {
      const u = await assertPublicHttpUrl(url);
      const res = await send(u, method, signal);
      if (res.status >= 300 && res.status < 400) {
        if (!res.location) return res.status;
        url = new URL(res.location, u).href;
        continue;
      }
      if (method === "HEAD" && (res.status === 405 || res.status === 501)) {
        method = "GET";
        hop--; // same URL again, not a redirect
        continue;
      }
      return res.status;
    } catch {
      return null;
    }
  }
  return null; // redirect loop
}

/** 404 and 410 are the only statuses read as "gone". */
export function statusToFreshness(status: number | null): Freshness {
  return status === 404 || status === 410 ? "may-have-closed" : "unknown";
}
