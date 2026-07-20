# PathFinder Knowledge Architecture

How TechTalk knowledge becomes an educational execution system inside PathFinder — not a search engine, but a teacher that turns knowledge into understanding and understanding into action.

## Design goal

> PathFinder must educate **while** executing, and every claim must trace back to a canonical source.

To do that, raw vault notes are compressed into layered, machine-readable knowledge that the runtime queries compressed-first, and rendered into a human guide that teaches progressively.

## The layered model

```
 Obsidian Vault (canonical source, never mutated)
   Raw Sources/Career/*.docx ──┐  primary TechTalk masterclass material
   Wiki/concepts, topics ──────┤  distilled, wikilinked notes
   Wiki/sources ───────────────┘  provenance notes
              │
              │  transform + integrate (this build)
              ▼
 src/lib/knowledge/                         ← machine-readable knowledge model
   types.ts        the schema
   sources.ts      typed source registry (provenance)
   domains/*.ts    Principles → Frameworks → Concepts → Playbooks → Examples → Metrics → DecisionRules → LearningPaths
   engine.ts       retrieval (ordered) · decision engine · guided-answer envelope · prompt rendering
   index.ts        public API
              │
   ┌──────────┴───────────┐
   ▼                      ▼
 Runtime (the app)     guide/  (human-readable teaching layer)
   mentor-engine.ts      getting_started · roadmap · <domain>/*.md · glossary
   injects renderKnowledgeBlock()
   + the Educational Contract
```

## The retrieval order (Phase 7)

`retrieveKnowledge()` queries layers in strict order so PathFinder always prefers compressed knowledge and surfaces raw notes only as provenance:

1. **Principles** — durable truths (most compressed, most queried)
2. **Frameworks** — repeatable structures
3. **Playbooks** — executable procedures
4. **Examples** — concrete, pattern-matchable cases
5. **Sources** — canonical notes, last, as citations for what was found

It never searches raw notes first.

## The educational contract (Phase 6)

Every mentor response carries five layers, enforced both in the prompt (`buildMentorPrompt`) and in the structured `GuidedAnswer` envelope:

| Layer | Field |
|-------|-------|
| Action | `action` |
| Explanation | `explanation` |
| Learning | `learning { conceptId, term, summary }` |
| Source | `sources[]` (resolved SourceRefs) |
| Reflection | `reflection` |

## Runtime integration

- `mentor-engine.ts` maps each feature to a `Domain` (`FEATURE_DOMAIN`) and injects `renderKnowledgeBlock(userInput, domain)` into the methodology section of the prompt — compressed-first and citation-bearing. This works even when RAG/Supabase is unavailable, because the knowledge model is in-process.
- The **Educational Contract** block instructs the model to teach the principle, cite by name, and end with a reflection.
- `decide(ctx)` runs the **decision engine** over user context to produce a proactive `GuidedAnswer` nudge (condition → action → why → concept → sources → reflection).

## The decision engine (Phase 5)

Pure predicates over a small, portable `DecisionContext` (decoupled from the app's full `UserContext` for testability). Rules carry a `priority`; the highest-priority match is rendered through `guidedAnswerFromRule()` into the educational envelope. Example: *high application volume + near-zero warm contacts* → "pause volume, build 3 warm contacts," teaching `c-referral-leverage`, backed by `p-referral-leverage`.

## Why this slice first

Networking & Referrals carries the central thesis (warm beats cold; the hidden job market). It is built end-to-end as the **reference implementation**; every other domain replicates the exact file shape in `domains/`. See [pathfinder_knowledge_map.md](pathfinder_knowledge_map.md) for the current contents and [knowledge_health.md](knowledge_health.md) for coverage gaps.

## Extending to a new domain

1. Read the vault concepts/topics for the domain; add any new entries to `sources.ts` + the JSON registry.
2. Author `src/lib/knowledge/domains/<domain>.ts` against the schema.
3. Register it in `engine.ts` (`REGISTRY`).
4. Write the `guide/<domain>/` teaching files (eight-section template).
5. Add the domain to `FEATURE_DOMAIN` in `mentor-engine.ts`.
6. Extend tests in `src/lib/knowledge/__tests__/`.

## Tests

`src/lib/knowledge/__tests__/knowledge.test.ts` enforces referential integrity (every `sourceId`/`conceptId`/`principleId` resolves), retrieval order, decision-engine behaviour, and curriculum integrity. 13 tests, all passing.
