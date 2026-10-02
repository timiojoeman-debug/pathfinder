/**
 * One taxonomy for "what do you want to be?", shared by Stage 00 onboarding,
 * the Direction wizard, the explore prompt, CV keywords and title variants.
 * Both panels read this file, so they cannot disagree about what a role is.
 *
 * Stored values are the human LABELS (`dirRole: "Full-Stack"`), because the
 * label is what reaches the statement, the AI prompts and the event log. A role
 * the student typed under "Other" is stored as typed and is not in this list.
 *
 * Pure data and helpers; imports nothing, so `data.ts` and `logic.ts` can both
 * depend on it.
 */

export type RoleGroup = "Software engineering" | "Security" | "Data & AI" | "Product & design" | "Tech-adjacent";

export const ROLE_GROUPS: RoleGroup[] = ["Software engineering", "Security", "Data & AI", "Product & design", "Tech-adjacent"];

export interface RoleDef {
  id: string;
  label: string;
  group: RoleGroup;
  /** Titles students actually search under. The first is the primary title. */
  variants: string[];
  /** Related role ids: first is "Adjacent", the rest "Stretch". */
  related: string[];
  /** Suggested stack / skill terms. These also feed `KEYWORD_VOCAB`. */
  stack: string[];
  /** Shown in the collapsed picker. */
  common?: boolean;
  /** Loose free-text matcher for the explore chat (lower-case input). */
  match: RegExp;
}

export const ROLES: RoleDef[] = [
  /* Software engineering */
  { id: "fullstack", label: "Full-Stack", group: "Software engineering", common: true, match: /full[\s-]?stack|software (engineer|dev)|\bswe\b|\bsde\b/,
    variants: ["Full-Stack Engineer Intern", "Software Engineer Intern", "Full-Stack Developer Intern", "Web Application Engineer Intern", "Product Engineer Intern"],
    related: ["frontend", "backend", "mobile"], stack: ["React", "TypeScript", "Node", "Next.js", "SQL", "PostgreSQL", "REST", "Docker"] },
  { id: "frontend", label: "Frontend", group: "Software engineering", common: true, match: /front[\s-]?end|\bui (engineer|dev)|web dev/,
    variants: ["Frontend Engineer Intern", "UI Engineer Intern", "Web Developer Intern", "Front-End Developer Intern", "Design Engineer Intern"],
    related: ["fullstack", "ux", "mobile"], stack: ["React", "TypeScript", "JavaScript", "HTML", "CSS", "Next.js", "Accessibility", "Testing"] },
  { id: "backend", label: "Backend", group: "Software engineering", common: true, match: /back[\s-]?end|\bapi (engineer|dev)|server[\s-]?side/,
    variants: ["Backend Engineer Intern", "Platform Engineer Intern", "API Engineer Intern", "Backend Developer Intern"],
    related: ["fullstack", "devops", "dataeng"], stack: ["Python", "Java", "Go", "Node", "SQL", "PostgreSQL", "REST", "Docker", "AWS"] },
  { id: "mobile", label: "Mobile (iOS / Android)", group: "Software engineering", common: true, match: /mobile|\bios\b|android|swift|kotlin/,
    variants: ["Mobile Engineer Intern", "iOS Engineer Intern", "Android Engineer Intern", "Mobile Developer Intern"],
    related: ["frontend", "fullstack", "games"], stack: ["Swift", "Kotlin", "SwiftUI", "Jetpack Compose", "React Native", "Flutter", "Android", "iOS"] },
  { id: "devops", label: "DevOps / Cloud / SRE", group: "Software engineering", common: true, match: /devops|\bsre\b|reliability|cloud|infrastructure|platform eng/,
    variants: ["DevOps Engineer Intern", "Site Reliability Engineer Intern", "Cloud Engineer Intern", "Platform Engineer Intern", "Infrastructure Engineer Intern"],
    related: ["backend", "security", "dataeng"], stack: ["AWS", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD", "Python", "Prometheus"] },
  { id: "embedded", label: "Embedded / Hardware", group: "Software engineering", match: /embedded|firmware|hardware|electronics|\biot\b/,
    variants: ["Embedded Software Engineer Intern", "Firmware Engineer Intern", "Hardware Engineer Intern", "Embedded Systems Intern"],
    related: ["backend", "games", "devops"], stack: ["C", "C++", "Rust", "RTOS", "Linux", "Verilog", "Python", "Git"] },
  { id: "games", label: "Game development", group: "Software engineering", match: /\bgames?\b|gameplay|unity|unreal/,
    variants: ["Game Developer Intern", "Gameplay Programmer Intern", "Graphics Programmer Intern", "Game Engineer Intern"],
    related: ["mobile", "embedded", "frontend"], stack: ["Unity", "Unreal Engine", "C#", "C++", "OpenGL", "Vulkan", "GLSL", "Git"] },
  { id: "qa", label: "QA / Test automation", group: "Software engineering", match: /\bqa\b|\btest(ing)?\b|sdet|quality assurance/,
    variants: ["QA Engineer Intern", "Software Engineer in Test Intern", "Test Automation Engineer Intern", "SDET Intern"],
    related: ["fullstack", "backend", "devops"], stack: ["Selenium", "Cypress", "Playwright", "Jest", "Pytest", "Test automation", "CI/CD", "SQL"] },

  /* Security */
  { id: "security", label: "Cybersecurity / Security engineering", group: "Security", common: true, match: /security|cyber|pen[\s-]?test|infosec|\bsoc\b/,
    variants: ["Security Engineer Intern", "Cybersecurity Intern", "Security Analyst Intern", "Application Security Intern", "Penetration Tester Intern"],
    related: ["devops", "backend", "itanalyst"], stack: ["SIEM", "OWASP", "Penetration testing", "Wireshark", "Burp Suite", "Linux", "Python", "TCP/IP"] },

  /* Data & AI */
  { id: "datasci", label: "Data science", group: "Data & AI", common: true, match: /data scien|statistic|\bdata\b(?!.*(analy|engineer|bi\b))/,
    variants: ["Data Science Intern", "Data Scientist Intern", "Applied Scientist Intern", "Analytics Scientist Intern"],
    related: ["ml", "analytics", "dataeng"], stack: ["Python", "SQL", "Pandas", "scikit-learn", "Jupyter", "Statistics", "A/B testing", "Tableau"] },
  { id: "ml", label: "Machine learning / AI engineering", group: "Data & AI", common: true, match: /machine learning|\bml\b|\bai\b|deep learning|\bllm\b|artificial intel/,
    variants: ["Machine Learning Engineer Intern", "AI Engineer Intern", "Machine Learning Intern", "Research Engineer Intern", "Applied ML Intern"],
    related: ["datasci", "dataeng", "backend"], stack: ["Python", "PyTorch", "TensorFlow", "scikit-learn", "NumPy", "LLM", "MLOps", "Docker"] },
  { id: "dataeng", label: "Data engineering", group: "Data & AI", match: /data engineer|\betl\b|data platform|data pipeline|analytics engineer/,
    variants: ["Data Engineer Intern", "Analytics Engineer Intern", "Data Platform Intern", "ETL Developer Intern"],
    related: ["backend", "datasci", "devops"], stack: ["Python", "SQL", "Spark", "Airflow", "dbt", "Kafka", "Snowflake", "AWS"] },
  { id: "analytics", label: "Data analytics / BI", group: "Data & AI", common: true, match: /data analy|analytics|\bbi\b|business (intelligence|analy)|insight/,
    variants: ["Data Analyst Intern", "Business Intelligence Analyst Intern", "Business Analyst Intern", "Insights Analyst Intern", "Analytics Intern"],
    related: ["datasci", "dataeng", "itanalyst"], stack: ["SQL", "Tableau", "Power BI", "Excel", "Python", "Looker", "A/B testing", "Statistics"] },
  { id: "quant", label: "Quantitative research / developer", group: "Data & AI", match: /quant|trading|trader/,
    variants: ["Quantitative Researcher Intern", "Quantitative Developer Intern", "Quant Trader Intern", "Quantitative Analyst Intern"],
    related: ["datasci", "backend", "ml"], stack: ["Python", "C++", "Statistics", "Probability", "Pandas", "NumPy", "Linear algebra", "SQL"] },

  /* Product & design */
  { id: "pm", label: "Product management", group: "Product & design", common: true, match: /product (manag|own)|\bpm\b|\bapm\b|product$/,
    variants: ["Product Manager Intern", "Associate Product Manager Intern", "Product Management Intern", "Technical Product Manager Intern"],
    related: ["analytics", "ux", "consulting"], stack: ["Roadmapping", "User research", "A/B testing", "SQL", "Jira", "Figma", "Product analytics", "Stakeholder management"] },
  { id: "ux", label: "UX / Product design", group: "Product & design", common: true, match: /(\bux\b|\bui\b|design|figma)(?!.*research)/,
    variants: ["Product Designer Intern", "UX Designer Intern", "UI/UX Designer Intern", "Interaction Designer Intern", "Visual Designer Intern"],
    related: ["uxr", "frontend", "pm"], stack: ["Figma", "Prototyping", "Wireframing", "User research", "Design systems", "Usability testing", "Accessibility", "HTML"] },
  { id: "uxr", label: "UX research", group: "Product & design", match: /user research|ux research|design research|researcher/,
    variants: ["UX Researcher Intern", "User Researcher Intern", "Design Researcher Intern", "Research Intern, UX"],
    related: ["ux", "pm", "analytics"], stack: ["User research", "Usability testing", "Survey design", "Qualitative analysis", "Affinity mapping", "Statistics", "Figma", "Interviewing"] },

  /* Tech-adjacent */
  { id: "solutions", label: "Solutions / Sales engineering", group: "Tech-adjacent", match: /solutions?|sales engineer|pre[\s-]?sales|customer engineer|technical sales/,
    variants: ["Solutions Engineer Intern", "Sales Engineer Intern", "Technical Solutions Intern", "Customer Engineer Intern", "Pre-Sales Engineer Intern"],
    related: ["devrel", "consulting", "backend"], stack: ["REST", "SQL", "Python", "AWS", "Salesforce", "Customer success", "Presentations", "Demos"] },
  { id: "consulting", label: "Technology consulting", group: "Tech-adjacent", match: /consult/,
    variants: ["Technology Consulting Intern", "Digital Consultant Intern", "Technology Analyst Intern", "Consulting Analyst Intern"],
    related: ["itanalyst", "pm", "solutions"], stack: ["Excel", "SQL", "PowerPoint", "Python", "Tableau", "Process mapping", "Agile", "Stakeholder management"] },
  { id: "itanalyst", label: "IT / Technology analyst", group: "Tech-adjacent", match: /\bit\b|technology analyst|systems analyst|support analyst/,
    variants: ["IT Analyst Intern", "Technology Analyst Intern", "IT Support Analyst Intern", "Systems Analyst Intern", "Business Systems Analyst Intern"],
    related: ["consulting", "analytics", "security"], stack: ["Excel", "SQL", "ITIL", "Active Directory", "Linux", "Power BI", "Jira", "Agile"] },
  { id: "devrel", label: "Developer relations", group: "Tech-adjacent", match: /dev(eloper)? ?(rel|advoc|experience)|\bdevrel\b|technical writ/,
    variants: ["Developer Advocate Intern", "Developer Relations Intern", "Technical Writer Intern", "Developer Experience Intern", "Community Engineer Intern"],
    related: ["solutions", "fullstack", "frontend"], stack: ["Technical writing", "Open source", "JavaScript", "Python", "Git", "REST", "Public speaking", "Community"] },
];

/* ── Industries and company stages ─────────────────────────────────── */

export interface ChoiceDef {
  id: string;
  label: string;
  /** Lower-case form for the direction statement, when `label.toLowerCase()` reads badly. */
  phrase?: string;
  common?: boolean;
  match: RegExp;
}

export const INDUSTRIES: ChoiceDef[] = [
  { id: "fintech", label: "Fintech", common: true, match: /fintech|payments?/ },
  { id: "banking", label: "Banking & finance", common: true, match: /bank|financ|insur/ },
  { id: "trading", label: "Trading / quant", match: /trading|quant|hedge|market mak/ },
  { id: "healthtech", label: "Healthtech", common: true, match: /health|medic|bio|pharma/ },
  { id: "edtech", label: "Edtech", match: /edtech|education|learning/ },
  { id: "ecommerce", label: "E-commerce & retail", common: true, match: /e-?commerce|retail|shop|marketplace/ },
  { id: "travel", label: "Travel", match: /travel|hospitality|airline/ },
  { id: "gaming", label: "Gaming", match: /gam(e|ing)/ },
  { id: "media", label: "Media & entertainment", match: /media|entertain|music|stream/ },
  { id: "cybersecurity", label: "Cybersecurity", match: /cyber|security/ },
  { id: "climate", label: "Climate & energy", match: /climate|energy|sustain|green|renewable/ },
  { id: "devtools", label: "Developer tools / SaaS", phrase: "developer tools and SaaS", common: true, match: /dev(eloper)?[\s-]?tool|saas|\btools?\b/ },
  { id: "enterprise", label: "Enterprise software", match: /enterprise/ },
  { id: "consulting", label: "Consulting", match: /consult/ },
  { id: "public", label: "Public sector & non-profit", match: /public|government|non[\s-]?profit|charity/ },
  { id: "auto", label: "Automotive & robotics", match: /automotive|robot|\bcars?\b|vehicle|autonomous/ },
  { id: "telecoms", label: "Telecoms", match: /telecom|network provider|mobile network/ },
  { id: "aiml", label: "AI / ML companies", phrase: "AI and ML companies", common: true, match: /\bai\b|\bml\b|machine learning|artificial/ },
  { id: "open", label: "Open", common: true, match: /^open$|open to|any industry|not sure/ },
];

export const STAGES: ChoiceDef[] = [
  { id: "startup", label: "Early-stage startups", match: /start|seed|small|early/ },
  { id: "scaleup", label: "Scaleups", match: /scale|growth|mid/ },
  { id: "bigtech", label: "Big Tech", match: /big tech|faang|maang/ },
  { id: "enterprise", label: "Large enterprises & banks", match: /enterprise|large|corporate|bank/ },
  { id: "consultancy", label: "Consultancies", match: /consult/ },
  { id: "public", label: "Public sector & non-profit", match: /public|government|non[\s-]?profit|charity/ },
];

/** Every label the Direction wizard and Stage 00 offer for each choice. */
export const ROLE_LABELS = ROLES.map((r) => r.label);
export const INDUSTRY_LABELS = INDUSTRIES.map((i) => i.label);
export const STAGE_LABELS = STAGES.map((s) => s.label);

/** The general stack list, kept available beside the role's own suggestions. */
export const DIR_STACK_OPTS = ["React", "TypeScript", "Node", "Python", "Go", "SQL", "AWS"];

/* ── Lookups ───────────────────────────────────────────────────────── */

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

function find<T extends { id: string; label: string }>(list: T[], v: string | null | undefined): T | null {
  const k = norm(v);
  if (!k) return null;
  return list.find((x) => x.label.toLowerCase() === k || x.id === k) ?? null;
}

export const findRole = (v: string | null | undefined) => find(ROLES, v);
export const findIndustry = (v: string | null | undefined) => find(INDUSTRIES, v);
export const findStage = (v: string | null | undefined) => find(STAGES, v);

/** A role the student typed under "Other": non-empty and not one of ours. */
export function isCustomRole(v: string | null | undefined): boolean {
  return !!v && !!v.trim() && !findRole(v);
}

export const MAX_CUSTOM_ROLE_CHARS = 60;

/** Lower-case phrase for the direction statement ("developer tools and SaaS", "big tech"). */
export function phraseFor(list: ChoiceDef[], v: string): string {
  return find(list, v)?.phrase ?? v.toLowerCase();
}

export interface TitleVariantsResult {
  variants: string[];
  /** False for a typed "Other" role: the titles are generic. */
  tailored: boolean;
}

/** Title variants for the chosen role, or generic ones built from a typed role. */
export function titleVariantsFor(role: string | null | undefined): TitleVariantsResult {
  const def = findRole(role);
  if (def) return { variants: def.variants, tailored: true };
  const label = (role ?? "").trim();
  if (!label) return { variants: [], tailored: true };
  return { variants: [`${label} Intern`, `${label} Internship`, `${label} Placement`], tailored: false };
}

export const OTHER_ROLE_NOTE =
  "You typed your own role, so title variants and stack suggestions are generic and less tailored. Check each title on a real job board.";

/* ── Stacks ────────────────────────────────────────────────────────── */

const ALL_KNOWN_STACK = new Set([...DIR_STACK_OPTS, ...ROLES.flatMap((r) => r.stack)].map((t) => t.toLowerCase()));

/** Every stack term the taxonomy knows (role stacks plus the general list), de-duplicated. */
export const ALL_STACK_TERMS: string[] = [...new Map([...DIR_STACK_OPTS, ...ROLES.flatMap((r) => r.stack)].map((t) => [t.toLowerCase(), t])).values()];

/** Suggested stack for the role, or the general list for a typed or missing role. */
export function stackFor(role: string | null | undefined): string[] {
  return findRole(role)?.stack ?? DIR_STACK_OPTS;
}

export const MAX_CUSTOM_STACK = 8;
export const MAX_CUSTOM_STACK_CHARS = 30;

/** Entries of a stack the taxonomy does not know: the student's own additions. */
export const customStackOf = (stack: string[]) => stack.filter((t) => !ALL_KNOWN_STACK.has(t.toLowerCase()));

/**
 * Append a keyword the student typed. Trims and collapses whitespace; refuses
 * an empty or over-long entry and a ninth custom one. A keyword already in the
 * stack is a no-op, not an error. Pure, so the limits are testable.
 */
export function addCustomStack(stack: string[], raw: string): { stack: string[]; error: string | null } {
  const term = raw.trim().replace(/\s+/g, " ");
  if (!term) return { stack, error: null };
  if (term.length > MAX_CUSTOM_STACK_CHARS) return { stack, error: `Keep it to ${MAX_CUSTOM_STACK_CHARS} characters or fewer.` };
  if (stack.some((t) => t.toLowerCase() === term.toLowerCase())) return { stack, error: null };
  const known = [...ALL_STACK_TERMS].find((t) => t.toLowerCase() === term.toLowerCase());
  if (known) return { stack: [...stack, known], error: null };
  if (customStackOf(stack).length >= MAX_CUSTOM_STACK) return { stack, error: `You can add up to ${MAX_CUSTOM_STACK} of your own.` };
  return { stack: [...stack, term], error: null };
}

/* ── Migration of values saved before the taxonomy ─────────────────── */

const LEGACY_ROLE: Record<string, string> = {
  "full-stack swe": "Full-Stack",
  "software engineering": "Full-Stack",
  "data / ml": "Data science",
  product: "Product management",
  design: "UX / Product design",
};
const LEGACY_INDUSTRY: Record<string, string> = {
  "travel tech": "Travel",
  "dev tools": "Developer tools / SaaS",
  "developer tools": "Developer tools / SaaS",
};
const LEGACY_STAGE: Record<string, string> = {
  "startups 0–50": "Early-stage startups",
  "seed–series b startups": "Early-stage startups",
  "growth-stage scaleups": "Scaleups",
};
/** Target-role titles that existed before and now live under a new name. */
const LEGACY_TITLE: Record<string, string> = {
  "Data / ML Engineer Intern": "Machine Learning Engineer Intern",
  "Platform / Infrastructure Intern": "DevOps Engineer Intern",
};

function migrate(v: string | null | undefined, legacy: Record<string, string>, lookup: (x: string) => { label: string } | null): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return legacy[trimmed.toLowerCase()] ?? lookup(trimmed)?.label ?? trimmed;
}

/** Old or current role value to the current label. A typed role passes through unchanged. */
export const migrateRole = (v: string | null | undefined) => migrate(v, LEGACY_ROLE, findRole);
export const migrateIndustry = (v: string | null | undefined) => migrate(v, LEGACY_INDUSTRY, findIndustry);
export const migrateStage = (v: string | null | undefined) => migrate(v, LEGACY_STAGE, findStage);
export const migrateTargetTitle = (t: string) => LEGACY_TITLE[t] ?? t;

/* ── Onboarding to Direction ───────────────────────────────────────── */

/**
 * Stage 00 and the wizard share one vocabulary, so the carry-over is a
 * migration of whatever Stage 00 stored (current or pre-taxonomy) to the
 * current label. Every onboarding role resolves to a Direction role.
 */
export const onbToDirRole = migrateRole;
export const onbToDirIndustry = migrateIndustry;
export const onbToDirSize = migrateStage;

/* ── Explore chat ──────────────────────────────────────────────────── */

function matchChoice<T extends { label: string; match: RegExp }>(list: T[], text: string | undefined): string | undefined {
  const t = norm(text);
  if (!t) return undefined;
  const exact = list.find((x) => x.label.toLowerCase() === t);
  if (exact) return exact.label;
  return list.find((x) => x.match.test(t))?.label;
}

/** Free text from the explore chat to a role label; undefined when nothing clearly matches. */
export const matchRole = (text: string | undefined) => matchChoice(ROLES, text);
export const matchIndustry = (text: string | undefined) => matchChoice(INDUSTRIES, text);
export const matchStage = (text: string | undefined) => matchChoice(STAGES, text);

/** The valid options as prompt text, so the model answers in our vocabulary. */
export function exploreOptionsPrompt(): string {
  return [
    `Roles: ${ROLE_LABELS.join(" | ")}`,
    `Industries: ${INDUSTRY_LABELS.join(" | ")}`,
    `Company types: ${STAGE_LABELS.join(" | ")}`,
  ].join("\n");
}

/** Terms from every role's stack, for the CV and job-description vocabulary. */
export const ROLE_STACK_TERMS: string[] = ROLES.flatMap((r) => r.stack);
