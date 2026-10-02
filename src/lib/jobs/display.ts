/** Small pure helpers for how the Jobs page presents search results. */

/**
 * "posted 3 days ago" from an ISO timestamp, or null when there is no usable
 * date. The age is never guessed: a source that does not say when a role was
 * published shows no age at all.
 */
export function postedAgo(postedAt: string | null | undefined, now: number = Date.now()): string | null {
  if (!postedAt) return null;
  const t = Date.parse(postedAt);
  if (Number.isNaN(t)) return null;
  const days = Math.max(0, Math.floor((now - t) / 86_400_000));
  if (days === 0) return "posted today";
  return days === 1 ? "posted 1 day ago" : `posted ${days} days ago`;
}

/** A British-English browser, and a student who has not typed a location, default to UK roles. */
export function ukByDefault(language: string | null | undefined): boolean {
  return /^en-gb$/i.test(language ?? "");
}
