"use client";

/**
 * The role / industry / company-type pickers, shared by Stage 00 onboarding and
 * the Direction wizard so both offer exactly the same options (src/lib/pf/taxonomy.ts).
 *
 * Collapsed, each shows the common options plus whatever is currently selected;
 * "Show all" reveals the rest. Chips wrap, and the shared `Chip` carries the 44px
 * touch target.
 */

import { useState } from "react";
import {
  INDUSTRIES,
  MAX_CUSTOM_ROLE_CHARS,
  OTHER_ROLE_NOTE,
  ROLES,
  ROLE_GROUPS,
  STAGES,
  findRole,
  isCustomRole,
  type ChoiceDef,
} from "@/lib/pf/taxonomy";
import { Chip } from "./ui";

type Size = "sm" | "md";
const ROW = { display: "flex", gap: 8, flexWrap: "wrap" as const };

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="pf-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", margin: "12px 0 7px" }}>
      {children}
    </div>
  );
}

function ShowAllToggle({ expanded, onClick, noun, total }: { expanded: boolean; onClick: () => void; noun: string; total: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="pf-tap"
      style={{ cursor: "pointer", background: "none", border: "none", padding: "0 2px", marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--accentText)", textDecoration: "underline", justifyContent: "flex-start" }}
    >
      {expanded ? `Show fewer ${noun}` : `Show all ${total} ${noun}`}
    </button>
  );
}

/** Role chips grouped by area, with a free-text "Other". `value` is the role label, or the typed role. */
export function RolePicker({ value, onPick, size = "md" }: { value: string | null; onPick: (v: string | null) => void; size?: Size }) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const selected = findRole(value);
  const custom = isCustomRole(value);
  const otherOn = custom || (open && !value);
  const shown = (r: (typeof ROLES)[number]) => expanded || r.common || r.id === selected?.id;

  return (
    <div>
      {ROLE_GROUPS.map((g) => {
        const roles = ROLES.filter((r) => r.group === g && shown(r));
        if (!roles.length) return null;
        return (
          <div key={g}>
            <GroupLabel>{g}</GroupLabel>
            <div style={ROW}>
              {roles.map((r) => (
                <Chip key={r.id} size={size} label={r.label} on={selected?.id === r.id} onClick={() => { setOpen(false); onPick(r.label); }} />
              ))}
            </div>
          </div>
        );
      })}
      <ShowAllToggle expanded={expanded} onClick={() => setExpanded((x) => !x)} noun="roles" total={ROLES.length} />

      <GroupLabel>Something else</GroupLabel>
      <div style={ROW}>
        <Chip size={size} label="Other role" on={otherOn} onClick={() => { setOpen(true); if (!custom) onPick(null); }} />
      </div>
      {otherOn && (
        <div style={{ marginTop: 10 }}>
          <input
            value={text ?? (custom ? value ?? "" : "")}
            onChange={(e) => { setText(e.target.value); onPick(e.target.value.trim() || null); }}
            maxLength={MAX_CUSTOM_ROLE_CHARS}
            placeholder="Type your role, e.g. Hardware verification"
            aria-label="Other role"
            className="pf-input"
            style={{ width: "100%", maxWidth: 380, height: 44, padding: "0 14px" }}
          />
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginTop: 8, maxWidth: "56ch" }}>{OTHER_ROLE_NOTE}</div>
        </div>
      )}
    </div>
  );
}

/** A flat set of choices that shows the common ones first. Used for industries and company types. */
export function ChoicePicker({
  options, value, onPick, size = "md", noun, collapsible = false,
}: {
  options: ChoiceDef[];
  value: string | null;
  onPick: (v: string) => void;
  size?: Size;
  noun: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = options.filter((o) => !collapsible || expanded || o.common || o.label === value);
  return (
    <div>
      <div style={ROW}>
        {visible.map((o) => (
          <Chip key={o.id} size={size} label={o.label} on={value === o.label} onClick={() => onPick(o.label)} />
        ))}
      </div>
      {collapsible && <ShowAllToggle expanded={expanded} onClick={() => setExpanded((x) => !x)} noun={noun} total={options.length} />}
    </div>
  );
}

export const IndustryPicker = (p: { value: string | null; onPick: (v: string) => void; size?: Size }) => (
  <ChoicePicker options={INDUSTRIES} noun="industries" collapsible {...p} />
);

export const StagePicker = (p: { value: string | null; onPick: (v: string) => void; size?: Size }) => (
  <ChoicePicker options={STAGES} noun="company types" {...p} />
);
