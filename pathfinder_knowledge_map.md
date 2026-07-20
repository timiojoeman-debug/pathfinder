# PathFinder Knowledge Map

A human-readable index of everything currently in the structured knowledge model (`src/lib/knowledge/`). Generated against the networking deep slice.

## Domains

| Domain | Status | File |
|--------|--------|------|
| networking | ✅ deep slice built | `src/lib/knowledge/domains/networking.ts` |
| jobs | ✅ deep slice built | `src/lib/knowledge/domains/jobs.ts` |
| direction | ⏳ planned | — |
| cv | ⏳ planned | — |
| interview | ⏳ planned | — |
| tracker | ⏳ planned | — |
| foundations | ⏳ planned | — |

## Networking & Referrals — contents

### Principles (durable truths)
| id | statement | backed by |
|----|-----------|-----------|
| `p-referral-leverage` | Warm referral beats more cold applications | doc-hidden-market, wiki-referral-leverage |
| `p-hidden-market` | Most roles are filled before they're posted | doc-hidden-market, wiki-hidden-job-market |
| `p-information-before-ask` | Ask for information first; the referral follows | doc-coffee-chat, wiki-coffee-chat |
| `p-balanced-search` | A search stands on four pillars; it breaks at the weakest | doc-four-pillars, wiki-four-pillars |

### Frameworks
| id | name | shape |
|----|------|-------|
| `f-hiring-pyramid` | The Hiring Pyramid | internal → manager's network → referrals → cold |
| `f-coffee-chat` | The Coffee Chat | open → their story → your story → forward motion |
| `f-outreach-variants` | Three Outreach Openers | shared connection > content hook > curiosity |

### Concepts
| id | term | prerequisites | guide |
|----|------|---------------|-------|
| `c-hidden-job-market` | The Hidden Job Market | — | [guide](guide/networking/hidden-job-market.md) |
| `c-referral-leverage` | Referral Leverage | `c-hidden-job-market` | [guide](guide/networking/referral-leverage.md) |
| `c-coffee-chat` | The Coffee Chat | `c-hidden-job-market` | [guide](guide/networking/coffee-chat.md) |
| `c-four-pillars` | The Four Pillars | — | [README](guide/networking/README.md) |

### Playbooks
| id | name | goal |
|----|------|------|
| `pb-earn-referral` | Earn a Referral From Cold | turn a stranger into a referrer |
| `pb-weekly-cadence` | Sustainable Networking Cadence | keep networking compounding without burnout |

### Examples
| id | title |
|----|-------|
| `ex-alumni-opener` | The alumni opener |
| `ex-30-day-followup` | The 30-day follow-up that 95% skip |

### Metrics
| id | name | target |
|----|------|--------|
| `m-referral-rate` | Referral rate | trend up; ≥1 in 5 warm |
| `m-active-contacts` | Active warm contacts | 10–15 over a season |

### Decision rules (priority order)
| id | fires when | teaches |
|----|-----------|---------|
| `dr-all-cold` (90) | ≥10 apps & ≤2 contacts | `c-referral-leverage` |
| `dr-deadline-warm` (85) | window ≤14d & ≥1 contact | `c-hidden-job-market` |
| `dr-no-coffee-chats` (80) | ≥3 contacts & 0 chats | `c-coffee-chat` |
| `dr-beginner-start` (60) | beginner & 0 contacts | `c-hidden-job-market` |

### Learning paths
| id | level | title |
|----|-------|-------|
| `lp-networking-beginner` | beginner | Build Your Networking Foundation |
| `lp-networking-intermediate` | intermediate | Execute the Coffee Chat Engine |
| `lp-networking-advanced` | advanced | Manufacture Referrals at Scale |

## Jobs & Applications — contents

### Principles
| id | statement | backed by |
|----|-----------|-----------|
| `p-apply-early` | Timing is a strategy; day-one wins (rolling admissions) | wiki-apply-early, doc-10-interviews |
| `p-volume-cold-fails` | High-volume cold applying is now a losing strategy | wiki-job-search-system, doc-hidden-market |
| `p-targeted-tailored` | Targeted + tailored + warm beats high-volume + generic + cold | wiki-job-search-system, doc-four-pillars |

### Frameworks
| id | name | shape |
|----|------|-------|
| `f-hire` | The HIRE Framework | Direction → Intensify → Reach → Excel |
| `f-posting-calendar` | Rolling-Admissions Posting Calendar | watch early → peak (Sep) → short windows (Oct) → stragglers |
| `f-application-funnel` | The Application Funnel | apply → OA → screen/final → offer |

### Concepts
| id | term | prerequisites | guide |
|----|------|---------------|-------|
| `c-apply-early` | Apply Early | — | [guide](guide/jobs/apply-early.md) |
| `c-ai-screening` | AI Screening Reality | — | [guide](guide/jobs/ai-screening.md) |
| `c-application-funnel` | The Application Funnel | `c-apply-early` | [guide](guide/jobs/application-funnel.md) |

### Playbooks
| id | name | goal |
|----|------|------|
| `pb-application-day` | Be Ready Before Postings Open | apply within ~2 hours of a posting |
| `pb-monitoring-stack` | Build the Monitoring Stack | see openings day-one |

### Metrics
| id | name | target |
|----|------|--------|
| `m-time-to-apply` | Time-to-apply | <72h; ideally day-one |
| `m-funnel-conversion` | Funnel conversion | ~80–120 tailored → 1–4 offers |

### Decision rules (priority order)
| id | fires when | teaches |
|----|-----------|---------|
| `dr-window-closing` (95) | window ≤3 days | `c-apply-early` |
| `dr-volume-no-targeting` (70) | ≥15 apps & referral rate <10% | `c-ai-screening` |
| `dr-jobs-beginner-kit` (55) | beginner & 0 applications | `c-apply-early` |

### Learning paths
| id | level | title |
|----|-------|-------|
| `lp-jobs-beginner` | beginner | Get Ready to Apply |
| `lp-jobs-intermediate` | intermediate | Run the Application Engine |
| `lp-jobs-advanced` | advanced | Optimise the Funnel |

## Concept dependency graph

```
c-hidden-job-market
   ├──► c-referral-leverage
   └──► c-coffee-chat ──(earned via)──► c-referral-leverage
c-four-pillars (diagnostic, standalone)

c-apply-early
   └──► c-application-funnel
c-ai-screening ──(escape via)──► c-referral-leverage   [cross-domain]
```

See [pathfinder_source_registry.json](pathfinder_source_registry.json) for full provenance and [knowledge_health.md](knowledge_health.md) for gaps.
