#!/usr/bin/env node
/* One state per process, one screenshot, and it refuses to lie about where it
 * landed.
 *
 * Two failures this script exists to prevent, both of which produced confident
 * wrong output earlier:
 *  - Several browser contexts in one node process exhausted the heap mid-run.
 *  - A single scrollTo against a height measured a second earlier stops short,
 *    because the document is still growing while Next hydrates and fonts land.
 *    The first version screenshotted the phases grid and reported "arrives:yes".
 *
 *   node one.mjs <name> <width> <height> <dark 0|1> <reduced 0|1>
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));
const OUT = path.resolve("scrollcraft/builds/pathfinder-ascent/lab");
fs.mkdirSync(OUT, { recursive: true });

const [name, w, h, dark, reduced] = process.argv.slice(2);

const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({
  viewport: { width: +w, height: +h },
  reducedMotion: reduced === "1" ? "reduce" : "no-preference",
});

const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

/* Seed the store before boot: ThemeController rewrites <html data-theme> from
   localStorage, so setting the attribute after load renders light regardless. */
if (dark === "1") {
  await p.addInitScript(() => { try { localStorage.setItem("pf-theme", "dark"); } catch {} });
}

const PORT = process.env.PF_PORT || "3000";
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await p.waitForSelector("canvas");
const theme = await p.evaluate(() => document.documentElement.getAttribute("data-theme"));
if (dark === "1" && theme !== "dark") throw new Error(`asked for dark, page is '${theme}'`);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1000);

const vhs = await p.evaluate(() =>
  +(document.documentElement.scrollHeight / innerHeight).toFixed(2));

/* Converge on the real bottom rather than trusting one measurement. */
let last = -1;
for (let i = 0; i < 6; i++) {
  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await p.evaluate((y) => scrollTo(0, y), max);
  await p.waitForTimeout(700);
  const now = await p.evaluate(() => scrollY);
  if (Math.abs(now - last) < 2) break;
  last = now;
}
await p.waitForTimeout(1000);

/* Assert we are actually inside the arrival before the shot counts. */
const at = await p.evaluate(() => {
  const r = document.querySelector("[data-wp='6']").getBoundingClientRect();
  return { y: scrollY, secTop: Math.round(r.top), inside: r.top <= 0 };
});
if (!at.inside) throw new Error(`NOT AT ARRIVAL: scrollY=${at.y} sectionTop=${at.secTop}`);

await p.screenshot({ path: path.join(OUT, `${name}.png`) });
console.log(`  ${name.padEnd(18)} ${vhs} vh  scrollY ${at.y}  secTop ${at.secTop}  ${errs.length ? "ERRORS " + errs.slice(0, 2).join(" | ") : "no errors"}`);
await b.close();
