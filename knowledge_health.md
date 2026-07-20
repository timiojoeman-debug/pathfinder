# Knowledge Health

Governance report for the PathFinder Knowledge Model. Tracks coverage, evidence quality, duplication, and staleness, with suggested improvements. Regenerate when domains are added.

_Last reviewed: 2026-06-11 · Slices: networking (deep), jobs (deep)._

## Coverage scorecard

| Domain | Concepts | Principles | Playbooks | Rules | Guide | Path | Wired |
|--------|:-------:|:----------:|:---------:|:-----:|:-----:|:----:|:-----:|
| networking | 4 | 4 | 2 | 4 | ✅ | ✅ | ✅ |
| jobs | 3 | 3 | 2 | 3 | ✅ | ✅ | n/a |
| direction | 0 | 0 | 0 | 0 | — | — | (map only) |
| cv | 0 | 0 | 0 | 0 | — | — | (map only) |
| interview | 0 | 0 | 0 | 0 | — | — | (map only) |
| tracker | 0 | 0 | 0 | 0 | — | — | (map only) |
| foundations | 0 | 0 | 0 | 0 | — | — | (map only) |

"Wired" = `FEATURE_DOMAIN` in `mentor-engine.ts` routes a mentor feature to the domain. Networking features are wired. The **jobs** domain is marked **n/a**: the jobs page uses non-mentor API routes (`/jobs/search`, `/jobs/analyze`), so there is no mentor feature to map yet — the domain is fully queryable via `retrieveKnowledge`/`decide` and will auto-inject the moment a jobs mentor feature exists.

## Missing educational coverage (highest priority)

These vault concepts are referenced by the registry/guide/glossary but **not yet in the structured model**. They are the next build targets, ordered by leverage:

1. **`c-proof-of-work`** (cv) — the 2026 hiring bar; cross-cuts CV, LinkedIn, interview. Source: `wiki-proof-of-work`.
2. **`c-starl`** (interview) — behavioural-answer framework; `methodology/interview-prep.ts` already has adjacent data to reconcile.
3. **AIM framework / `c-ai-fluency`** (interview/foundations) — "how do you use AI?" answer + the new hireable trait.
4. **`c-compounding`** (foundations) — the habit engine under every cadence.
5. **`c-ats-optimization`** (cv) — the CV-screen gate; pairs with proof-of-work.

✅ **Resolved since last review:** `c-apply-early` is now built (jobs slice), closing the glossary's only dangling concept marker.

## Evidence quality

- **High-confidence** (direct numeric evidence in source): all 4 networking principles, all 4 concepts. Good.
- **Medium-confidence sources** not yet load-bearing: `doc-outsmart-ai`, `doc-career-os`, `wiki-application-strategy`. Mine these when building the jobs/CV slices rather than now.
- **Weakest evidence link:** `p-balanced-search` evidence is qualitative (diagnostic symptoms), not numeric — acceptable for a framework principle, but flag if it ever drives a high-priority rule.

## Duplication / reconciliation risk

- **`src/lib/methodology/networking.ts` vs `src/lib/knowledge/domains/networking.ts`** — overlapping networking content (hiring pyramid, outreach variants, cadence) now lives in two places. *Not yet merged* to avoid breaking existing prompt builders. **Recommendation:** once 2–3 domains are sliced, migrate `methodology/*` consumers to the knowledge model and retire the duplicate, or have `methodology/` re-export from `knowledge/`.
- `methodology/coffee-chat.ts`, `four-pillars.ts` similarly overlap the new concepts — same migration applies.

## Stale / unused

- No stale guidance detected in the networking slice (all sources current as of vault `updated:` dates 2026-06-06/10).
- **Unused-but-defined:** `m-referral-rate` and `m-active-contacts` metrics are not yet surfaced anywhere in the app UI/tracker. Suggested: wire them into the Phase 6 tracker so the decision engine's "measure referral rate, not volume" advice is actionable.

## Suggested next actions

1. Build `c-proof-of-work` (cv) next — highest cross-cutting leverage and unblocks the CV slice.
2. Surface the networking + jobs metrics (`m-referral-rate`, `m-time-to-apply`, funnel) in the tracker UI so decision-engine advice is actionable.
3. After the cv slice lands, reconcile `methodology/` with `knowledge/` to remove duplication (now spans networking + jobs).
4. Add a CI check that runs `knowledge.test.ts` so referential integrity can't regress.
