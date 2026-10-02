"use client";

/**
 * The cross-page mentor — a docked panel available from every phase.
 *
 * Advisory only, by design. It reads the derived Career Profile and the recent
 * event log, and it answers. It cannot save a job, tick a problem, edit the CV
 * or log an event on the student's behalf, and the reply is never parsed for
 * actions. When asked to do something it says where in the product that
 * happens, and the student does it.
 *
 * The reason is the same one that governs `progress.ts`: the store is the
 * record of work actually done. An assistant that could write to it could
 * manufacture progress out of a misread question, and every number in the
 * product is derived from that store.
 *
 * The conversation persists (it is genuinely annoying to lose context on
 * navigation) but the open/closed state does not — reopening the app into a
 * panel you did not open is startling.
 */

import { useEffect, useRef } from "react";
import { usePfStore, useProfile, useProgress } from "@/lib/pf/store";
import { relativeTime } from "@/lib/pf/events";
import { useAiTask } from "@/lib/pf/use-ai";
import { AiError } from "@/components/pf/ai-panel";

const mono = "var(--font-mono), 'JetBrains Mono', monospace";

const RECENT_LIMIT = 8;

/** Openers that are answerable from profile data alone, so a student's first
 *  question is not a blank box. */
const STARTERS = [
  "What should I do next?",
  "What's weakest in my profile?",
  "Where are my biggest skill gaps?",
];

interface ChatReply {
  reply?: string;
}

export function MentorAssistant() {
  const open = usePfStore((s) => s.asstOpen);
  const msgs = usePfStore((s) => s.asstMsgs);
  const draft = usePfStore((s) => s.asstDraft);
  const set = usePfStore((s) => s.set);
  const emit = usePfStore((s) => s.emit);

  const profile = useProfile();
  const progress = useProgress();

  const { loading, error, needsAuth, run } = useAiTask<ChatReply>("/api/mentor/chat");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, msgs, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    const next = [...msgs, { role: "user" as const, content: question }];
    set({ asstMsgs: next, asstDraft: "" });

    const result = await run({
      messages: next,
      context: {
        directionStatement: profile.directionStatement ?? undefined,
        targetRole: profile.targetRole ?? undefined,
        currentPhase: profile.currentPhase,
        progressLines: [
          `${progress.overall}% overall (${progress.band})`,
          ...progress.phases.map((p) => `${p.pct}% ${p.label}`),
        ],
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
        currentSkills: profile.currentSkills.slice(0, 20),
        missingSkills: profile.missingSkills.slice(0, 20),
        recentActivity: profile.events.slice(0, RECENT_LIMIT).map((e) => `${e.label} (${relativeTime(e.ts)})`),
      },
    });

    if (result?.reply) {
      // Append to the latest state rather than to `next`, so a reply cannot
      // clobber a question the student typed while waiting.
      set({ asstMsgs: [...usePfStore.getState().asstMsgs, { role: "assistant", content: result.reply }] });
      emit("AiConsulted", profile.currentPhase, "Asked the mentor a question");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => set({ asstOpen: true })}
        aria-label="Open the mentor"
        style={{
          position: "fixed", right: 22, bottom: 22, zIndex: 55,
          display: "flex", alignItems: "center", gap: 9, height: 46, padding: "0 18px",
          borderRadius: 23, border: "1px solid var(--lineStrong)", background: "var(--accent)",
          color: "var(--onAccent)", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 6px 22px color-mix(in srgb,var(--accent) 28%,transparent)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--onAccent)" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 21 11.5z" />
        </svg>
        Ask the mentor
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Mentor"
      className="pf-assistant"
      style={{
        position: "fixed", right: 22, bottom: 22, zIndex: 55,
        width: "min(390px, calc(100vw - 32px))", maxHeight: "min(560px, calc(100dvh - 44px))",
        display: "flex", flexDirection: "column",
        border: "1px solid var(--lineStrong)", borderRadius: 18, background: "var(--panelSolid)",
        boxShadow: "0 18px 48px rgba(0,0,0,.22)", overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
          borderBottom: "1px solid var(--line)", background: "var(--accentSoft)", flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>Mentor</span>
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)" }}>
          advice only
        </span>
        {msgs.length > 0 && (
          <button
            onClick={() => set({ asstMsgs: [] })}
            style={{ border: "none", background: "transparent", color: "var(--faint)", fontSize: 11.5, cursor: "pointer", padding: 0 }}
          >
            Clear
          </button>
        )}
        <button
          onClick={() => set({ asstOpen: false })}
          aria-label="Close the mentor"
          style={{ border: "none", background: "transparent", color: "var(--muted)", fontSize: 17, lineHeight: 1, cursor: "pointer", padding: 0 }}
        >
          ×
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", minHeight: 130 }}>
        {msgs.length === 0 && (
          <div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
              I can see your profile and what you&apos;ve logged. Ask me about it — I&apos;ll point you
              at the right page, but you make the changes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {STARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  style={{
                    textAlign: "left", cursor: "pointer", border: "1px solid var(--line)",
                    background: "var(--panel2)", borderRadius: 10, padding: "9px 12px",
                    fontSize: 12.5, color: "var(--fg)", fontFamily: "inherit",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: "86%", borderRadius: 13, padding: "9px 12px",
                fontSize: 12.5, lineHeight: 1.65, whiteSpace: "pre-wrap",
                background: m.role === "user" ? "var(--accent)" : "var(--panel2)",
                color: m.role === "user" ? "var(--onAccent)" : "var(--fg)",
                border: m.role === "user" ? "none" : "1px solid var(--line)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--faint)" }}>
            <span
              className="pf-anim-spin"
              style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--panel3)", borderTopColor: "var(--accent)" }}
            />
            Thinking…
          </div>
        )}

        <AiError message={error} needsAuth={needsAuth} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: "11px 14px", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
        <input
          value={draft}
          onChange={(e) => set({ asstDraft: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
          placeholder="Ask about your profile…"
          className="pf-input"
          style={{ flex: 1, height: 40, padding: "0 13px", fontSize: 13, minWidth: 0 }}
        />
        <button
          onClick={() => void send(draft)}
          disabled={!draft.trim() || loading}
          style={{
            cursor: !draft.trim() || loading ? "default" : "pointer", height: 40, padding: "0 15px",
            borderRadius: 10, border: "none", flexShrink: 0,
            background: !draft.trim() || loading ? "var(--panel3)" : "var(--accent)",
            color: !draft.trim() || loading ? "var(--faint)" : "var(--onAccent)",
            fontSize: 13, fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
