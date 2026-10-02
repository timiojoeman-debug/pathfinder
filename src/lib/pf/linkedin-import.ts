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

const RESAVED =
  "This file looks re-saved in a different format (its columns are separated by semicolons). Please use the original Connections.csv from your LinkedIn download, without opening and saving it in a spreadsheet.";

export function parseLinkedInConnections(text: string): {
  rows: ImportRow[];
  error?: string;
  /** Rows left out because they had no first or last name. */
  skippedNoName: number;
} {
  const table = parseCsv(text.replace(/^﻿/, "").replace(/\r\n?/g, "\n"));
  const need = ["first name", "last name", "company", "position"];
  let cols: number[] = [];
  const h = table.findIndex((r) => {
    const names = r.map((c) => c.trim().toLowerCase());
    cols = need.map((n) => names.indexOf(n));
    return cols.every((i) => i >= 0);
  });
  if (h < 0) {
    const need2 = ["first name", "last name", "company", "position"];
    const semicolons = text.split(/\r\n?|\n/).some((l) => {
      const cells = l.split(";").map((c) => c.trim().toLowerCase());
      return need2.every((n) => cells.includes(n));
    });
    return { rows: [], skippedNoName: 0, error: semicolons ? RESAVED : NOT_CONNECTIONS };
  }

  const rows: ImportRow[] = [];
  let skippedNoName = 0;
  for (const r of table.slice(h + 1)) {
    const [firstName, lastName, company, position] = cols.map((i) => clip(r[i] ?? ""));
    const name = clip(`${firstName} ${lastName}`);
    if (!name) {
      // A fully blank line is just trailing whitespace, not a dropped connection.
      if (r.some((c) => c.trim())) skippedNoName++;
      continue;
    }
    rows.push({ firstName, lastName, name, company, position });
  }
  return { rows, skippedNoName };
}

/** Rows the student ticked in the preview, in original order. */
export function selectImportRows<T>(rows: T[], tickedIndexes: Iterable<number>): T[] {
  const ticked = new Set(tickedIndexes);
  return rows.filter((_, i) => ticked.has(i));
}
