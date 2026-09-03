#!/usr/bin/env node
/**
 * Verification harness for the PathFinder arrival.
 *
 * The skill's own shoot.mjs cannot be used here: it gates on `html.sc-ready`,
 * which is the scrollcraft engine's signal, and this page is not built on that
 * engine — it has its own canvas renderer and its own GSAP camera. Everything
 * else about the method is kept: walk the page at real scroll positions, wait
 * for each to settle, screenshot contiguously, and report what the page thinks
 * is on screen rather than trusting that it looks fine.
 *
 *   node scrollcraft/builds/pathfinder-ascent/shoot-arrival.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");

const URL_ = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:3000";
const OUT = path.resolve("scrollcraft/builds/pathfinder-ascent/lab");
const CHROME = [
  process.env.SCROLLCRAFT_CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p));
if (!CHROME) { console.error("No installed Chrome found."); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(URL_, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 20000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

const geom = await page.evaluate(() => {
  const w = [...document.querySelectorAll("[data-wp]")]
    .sort((a, b) => +a.dataset.wp - +b.dataset.wp)
    .map((e) => ({ wp: e.dataset.wp, top: Math.round(e.getBoundingClientRect().top + scrollY) }));
  const H = document.documentElement.scrollHeight;
  return {
    vh: innerHeight, H, vhs: +(H / innerHeight).toFixed(2), maxScroll: H - innerHeight,
    stations: w,
    legs: w.slice(1).map((x, i) => ({ leg: `${i}->${i + 1}`, px: x.top - w[i].top })),
    arrivalTop: w[w.length - 1].top,
    arrivalReachable: w[w.length - 1].top <= H - innerHeight,
  };
});
console.log("\ngeometry");
console.log(`  page            ${geom.vhs} viewport-heights (${geom.H}px / ${geom.vh}px)`);
console.log(`  arrival top     ${geom.arrivalTop}   max scroll ${geom.maxScroll}`);
console.log(`  ARRIVES?        ${geom.arrivalReachable ? "yes" : "NO — camera cannot reach the last station"}`);
console.log(`  legs            ${geom.legs.map((l) => `${l.leg}:${l.px}`).join("  ")}`);

/* The arrival's reveal span, which the brief requires to be the largest single
   span on the page. It runs from the section entering at 70% of the viewport
   to its bottom reaching the bottom of the viewport. */
const revealFrom = Math.max(0, geom.arrivalTop - geom.vh * 0.7);
const revealTo = Math.min(geom.maxScroll, geom.arrivalTop + geom.vh * 1.8 - geom.vh);
console.log(`  reveal span     ${Math.round(revealTo - revealFrom)}px  (largest leg ${Math.max(...geom.legs.map((l) => l.px))}px)`);

const STEPS = 8;
const shots = [];
for (let i = 0; i < STEPS; i++) {
  const y = Math.round(revealFrom + ((revealTo - revealFrom) * i) / (STEPS - 1));
  await page.evaluate((v) => scrollTo(0, v), y);
  await page.waitForTimeout(650);
  const state = await page.evaluate(() => {
    const el = document.querySelector("[data-wp='6']");
    const r = el.getBoundingClientRect();
    return { y: scrollY, secTop: Math.round(r.top) };
  });
  const f = path.join(OUT, `${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: f });
  shots.push({ ...state, file: path.basename(f) });
}
console.log("\nframes");
shots.forEach((s) => console.log(`  ${s.file}  scrollY ${s.y}  section top ${s.secTop}`));

/* Real rAF in a real browser: this is the measurement the in-app pane could
   not make, because rAF does not fire in a hidden tab. */
const fps = await page.evaluate(async () => {
  let f = 0;
  const t0 = performance.now();
  await new Promise((res) => {
    const c = () => { f++; if (performance.now() - t0 < 1500) requestAnimationFrame(c); else res(); };
    requestAnimationFrame(c);
  });
  return Math.round(f / 1.5);
});
console.log(`\nframe rate at the arrival, parked: ${fps} fps`);

console.log(errors.length ? `\nCONSOLE ERRORS (${errors.length}):\n  ${errors.slice(0, 10).join("\n  ")}` : "\nno console errors");
await browser.close();
console.log(`\nshots in ${OUT}\n`);
