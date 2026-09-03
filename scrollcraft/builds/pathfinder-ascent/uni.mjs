import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","/usr/bin/google-chrome"].find(p=>fs.existsSync(p));
const OUT = path.resolve("scrollcraft/builds/pathfinder-ascent/lab"); fs.mkdirSync(OUT,{recursive:true});
const [name,w,h,dark] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport:{width:+w,height:+h} });
const errs=[]; p.on("pageerror",e=>errs.push(String(e))); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
if (dark==="1") await p.addInitScript(()=>{try{localStorage.setItem("pf-theme","dark")}catch{}});
await p.goto("http://localhost:3000/universities",{waitUntil:"domcontentloaded"});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(1200);
const probe = await p.evaluate(()=>{
  const root=document.querySelector(".pf-landing");
  const hdr=document.querySelector("header");
  return { rootOverflow:getComputedStyle(root).overflow, headerPos:getComputedStyle(hdr).position,
           docH:document.documentElement.scrollHeight, vh:innerHeight };
});
await p.evaluate(()=>scrollTo(0,1400)); await p.waitForTimeout(700);
const after = await p.evaluate(()=>{ const r=document.querySelector("header").getBoundingClientRect();
  return { headerTop:Math.round(r.top), stuck:Math.abs(r.top)<2, scrollY }; });
await p.screenshot({path: path.join(OUT, name+".png")});
console.log(`  ${name}  rootOverflow=${probe.rootOverflow}  header=${probe.headerPos}  afterScroll headerTop=${after.headerTop} stuck=${after.stuck}  ${errs.length?"ERRORS "+errs.slice(0,2).join(" | "):"no errors"}`);
await b.close();
