"use client";

/**
 * Phase 01 — Career Direction. Wizard chip-builder + "Explore with AI" chat,
 * generated direction statement with specificity meter, title variants,
 * target roles and the HIRE framework.
 */

import { useState, type CSSProperties } from "react";
import {
  DIR_INDUSTRY_OPTS,
  DIR_ROLE_OPTS,
  DIR_SETTING_OPTS,
  DIR_SIZE_OPTS,
  DIR_STACK_OPTS,
  HIRE_FRAMEWORK,
  TITLE_VARIANTS,
} from "@/lib/pf/data";
import {
  directionReady,
  directionSpecificity,
  directionStatement,
  directionSuggestions,
  extractChatPatch,
  mapExplorePreferences,
  targetRoleOptions,
  type ExplorePreferences,
} from "@/lib/pf/logic";
import { getProfile, usePfStore, type ChatMsg } from "@/lib/pf/store";
import { buildMentorContext } from "@/lib/pf/orchestrator";
import { useAiTask, type AiEnvelope, type AiTask } from "@/lib/pf/use-ai";
import { Chip, Kicker, PageHeader, Panel, Reveal } from "@/components/pf/ui";
import { AiCaveat, AiError, AiTag, GenerateButton } from "@/components/pf/ai-panel";
import { NextStep } from "@/components/pf/next-step";

/** `/api/direction/explore` is an envelope: the reply and preferences sit under `data`. */
interface ExploreData {
  response?: string;
  extractedPreferences?: ExplorePreferences;
  readyForStatement?: boolean;
  suggestedStatement?: string | null;
}

/** `/api/direction` answers at the root. `source: "local"` is its fallback when the model failed. */
interface DirectionResult {
  source?: "ai" | "local";
  statement: string;
  specificity: string;
  suggestions?: string[];
}

/** `/api/direction/title-variants` answers at the root. */
interface VariantsResult { variants?: { title?: string; note?: string }[] }

const TIER_TONE: Record<string, string> = {
  "Laser Focused": "var(--strong)",
  Clear: "var(--strong)",
  "Somewhat Defined": "var(--warn)",
  "Too Vague": "var(--risk)",
};

type DirFields = { dirRole: string | null; dirStack: string[]; dirIndustry: string | null; dirSize: string | null; dirSetting: string | null };
const dirKey = (d: DirFields) => [d.dirRole, d.dirStack.join(","), d.dirIndustry, d.dirSize, d.dirSetting].join("|");

function ModeToggle() {
  const dirMode = usePfStore((s) => s.dirMode);
  const set = usePfStore((s) => s.set);
  const btn = (on: boolean): CSSProperties => ({
    cursor: "pointer", height: 38, padding: "0 18px", borderRadius: 10, border: "1px solid var(--line)",
    background: on ? "var(--accent)" : "var(--panel)", color: on ? "#F7F1E4" : "var(--muted)",
    fontSize: 13, fontWeight: 600, transition: "all .2s var(--ease)",
  });
  return (
    <Reveal style={{ display: "flex", gap: 8, marginBottom: 18 }}>
      <button onClick={() => set({ dirMode: "wizard" })} style={btn(dirMode === "wizard")}>Wizard</button>
      <button onClick={() => set({ dirMode: "explore" })} style={btn(dirMode === "explore")}>Explore with AI</button>
    </Reveal>
  );
}

function Wizard({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  const s = usePfStore();
  const ready = directionReady(s) && !generating;
  return (
    <Panel style={{ padding: "26px 28px", marginBottom: 18 }}>
      <Kicker style={{ marginBottom: 16 }}>Build your direction statement</Kicker>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 9 }}>Target role</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DIR_ROLE_OPTS.map((l) => (
            <Chip key={l} label={l} on={s.dirRole === l} onClick={() => s.pickDirChip("dirRole", l)} />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 9 }}>
          Tech stack <span style={{ fontWeight: 500, color: "var(--faint)" }}>(pick 3+ — these become your ATS keywords)</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DIR_STACK_OPTS.map((l) => (
            <Chip key={l} label={l} on={s.dirStack.includes(l)} onClick={() => s.toggleDirStack(l)} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 9 }}>Industry</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {DIR_INDUSTRY_OPTS.map((l) => (
              <Chip key={l} size="sm" label={l} on={s.dirIndustry === l} onClick={() => s.pickDirChip("dirIndustry", l)} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 9 }}>Company size</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {DIR_SIZE_OPTS.map((l) => (
              <Chip key={l} size="sm" label={l} on={s.dirSize === l} onClick={() => s.pickDirChip("dirSize", l)} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 9 }}>Work setting</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {DIR_SETTING_OPTS.map((l) => (
              <Chip key={l} size="sm" label={l} on={s.dirSetting === l} onClick={() => s.pickDirChip("dirSetting", l)} />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={!ready}
        style={{ cursor: ready ? "pointer" : "default", height: 46, padding: "0 24px", borderRadius: 12, border: "none", background: ready ? "var(--accent)" : "var(--panel3)", color: "#F7F1E4", fontSize: 14, fontWeight: 600 }}
      >
        Generate statement →
      </button>
    </Panel>
  );
}

function Explore() {
  const s = usePfStore();
  const task = useAiTask<AiEnvelope<ExploreData>>("/api/direction/explore");
  const [noReply, setNoReply] = useState(false);
  const [suggested, setSuggested] = useState<string | null>(null);

  // Only a real model reply goes into the chat. On any failure the message goes
  // back into the input and the panel says why, rather than a scripted line
  // standing in for the AI.
  const handleSend = async () => {
    const draft = s.chatDraft.trim();
    if (!draft || task.loading) return;
    const before = s.chat;
    const history: ChatMsg[] = [...before, { who: "you", text: draft }];
    // Keyword pick-up from the student's own words; the AI refines it below.
    s.set({ ...extractChatPatch(draft), chat: history, chatDraft: "", dirGenerated: false, dirStatementAi: null });
    setNoReply(false);
    // AI memory: the mentor sees the full Career Profile, so it never starts
    // from zero and can reference prior phases naturally.
    const context = buildMentorContext(getProfile(), usePfStore.getState().aiLog);
    const result = await task.run({
      messages: [
        { role: "system", content: context },
        ...history.map((m) => ({ role: m.who === "you" ? "user" : "assistant", content: m.text })),
      ],
    });
    const data = result?.data;
    const reply = typeof data?.response === "string" ? data.response.trim() : "";
    const cur = usePfStore.getState();
    if (!reply) {
      if (result) setNoReply(true);
      cur.set({ chat: before, chatDraft: draft });
      return;
    }
    const patch = mapExplorePreferences(data?.extractedPreferences);
    const dirStack = patch.dirStack ? [...new Set([...cur.dirStack, ...patch.dirStack])] : cur.dirStack;
    cur.set({
      ...patch,
      dirStack,
      chat: [...cur.chat, { who: "ai", text: reply }],
      chatN: cur.chatN + 1,
      dirGenerated: false,
      dirStatementAi: null,
    });
    const next = data?.suggestedStatement;
    setSuggested(data?.readyForStatement && typeof next === "string" && next.trim() ? next.trim() : null);
    // Log the AI session so future prompts can reference it ("last time…").
    cur.logAi({ phase: "direction", summary: `Explored direction: "${draft.slice(0, 60)}"`, ts: Date.now() });
    cur.emit("AiConsulted", "direction", "Talked through career direction with the AI");
  };

  const missing = [!s.dirRole && "a role", !s.dirIndustry && "an industry"].filter((x): x is string => !!x);
  const known = [
    s.dirRole && `role: ${s.dirRole}`,
    s.dirIndustry && `industry: ${s.dirIndustry}`,
    s.dirSize && `size: ${s.dirSize}`,
    s.dirStack.length > 0 && `stack: ${s.dirStack.join(", ")}`,
  ].filter((x): x is string => !!x);

  return (
    <Panel style={{ padding: "22px 24px", marginBottom: 18 }}>
      <Kicker style={{ marginBottom: 14 }}>Not sure yet? Talk it out — the AI extracts your preferences as you go</Kicker>

      {s.chat.length === 0 && (
        <div style={{ fontSize: 13.5, color: "var(--muted)", border: "1px dashed var(--lineStrong)", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
          Try: <span style={{ color: "var(--fg)", fontStyle: "italic" }}>&quot;I like building interfaces but fintech sounds interesting too — and I think I&apos;d prefer a small startup.&quot;</span>
        </div>
      )}

      {s.chat.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: 11, marginBottom: 12 }}>
          <span className="pf-mono" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: "var(--panel3)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>
            {m.who}
          </span>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: "2px 0 0", color: "var(--fg)" }}>{m.text}</p>
        </div>
      ))}

      {task.loading && (
        <div style={{ display: "flex", gap: 11, marginBottom: 12, alignItems: "center" }}>
          <span className="pf-mono" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: "var(--panel3)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>ai</span>
          <span className="pf-anim-pulse" style={{ fontSize: 13.5, color: "var(--faint)" }}>thinking…</span>
        </div>
      )}

      {s.chat.length > 0 && (
        <div style={{ border: "1px solid color-mix(in srgb,var(--strong) 30%,transparent)", background: "color-mix(in srgb,var(--strong) 8%,transparent)", borderRadius: 12, padding: "13px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, flex: 1, lineHeight: 1.55 }}>
              <span style={{ fontWeight: 700 }}>Picked up from this chat:</span> {known.length ? known.join(" · ") : "nothing yet."}
              <br />
              <span style={{ color: "var(--muted)" }}>
                {missing.length
                  ? `Still missing ${missing.join(" and ")}. Say it in the chat or pick it in the Wizard.`
                  : !s.dirSize
                    ? "No company size yet. You'll pick one in the Wizard after accepting."
                    : "Accept to carry this into the Wizard."}
              </span>
            </span>
            <button
              onClick={s.acceptChat}
              disabled={missing.length > 0}
              title={missing.length ? `Needs ${missing.join(" and ")} first` : undefined}
              style={{ cursor: missing.length ? "default" : "pointer", height: 36, padding: "0 16px", borderRadius: 9, border: "none", background: missing.length ? "var(--panel3)" : "var(--strong)", color: missing.length ? "var(--faint)" : "#fff", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}
            >
              Accept →
            </button>
          </div>
          {suggested && (
            <div style={{ marginTop: 12 }}>
              <AiTag>AI suggested statement</AiTag>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "8px 0 0" }}>{suggested}</p>
              <AiCaveat>A suggestion from the conversation, not a verdict. Accepting carries over only the choices listed above.</AiCaveat>
            </div>
          )}
        </div>
      )}

      <AiError
        message={task.error ?? (noReply ? "The AI answered without a reply. Your message is back in the box, so try sending it again." : null)}
        needsAuth={task.needsAuth}
      />

      <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
        <input
          value={s.chatDraft}
          onChange={(e) => s.set({ chatDraft: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") void handleSend(); }}
          placeholder="Tell the AI what pulls you in…"
          className="pf-input"
          style={{ flex: 1, height: 44, padding: "0 16px" }}
        />
        <GenerateButton onClick={() => void handleSend()} loading={task.loading} disabled={!s.chatDraft.trim()} loadingLabel="Sending…">
          Send
        </GenerateButton>
      </div>
    </Panel>
  );
}

function VariantChip({ title }: { title: string }) {
  const copied = usePfStore((s) => s.copiedVariant === title);
  const copyVariant = usePfStore((s) => s.copyVariant);
  return (
    <span
      onClick={() => copyVariant(title)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copyVariant(title); } }}
      className="pf-hover-border"
      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--panelSolid)" }}
    >
      {title}
      <span className="pf-mono" style={{ fontSize: 9.5, color: "var(--accent)" }}>{copied ? "copied ✓" : "copy"}</span>
    </span>
  );
}

function GeneratedStatement({ task, onSharpen }: { task: AiTask<DirectionResult>; onSharpen: () => void }) {
  const s = usePfStore();
  const ai = s.dirStatementAi;
  const statement = ai?.statement ?? directionStatement(s);
  const spec = ai ? { label: ai.specificity, tone: TIER_TONE[ai.specificity] ?? "var(--muted)" } : directionSpecificity(s);
  const suggestions = ai?.suggestions.length ? ai.suggestions : directionSuggestions(s);
  const degraded = !ai && !task.loading && task.data?.source === "local";

  // Title variants are fetched on request only: a call on mount spent quota on
  // every visit and returned 401 to every logged-out student. The result is
  // keyed on role, stack and industry, so it goes stale the moment any changes.
  const variantsTask = useAiTask<VariantsResult>("/api/direction/title-variants");
  const [aiVariants, setAiVariants] = useState<{ key: string; titles: string[] } | null>(null);
  const variantKey = [s.dirRole, s.dirStack.join(","), s.dirIndustry].join("|");
  const freshVariants = aiVariants && aiVariants.key === variantKey ? aiVariants.titles : null;
  const fetchVariants = async () => {
    if (!s.dirRole) return;
    const key = variantKey;
    setAiVariants(null);
    const result = await variantsTask.run({ role: s.dirRole, techStack: s.dirStack, ...(s.dirIndustry ? { industry: s.dirIndustry } : {}) });
    const titles = [...new Set((result?.variants ?? []).map((v) => (typeof v.title === "string" ? v.title.trim() : "")).filter(Boolean))];
    if (!titles.length) return;
    setAiVariants({ key, titles });
    s.emit("AiConsulted", "direction", `Found title variants for ${s.dirRole}`);
  };
  const starter = TITLE_VARIANTS[s.dirRole ?? ""] ?? [];

  return (
    <Reveal style={{ border: "1px solid color-mix(in srgb,var(--accent) 24%,transparent)", borderRadius: 18, background: "linear-gradient(150deg,var(--accentSoft),transparent)", padding: "28px 30px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accentText)" }}>Your direction statement</span>
        <span className="pf-mono" style={{ fontSize: 10, fontWeight: 700, color: spec.tone, border: `1px solid color-mix(in srgb, ${spec.tone} 30%, transparent)`, borderRadius: 6, padding: "2px 8px" }}>{spec.label}</span>
        {ai ? <AiTag>AI draft</AiTag> : <AiTag tone="var(--muted)">Drafted locally</AiTag>}
      </div>
      <p style={{ fontSize: 24, lineHeight: 1.35, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 12px", maxWidth: "38ch" }}>{statement}</p>
      {ai ? (
        <AiCaveat>An AI draft built from your choices. Put it in your own words before you use it.</AiCaveat>
      ) : (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginBottom: 10 }}>
            {task.loading
              ? "Asking the AI to sharpen this…"
              : degraded
                ? "The AI was unavailable, so this statement was drafted locally from your choices."
                : "Drafted locally from your choices."}
          </div>
          {!task.loading && (
            <GenerateButton onClick={onSharpen} loading={false} variant="ghost">
              {task.error || degraded ? "Try the AI again" : "Sharpen with AI"}
            </GenerateButton>
          )}
          <AiError message={task.error} needsAuth={task.needsAuth} />
        </div>
      )}
      <Kicker style={{ fontSize: 9.5, margin: "16px 0 8px" }}>How to sharpen it further</Kicker>
      {suggestions.map((t) => (
        <div key={t} style={{ display: "flex", gap: 9, padding: "6px 0" }}>
          <span style={{ color: "var(--accent)" }}>·</span>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{t}</span>
        </div>
      ))}

      <Kicker style={{ fontSize: 9.5, margin: "16px 0 10px" }}>Search with these titles — the same role hides under different names</Kicker>
      {starter.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Starter list: common titles for {s.dirRole}, not generated for you.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {starter.map((v) => <VariantChip key={v} title={v} />)}
          </div>
        </>
      )}
      <div style={{ marginTop: 14 }}>
        {freshVariants ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <AiTag>AI title variants</AiTag>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>for {s.dirRole}{s.dirIndustry ? ` in ${s.dirIndustry}` : ""}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {freshVariants.map((v) => <VariantChip key={v} title={v} />)}
            </div>
            <AiCaveat>AI suggestions. Check each title on a real job board before you rely on it.</AiCaveat>
          </>
        ) : (
          <GenerateButton onClick={() => void fetchVariants()} loading={variantsTask.loading} disabled={!s.dirRole} variant="ghost" loadingLabel="Finding titles…">
            {aiVariants ? "Find titles for your updated choices" : "Find more titles with AI"}
          </GenerateButton>
        )}
        <AiError message={variantsTask.error} needsAuth={variantsTask.needsAuth} />
      </div>
    </Reveal>
  );
}

function TargetRoles() {
  const dirRole = usePfStore((s) => s.dirRole);
  const picked = usePfStore((s) => s.dirTargetRoles);
  const toggle = usePfStore((s) => s.toggleDirTargetRole);
  const options = targetRoleOptions(dirRole);
  const full = picked.length >= 3;
  return (
    <Panel style={{ overflow: "hidden" }}>
      <div style={{ padding: "20px 24px 12px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Target roles</h2>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Tick up to three titles to search under ({picked.length}/3){full ? ". Untick one to swap it." : "."}
        </span>
      </div>
      {options.map((r) => {
        const on = picked.includes(r.title);
        const blocked = !on && full;
        return (
          <label key={r.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 24px", borderTop: "1px solid var(--line2)", cursor: blocked ? "default" : "pointer", opacity: blocked ? 0.55 : 1 }}>
            <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(r.title)} style={{ width: 16, height: 16, accentColor: "var(--accent)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.note}</div>
            </div>
            <span className="pf-mono" style={{ fontSize: 10, fontWeight: 600, color: r.tone, border: `1px solid color-mix(in srgb, ${r.tone} 30%, transparent)`, borderRadius: 6, padding: "3px 9px", flexShrink: 0 }}>{r.relation}</span>
          </label>
        );
      })}
    </Panel>
  );
}

export default function DirectionPage() {
  const dirMode = usePfStore((s) => s.dirMode);
  const dirGenerated = usePfStore((s) => s.dirGenerated);
  const dirRole = usePfStore((s) => s.dirRole);
  const onbRole = usePfStore((s) => s.onb.role);
  const statementTask = useAiTask<DirectionResult>("/api/direction");
  const { reset: resetStatement, run: runStatement } = statementTask;

  // The AI statement only counts if the chips it was written from are still the
  // chips on screen; a slow reply to an older selection is dropped.
  const sharpen = async () => {
    const st = usePfStore.getState();
    if (!st.dirGenerated) return;
    const key = dirKey(st);
    resetStatement();
    const result = await runStatement({
      roleType: st.dirRole ?? "",
      industry: st.dirIndustry ?? "",
      companySize: st.dirSize ?? "",
      workMode: st.dirSetting ?? "",
      techStack: st.dirStack,
      location: "",
    });
    const now = usePfStore.getState();
    if (!result || result.source !== "ai" || !result.statement?.trim() || !now.dirGenerated || dirKey(now) !== key) return;
    now.set({
      dirStatementAi: {
        statement: result.statement.trim(),
        specificity: result.specificity,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions.filter((x) => typeof x === "string") : [],
      },
    });
    now.emit("AiConsulted", "direction", "Drafted the direction statement with AI");
  };

  // The store records the statement (and its event) at once; the AI version follows.
  const generate = () => {
    usePfStore.getState().generateDirection();
    void sharpen();
  };

  return (
    <div>
      <PageHeader label="Phase 01 · Discovery" title="Career Direction">
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, maxWidth: "52ch" }}>
          One sentence that focuses everything downstream.{" "}
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>Industry + specific role = clear direction.</span>{" "}
          Cap yourself at three target roles.
        </p>
      </PageHeader>

      <NextStep />

      {!dirRole && (onbRole === "Product" || onbRole === "Design") && (
        <Reveal style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--panel2)", padding: "12px 16px", marginBottom: 18, fontSize: 13, lineHeight: 1.55 }}>
          You said <strong>{onbRole}</strong> in onboarding. This wizard currently covers engineering roles only, so pick the closest one below or talk it through in Explore.
        </Reveal>
      )}

      <ModeToggle />

      {dirMode === "wizard" && <Wizard onGenerate={generate} generating={statementTask.loading} />}
      {dirMode === "explore" && <Explore />}

      {dirGenerated && <GeneratedStatement task={statementTask} onSharpen={() => void sharpen()} />}

      {dirGenerated && (
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18 }}>
        <TargetRoles />

        <Panel style={{ padding: "20px 24px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>The HIRE framework</h2>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>The arc every phase maps to</span>
          <div style={{ marginTop: 16 }}>
            {HIRE_FRAMEWORK.map((h) => (
              <div key={h.k} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 0", borderBottom: "1px solid var(--line2)" }}>
                <span className="pf-mono" style={{ width: 26, height: 26, borderRadius: 8, background: "var(--panel3)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{h.k}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{h.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{h.note}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      )}
    </div>
  );
}
