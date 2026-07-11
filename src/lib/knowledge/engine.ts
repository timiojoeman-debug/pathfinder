/**
 * Knowledge engine — the runtime that makes PathFinder behave like an educator
 * rather than a search engine.
 *
 * Responsibilities:
 *   1. Register domain knowledge and index it for lookup.
 *   2. Retrieve in the mandated order: Principles → Frameworks → Playbooks →
 *      Examples → Sources (compressed knowledge first, raw notes last).
 *   3. Run the decision engine: condition → educational recommendation.
 *   4. Emit the Phase-6 guided-answer envelope (action / explanation / learning
 *      / sources / reflection).
 *   5. Render a compact knowledge block for injection into the mentor prompt.
 */
import type {
  Concept,
  DecisionContext,
  DecisionRule,
  Domain,
  DomainKnowledge,
  Example,
  Framework,
  GuidedAnswer,
  LearningPath,
  Playbook,
  Principle,
  SourceRef,
} from './types';
import { resolveSources } from './sources';
import { NETWORKING_KNOWLEDGE } from './domains/networking';
import { JOBS_KNOWLEDGE } from './domains/jobs';
import { CV_KNOWLEDGE } from './domains/cv';

/** All registered domains. Add new domain modules here as the slice expands. */
const REGISTRY: DomainKnowledge[] = [NETWORKING_KNOWLEDGE, JOBS_KNOWLEDGE, CV_KNOWLEDGE];

/** Flattened indexes built once at module load. */
const principleIndex = new Map<string, Principle>();
const frameworkIndex = new Map<string, Framework>();
const conceptIndex = new Map<string, Concept>();
const playbookIndex = new Map<string, Playbook>();
const exampleIndex = new Map<string, Example>();
const ruleIndex = new Map<string, DecisionRule>();
const pathIndex = new Map<string, LearningPath>();

for (const dk of REGISTRY) {
  for (const p of dk.principles) principleIndex.set(p.id, p);
  for (const f of dk.frameworks) frameworkIndex.set(f.id, f);
  for (const c of dk.concepts) conceptIndex.set(c.id, c);
  for (const pb of dk.playbooks) playbookIndex.set(pb.id, pb);
  for (const e of dk.examples) exampleIndex.set(e.id, e);
  for (const r of dk.decisionRules) ruleIndex.set(r.id, r);
  for (const lp of dk.learningPaths) pathIndex.set(lp.id, lp);
}

// ── Lookups ────────────────────────────────────────────────────────────
export function getConcept(id: string): Concept | undefined {
  return conceptIndex.get(id);
}
export function getPrinciple(id: string): Principle | undefined {
  return principleIndex.get(id);
}
export function getLearningPaths(domain: Domain): LearningPath[] {
  return [...pathIndex.values()].filter((lp) => lp.domain === domain);
}
export function listDomains(): Domain[] {
  return [...new Set(REGISTRY.map((d) => d.domain))];
}

/**
 * A relevance bundle for a query, assembled in the mandated retrieval order.
 * Empty arrays mean "nothing matched at that layer" — callers degrade
 * gracefully rather than erroring.
 */
export interface RetrievalResult {
  domain: Domain | null;
  principles: Principle[];
  frameworks: Framework[];
  playbooks: Playbook[];
  examples: Example[];
  sources: SourceRef[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'how',
  'do', 'i', 'my', 'me', 'is', 'are', 'should', 'can', 'what', 'why', 'when',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Score how many query tokens appear in a haystack string. */
function overlapScore(tokens: string[], haystack: string): number {
  const hay = haystack.toLowerCase();
  return tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
}

/**
 * Retrieve relevant knowledge for a free-text query, optionally scoped to a
 * domain. Compressed layers (principles, frameworks) are queried first; raw
 * source notes are surfaced last, only as provenance for what was already
 * found. This enforces "prefer compressed knowledge; do not search raw notes
 * first."
 */
export function retrieveKnowledge(
  query: string,
  domain?: Domain,
  limit = 3,
): RetrievalResult {
  const tokens = tokenize(query);

  const rank = <T extends { domain: Domain }>(
    items: T[],
    text: (item: T) => string,
  ): T[] =>
    (domain ? items.filter((i) => i.domain === domain) : items)
      .map((item) => ({ item, score: overlapScore(tokens, text(item)) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.item);

  const principles = rank(
    [...principleIndex.values()],
    (p) => `${p.statement} ${p.rationale} ${p.evidence.join(' ')}`,
  );
  const frameworks = rank(
    [...frameworkIndex.values()],
    (f) => `${f.name} ${f.purpose} ${f.appliesWhen} ${f.steps.map((s) => s.label).join(' ')}`,
  );
  const playbooks = rank(
    [...playbookIndex.values()],
    (pb) => `${pb.name} ${pb.goal} ${pb.whenToUse} ${pb.steps.map((s) => s.action).join(' ')}`,
  );
  const examples = rank(
    [...exampleIndex.values()],
    (e) => `${e.title} ${e.scenario} ${e.goodMove}`,
  );

  // Sources come last: gather provenance from whatever the upper layers found.
  const sourceIds = new Set<string>();
  for (const p of principles) p.sourceIds.forEach((id) => sourceIds.add(id));
  for (const f of frameworks) f.sourceIds.forEach((id) => sourceIds.add(id));
  for (const pb of playbooks) pb.sourceIds.forEach((id) => sourceIds.add(id));

  return {
    domain: domain ?? (principles[0]?.domain ?? frameworks[0]?.domain ?? null),
    principles,
    frameworks,
    playbooks,
    examples,
    sources: resolveSources([...sourceIds]),
  };
}

/**
 * Run the decision engine over a user context. Returns the highest-priority
 * matching rule rendered as a guided-answer envelope, or null if nothing fires.
 */
export function decide(ctx: DecisionContext): GuidedAnswer | null {
  const candidates = [...ruleIndex.values()]
    .filter((r) => (ctx.domain ? r.domain === ctx.domain : true))
    .filter((r) => {
      try {
        return r.match(ctx);
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.priority - a.priority);

  const rule = candidates[0];
  if (!rule) return null;
  return guidedAnswerFromRule(rule);
}

/** Build the Phase-6 envelope from a decision rule. */
export function guidedAnswerFromRule(rule: DecisionRule): GuidedAnswer {
  const concept = conceptIndex.get(rule.teachesConceptId);
  const principle = principleIndex.get(rule.principleId);
  const sourceIds = new Set<string>();
  concept?.sourceIds.forEach((id) => sourceIds.add(id));
  principle?.sourceIds.forEach((id) => sourceIds.add(id));

  return {
    action: rule.recommend,
    explanation: rule.rationale,
    learning: {
      conceptId: rule.teachesConceptId,
      term: concept?.term ?? rule.teachesConceptId,
      summary: concept?.definition ?? '',
    },
    sources: resolveSources([...sourceIds]),
    reflection: concept
      ? `Where in your own search is "${concept.term}" weakest right now — and what is one move this week to strengthen it?`
      : 'What is the single highest-leverage action you are currently avoiding?',
  };
}

/**
 * Render a compact, citation-bearing knowledge block for injection into the
 * mentor prompt. Ordered compressed-first; every line is traceable. Returns ''
 * when nothing relevant is found so the prompt stays clean.
 */
export function renderKnowledgeBlock(query: string, domain?: Domain): string {
  const r = retrieveKnowledge(query, domain);
  if (
    r.principles.length === 0 &&
    r.frameworks.length === 0 &&
    r.playbooks.length === 0
  ) {
    return '';
  }

  const lines: string[] = ['RELEVANT TECHTALK KNOWLEDGE (cite these by name):'];

  if (r.principles.length) {
    lines.push('Principles:');
    for (const p of r.principles) {
      lines.push(`- ${p.statement} (${p.evidence[0] ?? ''})`);
    }
  }
  if (r.frameworks.length) {
    lines.push('Frameworks:');
    for (const f of r.frameworks) {
      lines.push(`- ${f.name}: ${f.steps.map((s) => s.label).join(' → ')}`);
    }
  }
  if (r.playbooks.length) {
    lines.push('Playbooks:');
    for (const pb of r.playbooks) {
      lines.push(`- ${pb.name}: ${pb.goal}`);
    }
  }
  if (r.sources.length) {
    lines.push(`Sources: ${r.sources.map((s) => s.title).join('; ')}`);
  }

  return lines.join('\n');
}
