// Pure, browser-safe parser for LinkedIn's data-export Connections.csv.
// GDPR data minimisation: only name, company and position leave this module.
// Email, profile URL, connection date and every other column are dropped.

export interface ImportRow {
  firstName: string;
  lastName: string;
  name: string;
  company: string;
  position: string;
}

const MAX_LEN = 120;

const NOT_CONNECTIONS =
  "That doesn't look like LinkedIn's Connections.csv. On LinkedIn, go to Settings, Data privacy, Get a copy of your data, tick Connections, then upload the Connections.csv file from the download.";

/** RFC 4180: quoted fields, "" escapes, newlines in quotes. Input pre-normalised to LF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clip = (s: string) => s.trim().slice(0, MAX_LEN);

export function parseLinkedInConnections(text: string): {
  rows: ImportRow[];
  error?: string;
} {
  const table = parseCsv(text.replace(/^﻿/, "").replace(/\r\n?/g, "\n"));
  const need = ["first name", "last name", "company", "position"];
  let cols: number[] = [];
  const h = table.findIndex((r) => {
    const names = r.map((c) => c.trim().toLowerCase());
    cols = need.map((n) => names.indexOf(n));
    return cols.every((i) => i >= 0);
  });
  if (h < 0) return { rows: [], error: NOT_CONNECTIONS };

  const rows: ImportRow[] = [];
  for (const r of table.slice(h + 1)) {
    const [firstName, lastName, company, position] = cols.map((i) => clip(r[i] ?? ""));
    const name = clip(`${firstName} ${lastName}`);
    if (!name) continue;
    rows.push({ firstName, lastName, name, company, position });
  }
  return { rows };
}

/** Rows the student ticked in the preview, in original order. */
export function selectImportRows<T>(rows: T[], tickedIndexes: Iterable<number>): T[] {
  const ticked = new Set(tickedIndexes);
  return rows.filter((_, i) => ticked.has(i));
}
