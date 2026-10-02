import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getListingActive } from "@/lib/db/job-listings";
import { probeStatus, statusToFreshness, type Freshness } from "@/lib/jobs/freshness";
import { hit } from "@/lib/rate-limit";

/**
 * Has a saved role's posting closed? Signed-in only, and deliberately outside
 * /api/jobs/ so it is not billed against the AI daily quota.
 *
 * Roles whose URL is in the job cache are answered from it (cheap, strong
 * evidence). Other links are probed server-side only when the client asks
 * (`probe`, which it does at most weekly) and only a 404/410 reads as "may have
 * closed". Nothing here deletes or changes a role; it only reports.
 */

// Probing fetches third-party URLs, so the whole request is bounded well inside maxDuration.
export const maxDuration = 30;
const TOTAL_DEADLINE_MS = 20_000;
const MAX_URLS = 20;
/** One call cannot be used to hammer a single host. */
const MAX_PROBES_PER_HOST = 3;
const PROBE_CONCURRENCY = 5;
/** A probe fetches third-party URLs, so it gets its own small hourly budget per user. */
const PROBE_LIMIT_PER_HOUR = 6;

const Schema = z.object({
  urls: z.array(z.string().max(2000)).max(MAX_URLS),
  probe: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = await readBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const urls = [...new Set(parsed.data.urls)];

  // Maps, not objects: a URL like "constructor" or "__proto__" must not hit inherited keys.
  const statuses = new Map<string, Freshness>();
  const feed = await getListingActive(urls);
  const rest: string[] = [];
  for (const u of urls) {
    if (feed.has(u)) statuses.set(u, feed.get(u) ? "ok" : "closed");
    else rest.push(u);
  }

  let probe = Boolean(parsed.data.probe) && rest.length > 0;
  if (probe) {
    const rl = await hit(`freshness:${user.userId}`, PROBE_LIMIT_PER_HOUR, 3_600_000);
    if (!rl.ok) probe = false; // over budget: answer from the cache alone rather than failing
  }

  const deadline = Date.now() + TOTAL_DEADLINE_MS;
  // Aborted at the deadline: cancels requests in flight and stops probes between redirect hops.
  const abort = new AbortController();
  const deadlineTimer = setTimeout(() => abort.abort(), TOTAL_DEADLINE_MS);
  const perHost = new Map<string, number>();
  let next = 0;
  async function worker() {
    while (next < rest.length) {
      const u = rest[next++];
      let host = "";
      try {
        host = new URL(u).hostname;
      } catch {
        /* unparseable: probeStatus refuses it */
      }
      const used = perHost.get(host) ?? 0;
      perHost.set(host, used + 1);
      const skip = !probe || Date.now() > deadline || used >= MAX_PROBES_PER_HOST;
      if (skip) {
        statuses.set(u, "unknown");
        continue;
      }
      // A probe still running at the deadline is abandoned, and the abort signal destroys its request.
      let timer: ReturnType<typeof setTimeout>;
      const late = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), Math.max(0, deadline - Date.now()));
      });
      const status = await Promise.race([probeStatus(u, undefined, abort.signal), late]).finally(() => clearTimeout(timer));
      statuses.set(u, statusToFreshness(status));
    }
  }
  try {
    await Promise.all(Array.from({ length: PROBE_CONCURRENCY }, worker));
  } finally {
    clearTimeout(deadlineTimer);
  }

  return NextResponse.json({ statuses: Object.fromEntries(statuses), probed: probe });
}
