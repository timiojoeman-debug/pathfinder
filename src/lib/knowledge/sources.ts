/**
 * Source registry — canonical provenance for every piece of knowledge.
 *
 * Three tiers, preserved (never flattened):
 *   1. masterclass-doc — primary TechTalk material (Raw Sources/Career/*)
 *   2. wiki-concept / wiki-topic — distilled, linked notes (Wiki/*)
 *   3. wiki-source — the provenance notes that already track tier 1 → tier 2
 *
 * `confidence` reflects how directly the claim is evidenced in the source and
 * feeds knowledge_health.md. The JSON mirror lives at repo-root
 * pathfinder_source_registry.json for non-TS consumers.
 */
import type { SourceRef } from './types';

export const SOURCES: Record<string, SourceRef> = {
  // ── TechTalk slide decks (Slide Audit 2026-10-02). Marketing-grade webinar
  //    slides: numbers are rules of thumb, not research. ─────────────────
  'deck-network-at-events': {
    id: 'deck-network-at-events',
    title: 'TechTalk — How To Network At Events (slide deck)',
    kind: 'masterclass-doc',
    vaultPath: 'Slide Audit 2026-10-02/report-E.md',
    confidence: 'medium',
  },
  'deck-september-surge': {
    id: 'deck-september-surge',
    title: 'TechTalk — September Surge (slide deck, online networking slides)',
    kind: 'masterclass-doc',
    vaultPath: 'Slide Audit 2026-10-02/report-C.md',
    confidence: 'medium',
  },
  'deck-june-day2': {
    id: 'deck-june-day2',
    title: 'TechTalk — Get Hired in the Age of AI, Day 2 (slide deck)',
    kind: 'masterclass-doc',
    vaultPath: 'Slide Audit 2026-10-02/report-A.md',
    confidence: 'medium',
  },

  // ── Primary TechTalk masterclass material ─────────────────────────────
  'doc-four-pillars': {
    id: 'doc-four-pillars',
    title: 'TechTalk — Four Pillars of Job Search',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/TechTalk - Four Pillars of Job Search (How to Structure Your Search).docx',
    confidence: 'high',
  },
  'doc-coffee-chat': {
    id: 'doc-coffee-chat',
    title: 'TechTalk — Coffee Chat Mastery Essentials',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/TechTalk - Coffee Chat Mastery Essentials.docx',
    confidence: 'high',
  },
  'doc-linkedin-checklist': {
    id: 'doc-linkedin-checklist',
    title: 'TechTalk — LinkedIn Profile Checklist (Messaging Recruiters)',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/TechTalk - LinkedIn Profile Checklist (Messaging Recruiters).docx',
    confidence: 'high',
  },
  'doc-hidden-market': {
    id: 'doc-hidden-market',
    title: 'Hidden Job Market Tactics & Tips',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/Hidden Job Market Tactics & Tips.pdf',
    confidence: 'high',
  },
  'doc-10-interviews': {
    id: 'doc-10-interviews',
    title: 'TechTalk (Masterclass) — 10 Interviews in 30 Days',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/TechTalk (Masterclass) - 10 Interviews in 30 days.docx',
    confidence: 'high',
  },
  'doc-outsmart-ai': {
    id: 'doc-outsmart-ai',
    title: 'TechTalk — Outsmart the Job Market (Use AI to Get Hired Faster)',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/TechTalk - Outsmart the Job Market (How to Use AI to Get Hired Faster).docx',
    confidence: 'medium',
  },
  'doc-career-os': {
    id: 'doc-career-os',
    title: 'Software Engineering Career Operating System',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/Software_Engineering_Career_Operating_System.docx',
    confidence: 'medium',
  },
  'doc-cv-blueprint': {
    id: 'doc-cv-blueprint',
    title: 'TechTalk — 2026 CV Blueprint',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/TechTalk - 2026 CV Blueprint.docx',
    confidence: 'high',
  },
  'doc-cv-templates': {
    id: 'doc-cv-templates',
    title: 'TechTalk — CV Templates',
    kind: 'masterclass-doc',
    vaultPath: 'Raw Sources/Career/TechTalk - CV Templates.docx',
    confidence: 'medium',
  },

  // ── Distilled Wiki concepts ───────────────────────────────────────────
  'wiki-referral-leverage': {
    id: 'wiki-referral-leverage',
    title: 'Referral Leverage',
    kind: 'wiki-concept',
    vaultPath: 'Wiki/concepts/referral-leverage.md',
    confidence: 'high',
  },
  'wiki-hidden-job-market': {
    id: 'wiki-hidden-job-market',
    title: 'The Hidden Job Market',
    kind: 'wiki-concept',
    vaultPath: 'Wiki/concepts/hidden-job-market.md',
    confidence: 'high',
  },
  'wiki-coffee-chat': {
    id: 'wiki-coffee-chat',
    title: 'The Coffee Chat',
    kind: 'wiki-concept',
    vaultPath: 'Wiki/concepts/coffee-chat.md',
    confidence: 'high',
  },
  'wiki-four-pillars': {
    id: 'wiki-four-pillars',
    title: 'The Four Pillars of a Job Search',
    kind: 'wiki-concept',
    vaultPath: 'Wiki/concepts/four-pillars-job-search.md',
    confidence: 'high',
  },
  'wiki-proof-of-work': {
    id: 'wiki-proof-of-work',
    title: 'Proof of Work',
    kind: 'wiki-concept',
    vaultPath: 'Wiki/concepts/proof-of-work.md',
    confidence: 'high',
  },
  'wiki-apply-early': {
    id: 'wiki-apply-early',
    title: 'Apply Early',
    kind: 'wiki-concept',
    vaultPath: 'Wiki/concepts/apply-early.md',
    confidence: 'high',
  },
  'wiki-ats-optimization': {
    id: 'wiki-ats-optimization',
    title: 'ATS & AI CV Screening',
    kind: 'wiki-concept',
    vaultPath: 'Wiki/concepts/ats-optimization.md',
    confidence: 'high',
  },

  // ── Applied Wiki topics ───────────────────────────────────────────────
  'wiki-networking': {
    id: 'wiki-networking',
    title: 'Networking (topic)',
    kind: 'wiki-topic',
    vaultPath: 'Wiki/topics/networking.md',
    confidence: 'high',
  },
  'wiki-job-search-system': {
    id: 'wiki-job-search-system',
    title: 'Job Search System (topic)',
    kind: 'wiki-topic',
    vaultPath: 'Wiki/topics/job-search-system.md',
    confidence: 'high',
  },
  'wiki-application-strategy': {
    id: 'wiki-application-strategy',
    title: 'Application Strategy (topic)',
    kind: 'wiki-topic',
    vaultPath: 'Wiki/topics/application-strategy.md',
    confidence: 'medium',
  },

  // ── Provenance / source notes ─────────────────────────────────────────
  'wiki-techtalk-tactics': {
    id: 'wiki-techtalk-tactics',
    title: 'TechTalk Tactics (source note)',
    kind: 'wiki-source',
    vaultPath: 'Wiki/sources/techtalk-tactics.md',
    confidence: 'high',
  },
  'wiki-techtalk-masterclass': {
    id: 'wiki-techtalk-masterclass',
    title: 'TechTalk Masterclass — Age of AI (source note)',
    kind: 'wiki-source',
    vaultPath: 'Wiki/sources/techtalk-masterclass-age-of-ai.md',
    confidence: 'high',
  },
};

/** Resolve a list of source ids to full SourceRefs, dropping unknown ids. */
export function resolveSources(ids: readonly string[]): SourceRef[] {
  return ids.map((id) => SOURCES[id]).filter((s): s is SourceRef => Boolean(s));
}
