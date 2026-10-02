"use client";

/**
 * "Import from LinkedIn": the student picks their own Connections.csv, it is read
 * in the browser (never uploaded), and only the rows they tick become contacts.
 * Only name, company and position are kept; everything else in the file is dropped
 * by the parser. Ticking is opt-in, and capped, so a 500-person export cannot flood
 * the board or the browser's storage.
 */

import { useState, type ChangeEvent } from "react";
import { MAX_CONTACTS, MAX_IMPORT_ROWS } from "@/lib/pf/contacts";
import { parseLinkedInConnections, selectImportRows, type ImportRow } from "@/lib/pf/linkedin-import";
import { usePfStore } from "@/lib/pf/store";

const btn = { cursor: "pointer", height: 36, padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 } as const;
const PANEL_ID = "linkedin-import-panel";

export function LinkedInImport() {
  const addContacts = usePfStore((s) => s.addContacts);
  const have = usePfStore((s) => s.contacts.length);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [noName, setNoName] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);

  // One import adds at most MAX_IMPORT_ROWS, and the board holds at most MAX_CONTACTS.
  const allowance = Math.max(0, Math.min(MAX_IMPORT_ROWS, MAX_CONTACTS - have));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSummary(null);
    let parsed: ReturnType<typeof parseLinkedInConnections>;
    try {
      parsed = parseLinkedInConnections(await file.text());
    } catch {
      parsed = { rows: [], skippedNoName: 0, error: "That file couldn't be read. Try the Connections.csv from your LinkedIn download." };
    }
    setError(parsed.error ?? (parsed.rows.length === 0 ? "No connections were found in that file." : null));
    setRows(parsed.error ? [] : parsed.rows);
    setNoName(parsed.error ? 0 : parsed.skippedNoName);
    setTicked(new Set());
  };

  const toggle = (i: number) =>
    setTicked((t) => {
      const n = new Set(t);
      if (n.has(i)) n.delete(i);
      else if (n.size < allowance) n.add(i);
      return n;
    });
  const tickable = Math.min(rows.length, allowance);
  const allTicked = tickable > 0 && ticked.size === tickable;

  const doImport = () => {
    const { added, skipped } = addContacts(
      selectImportRows(rows, ticked).map((r) => ({ name: r.name, company: r.company, role: r.position, howWeMet: "linkedin" as const })),
    );
    setSummary(`Added ${added}, skipped ${skipped} already on your board.`);
    setRows([]);
    setNoName(0);
    setTicked(new Set());
  };

  return (
    <div style={{ borderTop: "1px solid var(--line2)", paddingTop: 14, marginTop: 14 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="pf-touch"
        style={{ ...btn, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--fg)" }}
      >
        Import from LinkedIn
      </button>
      <div role="status" style={{ fontSize: 12.5, color: "var(--muted)", marginTop: summary ? 8 : 0 }}>{summary}</div>
      <div id={PANEL_ID} hidden={!open} style={{ marginTop: 10 }}>
        {open && (
          <>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 6px" }}>
              On LinkedIn go to Settings, then Data privacy, then Get a copy of your data, and tick Connections. When the download arrives, choose its Connections.csv here.
            </p>
            <p style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.55, margin: "0 0 10px" }}>
              The file never leaves your browser, and only name, company and position are kept.
            </p>
            <input type="file" accept=".csv" aria-label="LinkedIn Connections.csv" onChange={onFile} style={{ fontSize: 12.5 }} />
            {error && <div role="alert" style={{ fontSize: 12.5, color: "var(--risk)", marginTop: 8 }}>{error}</div>}
            {rows.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 6px" }}>
                  {allowance > 0 ? `You can import up to ${allowance} more (${MAX_IMPORT_ROWS} at a time, ${MAX_CONTACTS} contacts in total).` : `Your board is full (${MAX_CONTACTS} contacts). Delete some before importing more.`}
                  {noName > 0 && ` ${noName} ${noName === 1 ? "row was" : "rows were"} left out for having no name.`}
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={allTicked}
                    disabled={allowance === 0}
                    onChange={() => setTicked(allTicked ? new Set() : new Set(Array.from({ length: tickable }, (_, i) => i)))}
                  />
                  Select all ({tickable}{tickable < rows.length ? ` of ${rows.length}` : ""})
                </label>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 280, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
                  {rows.map((r, i) => (
                    <li key={i} style={{ borderBottom: "1px solid var(--line2)", padding: "6px 10px" }}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5 }}>
                        <input type="checkbox" checked={ticked.has(i)} disabled={!ticked.has(i) && ticked.size >= allowance} onChange={() => toggle(i)} aria-label={`Import ${r.name}`} />
                        <span style={{ overflowWrap: "anywhere" }}>
                          <strong>{r.name}</strong>
                          <span style={{ color: "var(--muted)" }}> · {r.company || "No company"} · {r.position || "No position"}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={doImport}
                  disabled={ticked.size === 0}
                  aria-describedby="linkedin-import-hint"
                  className="pf-touch"
                  style={{ ...btn, marginTop: 10, border: "none", background: ticked.size ? "var(--accent)" : "var(--panel3)", color: ticked.size ? "var(--onAccent)" : "var(--faint)", cursor: ticked.size ? "pointer" : "default" }}
                >
                  Add {ticked.size} {ticked.size === 1 ? "contact" : "contacts"}
                </button>
                {ticked.size === 0 && <span id="linkedin-import-hint" style={{ fontSize: 12, color: "var(--faint)", marginLeft: 10 }}>Tick at least one person to add them.</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
