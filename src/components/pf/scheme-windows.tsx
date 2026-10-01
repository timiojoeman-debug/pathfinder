"use client";

/**
 * "Your windows": every saved scheme the student has dated, with the step that
 * matters now, worked back from their own dates. Nothing here is invented: a
 * scheme without dates simply isn't listed, and the empty state says how to add them.
 */

import Link from "next/link";
import { formatReminder, isoToday, timingPlan } from "@/lib/pf/logic";
import { useProfile } from "@/lib/pf/store";
import { Kicker, Panel } from "./ui";

export function SchemeWindows() {
  const { schemeWindows } = useProfile();
  const today = isoToday();
  const rows = schemeWindows
    .map((w) => ({ w, step: timingPlan(w, today) }))
    .filter((r) => r.step)
    .sort((a, b) => a.step!.date.localeCompare(b.step!.date));

  return (
    <Panel style={{ padding: "18px 22px", marginBottom: 18 }}>
      <Kicker style={{ fontSize: 9.5, marginBottom: 10 }}>Your windows</Kicker>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0, maxWidth: "62ch" }}>
          Save a scheme, then open it on the <Link href="/tracker" style={{ color: "var(--accentText)" }}>tracker</Link> and add
          its opening and deadline from the company&apos;s careers page. PathFinder works back from those dates.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(({ w, step }) => (
            <li key={w.company + w.role} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 140 }}>{w.company}</span>
              <span style={{ fontSize: 13, color: step!.due ? "var(--fg)" : "var(--muted)", flex: "1 1 240px" }}>{step!.title}</span>
              <span className="pf-mono" style={{ fontSize: 10.5, color: step!.due ? "var(--warn)" : "var(--faint)" }}>
                {step!.due ? "now" : `from ${formatReminder(step!.date)}`}
                {w.deadline ? ` · closes ${formatReminder(w.deadline)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
