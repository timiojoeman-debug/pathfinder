import { describe, expect, it } from 'vitest';
import {
  ALL_STACK_TERMS,
  INDUSTRIES,
  MAX_CUSTOM_STACK,
  MAX_CUSTOM_STACK_CHARS,
  ROLES,
  ROLE_GROUPS,
  STAGES,
  addCustomStack,
  customStackOf,
  exploreOptionsPrompt,
  findRole,
  isCustomRole,
  migrateIndustry,
  migrateRole,
  migrateStage,
  onbToDirIndustry,
  onbToDirRole,
  onbToDirSize,
  stackFor,
  titleVariantsFor,
} from '../taxonomy';
import {
  analyzeCvText,
  analyzeJobDescription,
  hasTerm,
  migrateDirection,
  pruneTargetRoles,
  roleFamiliesFor,
  targetKeywords,
  targetRoleOptions,
} from '../logic';
import { DEFAULT_TARGET_KEYWORDS, KEYWORD_VOCAB } from '../data';
import { usePfStore } from '../store';
import { deriveProfile } from '../profile';

describe('taxonomy shape', () => {
  it('has unique ids and labels in every list', () => {
    for (const list of [ROLES, INDUSTRIES, STAGES]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
      expect(new Set(list.map((x) => x.label.toLowerCase())).size).toBe(list.length);
    }
  });

  it('gives every role a group, 3-5 title variants, a stack and resolvable related roles', () => {
    for (const r of ROLES) {
      expect(ROLE_GROUPS, r.id).toContain(r.group);
      expect(r.variants.length, r.id).toBeGreaterThanOrEqual(3);
      expect(r.variants.length, r.id).toBeLessThanOrEqual(5);
      expect(r.stack.length, r.id).toBeGreaterThanOrEqual(6);
      expect(r.related.length, r.id).toBeGreaterThanOrEqual(2);
      for (const id of r.related) {
        expect(ROLES.some((x) => x.id === id), `${r.id} -> ${id}`).toBe(true);
        expect(id).not.toBe(r.id);
      }
    }
  });

  it('ships the requested roles, industries and company types', () => {
    expect(ROLES).toHaveLength(21);
    expect(INDUSTRIES).toHaveLength(19);
    expect(STAGES).toHaveLength(6);
    expect(INDUSTRIES.map((i) => i.label)).toContain('Open');
  });

  it('keeps every role title distinct, so target-role options never collide', () => {
    const primaries = ROLES.map((r) => r.variants[0]);
    expect(new Set(primaries).size).toBe(primaries.length);
  });

  it('has a common subset so the collapsed picker is not a wall of chips', () => {
    const common = ROLES.filter((r) => r.common);
    expect(common.length).toBeGreaterThan(5);
    expect(common.length).toBeLessThan(ROLES.length);
  });
});

describe('titleVariantsFor', () => {
  it('returns the role titles, tailored', () => {
    expect(titleVariantsFor('UX / Product design')).toMatchObject({ tailored: true });
    expect(titleVariantsFor('UX / Product design').variants).toContain('Product Designer Intern');
  });

  it('builds generic titles for a typed role and says they are not tailored', () => {
    const r = titleVariantsFor('Hardware verification');
    expect(r.tailored).toBe(false);
    expect(r.variants[0]).toBe('Hardware verification Intern');
  });

  it('is empty without a role', () => {
    expect(titleVariantsFor(null).variants).toEqual([]);
  });
});

describe('migrating values saved before the taxonomy', () => {
  it('maps old Direction roles', () => {
    expect(migrateRole('Full-Stack SWE')).toBe('Full-Stack');
    expect(migrateRole('Frontend')).toBe('Frontend');
    expect(migrateRole('Backend')).toBe('Backend');
    expect(migrateRole('Data / ML')).toBe('Data science');
  });

  it('maps old onboarding roles', () => {
    expect(migrateRole('Software Engineering')).toBe('Full-Stack');
    expect(migrateRole('Product')).toBe('Product management');
    expect(migrateRole('Design')).toBe('UX / Product design');
  });

  it('maps old industries', () => {
    expect(migrateIndustry('Travel Tech')).toBe('Travel');
    expect(migrateIndustry('Dev Tools')).toBe('Developer tools / SaaS');
    expect(migrateIndustry('Developer Tools')).toBe('Developer tools / SaaS');
    expect(migrateIndustry('Fintech')).toBe('Fintech');
    expect(migrateIndustry('Healthtech')).toBe('Healthtech');
    expect(migrateIndustry('Open')).toBe('Open');
  });

  it('maps old sizes and stages', () => {
    expect(migrateStage('Startups 0–50')).toBe('Early-stage startups');
    expect(migrateStage('Seed–Series B startups')).toBe('Early-stage startups');
    expect(migrateStage('Scaleups')).toBe('Scaleups');
    expect(migrateStage('Growth-stage scaleups')).toBe('Scaleups');
    expect(migrateStage('Big Tech')).toBe('Big Tech');
  });

  it('is idempotent and keeps a typed role as typed', () => {
    for (const r of ROLES) expect(migrateRole(r.label)).toBe(r.label);
    expect(migrateRole(migrateRole('Full-Stack SWE'))).toBe('Full-Stack');
    expect(migrateRole('Hardware verification')).toBe('Hardware verification');
    expect(migrateRole(null)).toBeNull();
    expect(migrateRole('  ')).toBeNull();
  });

  it('migrates a whole persisted direction, onboarding included, and prunes target roles', () => {
    const out = migrateDirection({
      dirRole: 'Data / ML', dirIndustry: 'Travel Tech', dirSize: 'Startups 0–50',
      onb: { step: 3, role: 'Design', industry: 'Dev Tools', stage: 'Growth-stage scaleups', cv: 1, projects: 2, outreach: 3, cadence: 4 },
      dirTargetRoles: ['Data / ML Engineer Intern', 'Data Engineer Intern', 'Chef Intern'],
      dirStatementAi: { statement: 'Data / ML internships in travel tech' },
    });
    expect(out).toMatchObject({ dirRole: 'Data science', dirIndustry: 'Travel', dirSize: 'Early-stage startups', dirStatementAi: null });
    expect(out.onb).toMatchObject({ role: 'UX / Product design', industry: 'Developer tools / SaaS', stage: 'Scaleups', cv: 1 });
    // The renamed title and a still-offered one survive; the unknown one is pruned.
    expect(out.dirTargetRoles).toEqual(['Machine Learning Engineer Intern', 'Data Engineer Intern']);
  });

  it('only touches keys that were saved, and keeps an AI statement when no label changed', () => {
    expect(migrateDirection({})).toEqual({});
    const same = migrateDirection({ dirRole: 'Backend', dirStatementAi: { statement: 'x' } });
    expect(same).toEqual({ dirRole: 'Backend' });
  });

  it('is applied when the store rehydrates old persisted state', () => {
    const merge = usePfStore.persist.getOptions().merge!;
    const merged = merge(
      {
        dirRole: 'Full-Stack SWE', dirIndustry: 'Dev Tools', dirSize: 'Scaleups',
        dirTargetRoles: ['Full-Stack Engineer Intern', 'Design Engineer Intern'],
        onb: { step: 2, role: 'Software Engineering', industry: 'Travel Tech', stage: 'Big Tech', cv: null, projects: null, outreach: null, cadence: null },
      },
      usePfStore.getState(),
    );
    expect(merged.dirRole).toBe('Full-Stack');
    expect(merged.dirIndustry).toBe('Developer tools / SaaS');
    expect(merged.dirSize).toBe('Scaleups');
    expect(merged.onb.role).toBe('Full-Stack');
    expect(merged.onb.industry).toBe('Travel');
    // "Design Engineer Intern" is no longer offered for Full-Stack, so it is pruned.
    expect(merged.dirTargetRoles).toEqual(['Full-Stack Engineer Intern']);
  });

  it('leaves a fresh store alone when nothing was persisted', () => {
    const merge = usePfStore.persist.getOptions().merge!;
    const cur = usePfStore.getState();
    const merged = merge({}, cur);
    expect(merged.dirRole).toBe(cur.dirRole);
    expect(merged.onb).toEqual(cur.onb);
  });
});

describe('onboarding to Direction', () => {
  it('resolves every role, industry and company type onboarding offers (current and old)', () => {
    for (const r of ROLES) expect(onbToDirRole(r.label), r.label).toBe(r.label);
    for (const i of INDUSTRIES) expect(onbToDirIndustry(i.label), i.label).toBe(i.label);
    for (const s of STAGES) expect(onbToDirSize(s.label), s.label).toBe(s.label);
    for (const old of ['Software Engineering', 'Data / ML', 'Product', 'Design']) {
      expect(findRole(onbToDirRole(old)), old).not.toBeNull();
    }
  });

  it('hands a non-engineering onboarding target over to the store', () => {
    usePfStore.setState({ dirRole: null, dirIndustry: null, dirSize: null });
    usePfStore.getState().setOnb({ step: 3, role: 'Product management', industry: 'Fintech', stage: 'Scaleups' });
    usePfStore.getState().finishOnb();
    const s = usePfStore.getState();
    expect([s.dirRole, s.dirIndustry, s.dirSize]).toEqual(['Product management', 'Fintech', 'Scaleups']);
  });

  it('carries a typed Other role across unchanged', () => {
    expect(onbToDirRole('Hardware verification')).toBe('Hardware verification');
    expect(isCustomRole('Hardware verification')).toBe(true);
    expect(isCustomRole('Backend')).toBe(false);
    expect(isCustomRole('')).toBe(false);
  });
});

describe('role families and target roles beyond engineering', () => {
  it('gives a designer design-led families, not Full-Stack ones', () => {
    const fams = roleFamiliesFor('UX / Product design');
    expect(fams).toHaveLength(3);
    expect(fams[0]).toMatchObject({ title: 'Product Designer Intern', relation: 'Primary' });
    expect(fams.map((f) => f.relation)).toEqual(['Primary', 'Adjacent', 'Stretch']);
    expect(fams.map((f) => f.title).join(' ')).toContain('UX Researcher Intern');
  });

  it('offers same-group roles first, then everything else, without duplicates', () => {
    const opts = targetRoleOptions('Product management');
    expect(opts).toHaveLength(ROLES.length);
    expect(new Set(opts.map((o) => o.title)).size).toBe(opts.length);
    const others = opts.filter((o) => o.relation === 'Other').map((o) => o.title);
    expect(others[0]).toBe('UX Researcher Intern');
  });

  it('keeps a typed role as the only primary and still lists the shared roles', () => {
    const opts = targetRoleOptions('Hardware verification');
    expect(opts[0]).toMatchObject({ title: 'Hardware verification Intern', relation: 'Primary' });
    expect(opts.length).toBe(ROLES.length + 1);
  });

  it('prunes ticked targets that the chosen role no longer offers, and keeps the ones it does', () => {
    expect(pruneTargetRoles(['Product Designer Intern', 'Nonexistent Intern'], 'UX / Product design')).toEqual(['Product Designer Intern']);
    expect(pruneTargetRoles(['Product Designer Intern'], 'Backend')).toEqual(['Product Designer Intern']);
  });
});

describe('custom stack', () => {
  it('trims, collapses spaces and appends', () => {
    expect(addCustomStack(['React'], '  Apache   Beam ')).toEqual({ stack: ['React', 'Apache Beam'], error: null });
  });

  it('refuses an entry over the length limit', () => {
    const long = 'x'.repeat(MAX_CUSTOM_STACK_CHARS + 1);
    const r = addCustomStack([], long);
    expect(r.stack).toEqual([]);
    expect(r.error).toMatch(/30/);
    expect(addCustomStack([], 'x'.repeat(MAX_CUSTOM_STACK_CHARS)).stack).toHaveLength(1);
  });

  it('allows at most eight of your own, and the ninth is refused', () => {
    let stack: string[] = [];
    for (let i = 1; i <= MAX_CUSTOM_STACK; i++) stack = addCustomStack(stack, `Tool${i}`).stack;
    expect(customStackOf(stack)).toHaveLength(MAX_CUSTOM_STACK);
    const ninth = addCustomStack(stack, 'Tool9');
    expect(ninth.stack).toEqual(stack);
    expect(ninth.error).toMatch(/8/);
  });

  it('does not count known terms against the limit, and does not duplicate', () => {
    let stack: string[] = [];
    for (let i = 1; i <= MAX_CUSTOM_STACK; i++) stack = addCustomStack(stack, `Tool${i}`).stack;
    expect(addCustomStack(stack, 'figma').stack).toContain('Figma');
    expect(addCustomStack(stack, 'tool1').stack).toEqual(stack);
    expect(addCustomStack(stack, '   ')).toEqual({ stack, error: null });
  });

  it('persists through the store action into dirStack', () => {
    usePfStore.setState({ dirStack: [] });
    expect(usePfStore.getState().addDirStack('Terraform')).toBeNull();
    expect(usePfStore.getState().addDirStack('x'.repeat(31))).toMatch(/30/);
    expect(usePfStore.getState().dirStack).toEqual(['Terraform']);
    const saved = usePfStore.persist.getOptions().partialize!(usePfStore.getState()) as { dirStack: string[] };
    expect(saved.dirStack).toEqual(['Terraform']);
  });

  it('suggests a role stack first and the general list for a typed role', () => {
    expect(stackFor('UX / Product design')[0]).toBe('Figma');
    expect(stackFor('Hardware verification')).toContain('React');
  });
});

describe('keyword detection', () => {
  it('matches whole words only, so Go is not found in good', () => {
    expect(hasTerm('A good engineer', 'Go')).toBe(false);
    expect(hasTerm('Built services in Go and SQL.', 'Go')).toBe(true);
    expect(hasTerm('go to market and good habits', 'Go')).toBe(false);
    expect(hasTerm('Wrote NoSQL queries', 'SQL')).toBe(false);
    expect(hasTerm('Java and JavaScript', 'Java')).toBe(true);
    expect(hasTerm('JavaScript only', 'Java')).toBe(false);
  });

  it('handles punctuation in terms and does not read C inside C++ or C#', () => {
    expect(hasTerm('Skills: C++, C#, Node.js, CI/CD, A/B testing', 'C++')).toBe(true);
    expect(hasTerm('Skills: C++, C#', 'C')).toBe(false);
    expect(hasTerm('Skills: C, Rust', 'C')).toBe(true);
    expect(hasTerm('Node.js services', 'Node')).toBe(true);
    expect(hasTerm('Ran CI/CD pipelines and A/B testing', 'CI/CD')).toBe(true);
    expect(hasTerm('Ran A/B testing', 'A/B testing')).toBe(true);
    expect(hasTerm('scikit-learn models', 'scikit-learn')).toBe(true);
  });

  it('knows the role stacks, not just engineering', () => {
    for (const t of ['Figma', 'User research', 'SQL', 'Tableau', 'Kotlin', 'Swift', 'Terraform', 'Kubernetes', 'SIEM', 'Roadmapping', 'A/B testing']) {
      expect(KEYWORD_VOCAB.map((k) => k.toLowerCase()), t).toContain(t.toLowerCase());
    }
    expect(new Set(KEYWORD_VOCAB.map((k) => k.toLowerCase())).size).toBe(KEYWORD_VOCAB.length);
    for (const t of ALL_STACK_TERMS) expect(KEYWORD_VOCAB.map((k) => k.toLowerCase())).toContain(t.toLowerCase());
  });

  const designCv =
    'Designed a checkout flow in Figma, ran usability testing with 12 users and turned the findings into design systems. ' +
    'Built interactive prototyping demos, wireframing every screen first. Led user research interviews and improved accessibility. '.repeat(1);

  it('finds a design CV\'s skills and scores it against the design stack, not React', () => {
    const profile = deriveProfile({
      onb: { step: 1, role: null, industry: null, stage: null, cv: null, projects: null, outreach: null, cadence: null },
      onbDone: false, dirRole: 'UX / Product design', dirStack: [], dirIndustry: null, dirSize: null, dirSetting: null, dirGenerated: false, dirStatementAi: null,
      chat: [], cvText: designCv, cvAnalyzed: true, cvProjects: [], cvLinkedIn: null, cvScores: [],
      savedJobs: [], netPersona: 'Recruiter', netSent: [], netGenerated: false,
      ivSolved: {}, ivFeedback: [], savedStories: [], board: [], diags: {}, events: [],
    } as unknown as Parameters<typeof deriveProfile>[0]);
    expect(profile.currentSkills).toEqual(expect.arrayContaining(['Figma', 'Usability testing', 'Prototyping', 'Wireframing', 'User research', 'Design systems', 'Accessibility']));
    expect(profile.currentSkills).not.toContain('React');
    expect(profile.targetKeywords).toEqual(['Figma', 'Prototyping', 'Wireframing', 'User research']);
    expect(profile.missingSkills).toEqual([]);
  });

  it('analyzeCvText measures a design CV against the role, and finds nothing missing when it is covered', () => {
    const a = analyzeCvText(designCv, [], 'UX / Product design');
    expect(a.targetKw).toEqual(['Figma', 'Prototyping', 'Wireframing', 'User research']);
    expect(a.missing).toEqual([]);
    const react = analyzeCvText(designCv, [], null);
    expect(react.targetKw).toEqual(DEFAULT_TARGET_KEYWORDS);
    expect(react.missing.length).toBe(DEFAULT_TARGET_KEYWORDS.length);
  });

  it('prefers the picked stack, then the role stack, then the default', () => {
    expect(targetKeywords(['Rust'], 'UX / Product design')).toEqual(['Rust']);
    expect(targetKeywords([], 'UX / Product design')).toEqual(['Figma', 'Prototyping', 'Wireframing', 'User research']);
    expect(targetKeywords([], 'Hardware verification')).toEqual(DEFAULT_TARGET_KEYWORDS);
    expect(targetKeywords([])).toEqual(DEFAULT_TARGET_KEYWORDS);
  });

  it('reads a designer job description', () => {
    const r = analyzeJobDescription('You will use Figma, Prototyping and user research. Good communication.', designCv, []);
    expect(r.rows.map((x) => x.kw)).toEqual(expect.arrayContaining(['Figma', 'User research', 'Prototyping']));
    expect(r.rows.map((x) => x.kw)).not.toContain('Go');
  });
});

describe('explore prompt', () => {
  it('lists the valid options', () => {
    const text = exploreOptionsPrompt();
    for (const l of [...ROLES.map((r) => r.label), ...INDUSTRIES.map((i) => i.label), ...STAGES.map((s) => s.label)]) {
      expect(text).toContain(l);
    }
  });
});
