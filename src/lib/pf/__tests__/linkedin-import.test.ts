import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLinkedInConnections, selectImportRows } from "../linkedin-import";

const fixture = readFileSync(join(__dirname, "fixtures", "Connections.csv"), "utf8").replace(/\r\n/g, "\n");

describe("parseLinkedInConnections", () => {
  const { rows, error } = parseLinkedInConnections(fixture);

  it("skips the preamble and finds the header", () => {
    expect(error).toBeUndefined();
    expect(rows.map((r) => r.name)).toEqual(["Alex Example", "Sam Placeholder, Jr.", "Jo Sample"]);
    expect(rows[0]).toEqual({
      firstName: "Alex",
      lastName: "Example",
      name: "Alex Example",
      company: "Acme Analytics",
      position: "Data Analyst",
    });
  });

  it("handles quoted commas, escaped quotes and newlines", () => {
    expect(rows[1].company).toBe("Widgets, Inc.");
    expect(rows[1].position).toBe('Senior "Growth" Lead');
    expect(rows[2].position).toBe("Head of\nPlatform");
  });

  it("never outputs email or URL", () => {
    const json = JSON.stringify(rows);
    expect(json).not.toMatch(/example\.test|linkedin\.com|@|Sep 2026/);
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(["company", "firstName", "lastName", "name", "position"]);
    }
  });

  it("skips rows with an empty name", () => {
    expect(rows.find((r) => r.company === "Nameless Ltd")).toBeUndefined();
  });

  it("copes with a BOM and CRLF", () => {
    const crlf = "﻿" + fixture.replace(/\n/g, "\r\n");
    expect(parseLinkedInConnections(crlf)).toEqual({ rows });
  });

  it("matches the header case-insensitively and clips to 120 chars", () => {
    const r = parseLinkedInConnections(`first name,LAST NAME,company,Position\nA,B,${"x".repeat(200)},Dev`);
    expect(r.rows[0].company).toHaveLength(120);
  });

  it("returns an error for a non-LinkedIn CSV", () => {
    const r = parseLinkedInConnections("id,title\n1,Hello\n");
    expect(r.rows).toEqual([]);
    expect(r.error).toMatch(/Connections\.csv/);
  });
});

describe("selectImportRows", () => {
  it("keeps only ticked rows", () => {
    expect(selectImportRows(["a", "b", "c"], [0, 2])).toEqual(["a", "c"]);
    expect(selectImportRows(["a", "b"], [])).toEqual([]);
  });
});
