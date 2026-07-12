"use client";

/**
 * Phase 01 — Career Direction. Wizard chip-builder + "Explore with AI" chat,
 * generated direction statement with specificity meter, title variants,
 * target roles and the HIRE framework.
 */

import { useEffect, useState, type CSSProperties } from "react";
import {
  DIR_INDUSTRY_OPTS,
  DIR_ROLE_OPTS,
  DIR_SETTING_OPTS,
  DIR_SIZE_OPTS,
  DIR_STACK_OPTS,
  HIRE_FRAMEWORK,
  TARGET_ROLES,
  TITLE_VARIANTS,
} from "@/lib/pf/data";
import {
  chatReplyFor,
  directionReady,
  directionSpecificity,
  directionStatement,
  directionSuggestions,
  extractChatPatch,
} from "@/lib/pf/logic";
import { getProfile, usePfStore, type ChatMsg } from "@/lib/pf/store";
import { buildMentorContext } from "@/lib/pf/orchestrator";
import { Chip, Kicker, PageHeader, Panel, Reveal } from "@/components/pf/ui";
import { NextStep } from "@/components/pf/next-step";

/** Map the explore API's free-text preferences onto the wizard's chip values. */
function mapApiPreferences(p: { role?: string; industry?: string } | undefined) {
  const patch: { dirRole?: string; dirIndustry?: string } = {};
  const role = (p?.role || "").toLowerCase();
  if (/front/.test(role)) patch.dirRole = "Frontend";
  else if (/back/.test(role)) patch.dirRole = "Backend";
  else if (/data|ml|machine/.test(role)) patch.dirRole = "Data / ML";
  else if (/full|software|swe|product/.test(role)) patch.dirRole = "Full-Stack SWE";
  const ind = (p?.industry || "").toLowerCase();
  if (/fintech|finance/.test(ind)) patch.dirIndustry = "Fintech";
  else if (/travel/.test(ind)) patch.dirIndustry = "Travel Tech";
  else if (/health/.test(ind)) patch.dirIndustry = "Healthtech";
  else if (/dev|tool/.test(ind)) patch.dirIndustry = "Dev Tools";
  return patch;
}

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

function Wizard() {
  const s = usePfStore();
  const ready = directionReady(s);
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
        onClick={s.generateDirection}
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
  const [thinking, setThinking] = useState(false);
  const chatReady = s.chatN >= 3 || (s.chatN >= 2 && !!s.dirRole && !!s.dirIndustry);
  const statement = directionStatement(s);

  // Sends via the OpenAI-backed explore route; the design's local extraction
  // and canned replies are the silent fallback when the API is unavailable.
  const handleSend = async () => {
    const draft = s.chatDraft.trim();
    if (!draft || thinking) return;
    const localPatch = extractChatPatch(draft);
    const history: ChatMsg[] = [...s.chat, { who: "you", text: draft }];
    s.set({ ...localPatch, chat: history, chatDraft: "", dirGenerated: false });
    setThinking(true);
    try {
      // AI memory: the mentor sees the full Career Profile, so it never starts
      // from zero and can reference prior phases naturally.
      const context = buildMentorContext(getProfile(), usePfStore.getState().aiLog);
      const res = await fetch("/api/direction/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: context },
            ...history.map((m) => ({ role: m.who === "you" ? "user" : "assistant", content: m.text })),
          ],
        }),
      });
      const json: unknown = res.ok ? await res.json() : null;
      const data = (json as { data?: { response?: string; extractedPreferences?: { role?: string; industry?: string } } } | null)?.data;
      const reply = data?.response && typeof data.response === "string" ? data.response : chatReplyFor(usePfStore.getState().chatN);
      const apiPatch = mapApiPreferences(data?.extractedPreferences);
      s.set({
        ...apiPatch,
        chat: [...history, { who: "ai", text: reply }],
        chatN: usePfStore.getState().chatN + 1,
      });
      // Log the AI session so future prompts can reference it ("last time…").
      if (data?.response) {
        s.logAi({ phase: "direction", summary: `Explored direction: "${draft.slice(0, 60)}"`, ts: Date.now() });
      }
    } catch {
      s.set({
        chat: [...history, { who: "ai", text: chatReplyFor(usePfStore.getState().chatN) }],
        chatN: usePfStore.getState().chatN + 1,
      });
    } finally {
      setThinking(false);
    }
  };
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

      {chatReady && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid color-mix(in srgb,var(--strong) 30%,transparent)", background: "color-mix(in srgb,var(--strong) 8%,transparent)", borderRadius: 12, padding: "13px 16px", marginBottom: 14 }}>
          <span style={{ fontSize: 13, flex: 1 }}>
            <span style={{ fontWeight: 700 }}>Direction drafted from this chat.</span> {statement}
          </span>
          <button
            onClick={s.acceptChat}
            style={{ cursor: "pointer", height: 36, padding: "0 16px", borderRadius: 9, border: "none", background: "var(--strong)", color: "#fff", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Accept →
          </button>
        </div>
      )}

      {thinking && (
        <div style={{ display: "flex", gap: 11, marginBottom: 12, alignItems: "center" }}>
          <span className="pf-mono" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: "var(--panel3)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>ai</span>
          <span className="pf-anim-pulse" style={{ fontSize: 13.5, color: "var(--faint)" }}>thinking…</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 9 }}>
        <input
          value={s.chatDraft}
          onChange={(e) => s.set({ chatDraft: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") void handleSend(); }}
          placeholder="Tell the AI what pulls you in…"
          className="pf-input"
          style={{ flex: 1, height: 44, padding: "0 16px" }}
        />
        <button
          onClick={() => void handleSend()}
          style={{ cursor: "pointer", height: 44, padding: "0 20px", borderRadius: 11, border: "none", background: "var(--accent)", color: "#F7F1E4", fontSize: 13.5, fontWeight: 600 }}
        >
          Send
        </button>
      </div>
    </Panel>
  );
}

function GeneratedStatement() {
  const s = usePfStore();
  const statement = directionStatement(s);
  const spec = directionSpecificity(s);
  const suggestions = directionSuggestions(s);
  const [aiVariants, setAiVariants] = useState<string[]>([]);

  // Live title variants from the AI route; static design list as fallback.
  useEffect(() => {
    if (!s.dirRole) return;
    const controller = new AbortController();
    fetch("/api/direction/title-variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: s.dirRole, techStack: s.dirStack, industry: s.dirIndustry ?? "Technology" }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        const raw = (json as { variants?: { title?: string }[] } | null)?.variants;
        const titles = Array.isArray(raw) ? raw.map((v) => v.title).filter((t): t is string => !!t).slice(0, 4) : [];
        if (titles.length >= 2) setAiVariants(titles);
      })
      .catch(() => { /* static variants render */ });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.dirRole]);

  const variants = aiVariants.length >= 2 ? aiVariants : TITLE_VARIANTS[s.dirRole ?? "Full-Stack SWE"] ?? TITLE_VARIANTS["Full-Stack SWE"];
  return (
    <Reveal style={{ border: "1px solid color-mix(in srgb,var(--accent) 24%,transparent)", borderRadius: 18, background: "linear-gradient(150deg,var(--accentSoft),transparent)", padding: "28px 30px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span className="pf-mono" style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accentText)" }}>Your direction statement</span>
        <span className="pf-mono" style={{ fontSize: 10, fontWeight: 700, color: spec.tone, border: `1px solid color-mix(in srgb, ${spec.tone} 30%, transparent)`, borderRadius: 6, padding: "2px 8px" }}>{spec.label}</span>
      </div>
      <p style={{ fontSize: 24, lineHeight: 1.35, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 18px", maxWidth: "38ch" }}>{statement}</p>
      <Kicker style={{ fontSize: 9.5, marginBottom: 8 }}>How to sharpen it further</Kicker>
      {suggestions.map((t) => (
        <div key={t} style={{ display: "flex", gap: 9, padding: "6px 0" }}>
          <span style={{ color: "var(--accent)" }}>·</span>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{t}</span>
        </div>
      ))}
      <Kicker style={{ fontSize: 9.5, margin: "16px 0 10px" }}>Search with these titles — the same role hides under different names</Kicker>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {variants.map((v) => (
          <span
            key={v}
            onClick={() => s.copyVariant(v)}
            className="pf-hover-border"
            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--panelSolid)" }}
          >
            {v}
            <span className="pf-mono" style={{ fontSize: 9.5, color: "var(--accent)" }}>{s.copiedVariant === v ? "copied ✓" : "copy"}</span>
          </span>
        ))}
      </div>
    </Reveal>
  );
}

export default function DirectionPage() {
  const dirMode = usePfStore((s) => s.dirMode);
  const dirGenerating = usePfStore((s) => s.dirGenerating);
  const dirGenerated = usePfStore((s) => s.dirGenerated);

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

      <ModeToggle />

      {dirMode === "wizard" && <Wizard />}
      {dirMode === "explore" && <Explore />}

      {dirGenerating && (
        <div className="pf-panel" style={{ padding: 34, textAlign: "center", marginBottom: 18 }}>
          <div className="pf-anim-spin" style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--panel3)", borderTopColor: "var(--accent)", margin: "0 auto 14px" }} />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Composing your statement…</div>
        </div>
      )}

      {dirGenerated && !dirGenerating && <GeneratedStatement />}

      {dirGenerated && (
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18 }}>
        <Panel style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 12px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Target roles</h2>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Common role families for your direction</span>
          </div>
          {TARGET_ROLES.map((r) => (
            <div key={r.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 24px", borderTop: "1px solid var(--line2)" }}>
              <span className="pf-mono" style={{ fontSize: 20, fontWeight: 700, color: r.tone, width: 40 }}>{r.fit}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.note}</div>
              </div>
              <span className="pf-mono" style={{ fontSize: 10, fontWeight: 600, color: r.tone, border: `1px solid color-mix(in srgb, ${r.tone} 30%, transparent)`, borderRadius: 6, padding: "3px 9px" }}>{r.label}</span>
            </div>
          ))}
        </Panel>

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
