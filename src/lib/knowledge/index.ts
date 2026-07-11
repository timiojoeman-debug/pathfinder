/**
 * PathFinder Knowledge Model — public API.
 *
 * The educational execution layer built from TechTalk knowledge. Import from
 * here; the internal module layout (types / sources / domains / engine) may
 * change without breaking callers.
 *
 * Quick start:
 *   import { renderKnowledgeBlock, decide } from '@/lib/knowledge';
 *   const block = renderKnowledgeBlock(userInput, 'networking'); // for prompts
 *   const guidance = decide(mapContext(userContext));            // for nudges
 */
export type {
  Domain,
  Confidence,
  SourceRef,
  Principle,
  Framework,
  Concept,
  Playbook,
  Example,
  Metric,
  DecisionContext,
  DecisionRule,
  GuidedAnswer,
  LearningModule,
  LearningPath,
  DomainKnowledge,
} from './types';

export { SOURCES, resolveSources } from './sources';

export {
  retrieveKnowledge,
  decide,
  guidedAnswerFromRule,
  renderKnowledgeBlock,
  getConcept,
  getPrinciple,
  getLearningPaths,
  listDomains,
} from './engine';

export type { RetrievalResult } from './engine';

export { NETWORKING_KNOWLEDGE } from './domains/networking';
export { JOBS_KNOWLEDGE } from './domains/jobs';
export { CV_KNOWLEDGE } from './domains/cv';
