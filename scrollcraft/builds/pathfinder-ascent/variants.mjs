#!/usr/bin/env node
/* Dark, mobile portrait, and reduced motion at the arrival. Each is a state
 * the desktop-light pass cannot speak for: the theme swaps every token the map
 * is drawn with, the phone changes the aspect the plan view has to fit, and
 * reduced motion takes away the rAF loop the reveal is drawn from. */
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"].find((p) => fs.existsSync(p));
const OUT = path.resolve("scrollcraft/builds/pathfinder-ascent/lab");
fs.mkdirSync(OUT, { recursive: true });
const URL_ = "http://localhost:3000";

const b = await chromium.launch({ executablePath: CHROME, headless: true });

const shoot = async (name, { w = 1440, h = 900, dark = false, reduced = false, q = "" }) => {
  const p = await b.newPage({
    viewport: { width: w, height: h },
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  /* Seed the store BEFORE the app boots. Setting <html data-theme> after load
     does nothing lasting: ThemeController owns that attribute and rewrites it
     from localStorage, so the first attempt at a dark shot silently rendered
     light and would have passed as a dark-theme check. */
  if (dark) {
    await p.addInitScript(() => { try { localStorage.setItem("pf-theme", "dark"); } catch {} });
  }
  await p.goto(URL_ + q, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("canvas");
  const theme = await p.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (dark && theme !== "dark") throw new Error(`asked for dark, page is '${theme}'`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  const geo = await p.evaluate(() => {
    const el = document.querySelector("[data-wp='6']");
    const top = el.getBoundingClientRect().top + scrollY;
    const H = document.documentElement.scrollHeight;
    return { top, max: H - innerHeight, vhs: +(H / innerHeight).toFixed(2), reachable: top <= H - innerHeight };
  });
  await p.evaluate((y) => scrollTo(0, y), geo.max);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ${name.padEnd(10)} ${geo.vhs} vh   arrives:${geo.reachable ? "yes" : "NO"}   ${errs.length ? "ERRORS: " + errs.slice(0, 3).join(" | ") : "no errors"}`);
  await p.close();
};

console.log("\nvariants");
await shoot("final-light", {});
await shoot("final-dark", { dark: true });
await shoot("final-mobile", { w: 390, h: 844 });
await shoot("final-mobile-dark", { w: 390, h: 844, dark: true });
await shoot("final-reduced", { reduced: true });
await b.close();
console.log("");
