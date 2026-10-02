import { postedAgo } from "@/lib/jobs/display";

/** The grey line on a job card: location, source label, and how long ago it was posted (when known). */
export function JobMeta({ meta, postedAt, now }: { meta: string; postedAt?: string | null; now?: number }) {
  const age = postedAgo(postedAt, now);
  return (
    <div className="pf-mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 5 }}>
      {age ? `${meta} · ${age}` : meta}
    </div>
  );
}
