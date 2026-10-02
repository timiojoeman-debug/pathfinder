import { postedAgo } from "@/lib/jobs/display";
import type { Freshness } from "@/lib/jobs/freshness";

/** The grey line on a job card: location, source label, and how long ago it was posted (when known). */
export function JobMeta({ meta, postedAt, now }: { meta: string; postedAt?: string | null; now?: number }) {
  const age = postedAgo(postedAt, now);
  return (
    <div className="pf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 5 }}>
      {age ? `${meta} · ${age}` : meta}
    </div>
  );
}

/** Says so when a saved role's posting has closed. Informational only: the role is never removed. */
export function FreshnessNote({ status }: { status?: Freshness }) {
  if (status !== "closed" && status !== "may-have-closed") return null;
  return (
    <div role="status" className="pf-mono" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--warn, var(--muted))", marginTop: 5 }}>
      {status === "closed" ? "This posting has closed" : "This posting may have closed"}
    </div>
  );
}
