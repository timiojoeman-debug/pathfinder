import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";

/**
 * Fetch a job-posting URL server-side and return its extracted text, so a
 * student can paste a link instead of the whole description.
 *
 * This grounds the downstream analysis in the REAL posting text — it never asks
 * a model to describe a URL it can't read (which invents requirements). If the
 * page can't be read (JS-rendered board, blocked, timeout), it fails with a
 * clear "paste it instead" message rather than guessing.
 *
 * SSRF guard: http/https only, and the initial host cannot be localhost or a
 * private range. Redirects are followed for the common http→https / canonical
 * case; only extracted public text is ever returned to the caller.
 */

const BLOCKED_HOST =
  /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0$|\[?::1\]?$)/i;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const raw = typeof __p.data.url === "string" ? __p.data.url.trim() : "";

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Enter a valid URL (including https://)." }, { status: 400 });
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return NextResponse.json({ error: "Only http/https links are supported." }, { status: 400 });
    }
    if (BLOCKED_HOST.test(url.hostname)) {
      return NextResponse.json({ error: "That host isn't allowed." }, { status: 400 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PathFinderBot/1.0)" },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Couldn't read that page (HTTP ${res.status}). Paste the description below instead.` },
        { status: 502 },
      );
    }
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html") && !ctype.includes("text/plain")) {
      return NextResponse.json(
        { error: "That link isn't a readable job posting. Paste the description below instead." },
        { status: 415 },
      );
    }

    const html = (await res.text()).slice(0, 200_000);
    const text = stripHtml(html).slice(0, 8000);
    if (text.length < 120) {
      return NextResponse.json(
        { error: "Couldn't extract enough text (the page may need JavaScript). Paste the description below instead." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "The page took too long to load. Paste the description below instead." : "Couldn't fetch that link. Paste the description below instead." },
      { status: 502 },
    );
  }
}
