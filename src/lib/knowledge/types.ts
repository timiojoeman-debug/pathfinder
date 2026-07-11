/**
 * PathFinder Knowledge Model — type schema.
 *
 * This is the machine-readable backbone that turns TechTalk knowledge into an
 * educational execution system. Every artefact carries provenance (source ids)
 * so PathFinder can teach AND cite, never behaving like a search engine.
 *
 * Layered exactly in the retrieval order PathFinder queries (see engine.ts):
 *   Principles → Frameworks → Playbooks → Examples → Sources.
 */

/** The six PathFinder phases plus a cross-cutting foundations layer. */
export type Domain =
  | 'foundations'
  | 'direction'
  | 'cv'
  | 'jobs'
  | 'networking'
  | 'interview'
  | 'tracker';

/** How well-evidenced a piece of knowledge is. Drives knowledge_health. */
export type Confidence = 'high' | 'medium' | 'low';

/** Where a piece of knowledge originated, in the Obsidian vault. */
export type SourceKind =
  | 'masterclass-doc' // Raw Sources/Career/*.docx|pdf — primary TechTalk material
  | 'wiki-concept' // Wiki/concepts/*.md — distilled atomic ideas
  | 'wiki-topic' // Wiki/topics/*.md — applied strategy
  | 'wiki-source' // Wiki/sources/*.md — provenance notes
  | 'book'; // Wiki/books/*.md — supporting literature

/** A traceable pointer back to canonical vault material. Never flattened away. */
export interface SourceRef {
  id: string;
  title: string;
  kind: SourceKind;
  /** Vault-relative path, e.g. "Wiki/concepts/referral-leverage.md". */
  vaultPath: string;
  confidence: Confidence;
}

/**
 * A durable truth. The most compressed, most-queried layer.
 * Principles answer "what is always true here?" and anchor every recommendation.
 */
export interface Principle {
  id: string;
  domain: Domain;
  /** One-line durable claim. */
  statement: string;
  /** Why the claim holds — the mechanism. */
  rationale: string;
  /** Hard evidence (numbers, ratios) that make it credible. */
  evidence: string[];
  sourceIds: string[];
  relatedConceptIds: string[];
}

/** One ordered beat of a framework. */
export interface FrameworkStep {
  label: string;
  detail: string;
}

/** A repeatable mental structure (e.g. the Coffee Chat four-part framework). */
export interface Framework {
  id: string;
  domain: Domain;
  name: string;
  purpose: string;
  appliesWhen: string;
  steps: FrameworkStep[];
  sourceIds: string[];
}

/**
 * An atomic teachable idea, with the full educational scaffold the guide layer
 * renders (definition / purpose / prerequisites / examples / anti-patterns).
 */
export interface Concept {
  id: string;
  domain: Domain;
  term: string;
  definition: string;
  purpose: string;
  /** Concept ids a learner should grasp first. */
  prerequisiteIds: string[];
  examples: string[];
  antiPatterns: string[];
  relatedConceptIds: string[];
  principleIds: string[];
  sourceIds: string[];
}

/** One executable move inside a playbook, carrying its own teaching payload. */
export interface PlaybookStep {
  /** What to do. */
  action: string;
  /** Why it works (the principle in motion). */
  why: string;
  /** What the user should internalise by doing it. */
  learn: string;
}

/** An end-to-end executable procedure (e.g. "Earn a referral from cold"). */
export interface Playbook {
  id: string;
  domain: Domain;
  name: string;
  goal: string;
  whenToUse: string;
  steps: PlaybookStep[];
  successCriteria: string[];
  conceptIds: string[];
  sourceIds: string[];
}

/** A worked, concrete example a learner can pattern-match against. */
export interface Example {
  id: string;
  domain: Domain;
  title: string;
  scenario: string;
  goodMove: string;
  badMove: string;
  conceptIds: string[];
  sourceIds: string[];
}

/** A number the user should track to know whether the system is working. */
export interface Metric {
  id: string;
  domain: Domain;
  name: string;
  definition: string;
  /** The target worth steering toward. */
  target: string;
  why: string;
  sourceIds: string[];
}

/**
 * The minimal slice of user state the decision engine reasons over. Kept
 * decoupled from the app's full UserContext so the engine stays portable and
 * testable. Callers map their own context into this shape.
 */
export interface DecisionContext {
  domain?: Domain;
  /** Warm contacts the user has built. */
  contactsCount: number;
  /** Completed coffee chats. */
  coffeeChatsDone: number;
  /** Applications submitted in total. */
  applicationsTotal: number;
  /** Share of applications that came with a referral (0–1), if known. */
  referralRate?: number;
  /** Days until the user's target application window opens, if known. */
  daysToDeadline?: number;
  /** Latest CV analysis score (0–100), if the CV has been analysed. */
  cvScore?: number;
  /** Whether the CV/profile carries demonstrable proof (GitHub, live demo, metrics). */
  hasProof?: boolean;
  /** How far along the user is overall. */
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * A condition-driven recommendation. `match` is a pure predicate over
 * DecisionContext; the rest is the educational envelope the engine emits.
 */
export interface DecisionRule {
  id: string;
  domain: Domain;
  /** Human-readable trigger, mirrored by `match`. */
  when: string;
  match: (ctx: DecisionContext) => boolean;
  /** The action to recommend. */
  recommend: string;
  /** Why this action, now. */
  rationale: string;
  /** Principle id that backs the recommendation. */
  principleId: string;
  /** Concept id the user should learn from following it. */
  teachesConceptId: string;
  /** Higher fires first when several rules match. */
  priority: number;
}

/**
 * The Phase-6 response envelope. PathFinder educates while executing: every
 * answer carries an action, an explanation, the concept being taught, the
 * sources it came from, and a reflection prompt to drive adaptation.
 */
export interface GuidedAnswer {
  action: string;
  explanation: string;
  learning: {
    conceptId: string;
    term: string;
    summary: string;
  };
  sources: SourceRef[];
  reflection: string;
}

/** A staged curriculum module within a learning path. */
export interface LearningModule {
  id: string;
  title: string;
  objective: string;
  conceptIds: string[];
  playbookIds: string[];
  /** Observable signal that the module is complete. */
  completionCriteria: string;
  exercise: string;
}

/** A full learning journey (Beginner → Intermediate → Advanced). */
export interface LearningPath {
  id: string;
  domain: Domain;
  level: 'beginner' | 'intermediate' | 'advanced';
  title: string;
  outcome: string;
  modules: LearningModule[];
}

/** A whole domain's knowledge, assembled for registration with the engine. */
export interface DomainKnowledge {
  domain: Domain;
  principles: Principle[];
  frameworks: Framework[];
  concepts: Concept[];
  playbooks: Playbook[];
  examples: Example[];
  metrics: Metric[];
  decisionRules: DecisionRule[];
  learningPaths: LearningPath[];
}
