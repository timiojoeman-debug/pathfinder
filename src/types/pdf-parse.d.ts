declare module "pdf-parse" {
  function pdfParse(data: Buffer): Promise<{ text: string }>;
  export default pdfParse;
}

/**
 * The library module, imported directly.
 *
 * pdf-parse@1.1.1's package entry point runs a debug block that reads a bundled
 * test fixture whenever `module.parent` is falsy — always the case under ESM —
 * so importing "pdf-parse" throws ENOENT before parsing anything. The module
 * below is the actual implementation, with no such side effect. See the note in
 * api/cv/analyze/route.ts.
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(data: Buffer): Promise<{ text: string }>;
  export default pdfParse;
}
