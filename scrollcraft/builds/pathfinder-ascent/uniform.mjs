import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","/usr/bin/google-chrome"].find(p=>fs.existsSync(p));
const OUT = path.resolve("scrollcraft/builds/pathfinder-ascent/lab"); fs.mkdirSync(OUT,{recursive:true});
const [name,w,h,dark,submit] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport:{width:+w,height:+h} });
const errs=[]; p.on("pageerror",e=>errs.push(String(e))); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
let apiStatus = null;
p.on("response", r => { if (r.url().includes("/api/pilot-interest")) apiStatus = r.status(); });
if (dark==="1") await p.addInitScript(()=>{try{localStorage.setItem("pf-theme","dark")}catch{}});
await p.goto("http://localhost:3000/universities",{waitUntil:"domcontentloaded"});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(1200);
await p.waitForSelector("form", { state: "visible" });
/* Scroll by absolute offset and settle. scrollIntoView on this page raced the
   paint and produced a blank capture that looked like a render failure. */
const y = await p.evaluate(()=>{ const r=document.querySelector("form").getBoundingClientRect();
  return Math.max(0, Math.round(r.top + scrollY - 90)); });
await p.evaluate(v=>scrollTo(0,v), y);
await p.waitForTimeout(1200);
if (submit==="1") {
  await p.fill('input[name="institution"]', "University of Edinburgh");
  await p.fill('input[name="contactName"]', "Test Careers Manager");
  await p.fill('input[name="email"]', "careers@example.ac.uk");
  await p.fill('input[name="cohortSize"]', "~400 finalists");
  await p.waitForTimeout(300);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(2500);
}
const state = await p.evaluate(()=>{
  const alert=document.querySelector('[role="alert"]')?.textContent?.trim();
  const status=document.querySelector('[role="status"]')?.textContent?.trim();
  return { alert: alert||null, status: status?status.slice(0,80):null, hasForm: !!document.querySelector("form") };
});
await p.screenshot({path: path.join(OUT, name+".png")});
console.log(`  ${name}  api=${apiStatus ?? "-"}  alert=${state.alert ? JSON.stringify(state.alert.slice(0,70)) : "none"}  success=${state.status?JSON.stringify(state.status):"none"}  ${errs.length?"PAGE ERRORS "+errs.slice(0,2).join(" | "):"no page errors"}`);
await b.close();
