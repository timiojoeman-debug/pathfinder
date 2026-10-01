import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","/usr/bin/google-chrome"].find(p=>fs.existsSync(p));
const OUT = path.resolve("scrollcraft/builds/pathfinder-ascent/lab/seq"); fs.mkdirSync(OUT,{recursive:true});
const q = process.argv[2] || "?arrival=ab";
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport:{width:970,height:864} });
await p.goto("http://localhost:3000/"+q,{waitUntil:"domcontentloaded"});
await p.waitForSelector("canvas"); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(1200);
const g = await p.evaluate(()=>{const el=document.querySelector("[data-wp='6']");
  return {top: el.getBoundingClientRect().top+scrollY, max: document.documentElement.scrollHeight-innerHeight, vh: innerHeight};});
const from = Math.max(0, g.top - g.vh*0.9), to = g.max;
for (let i=0;i<6;i++){
  const y = Math.round(from + (to-from)*i/5);
  await p.evaluate(v=>scrollTo(0,v), y); await p.waitForTimeout(700);
  const st = await p.evaluate(()=>({ceil: getComputedStyle(document.documentElement).getPropertyValue('--x')||'', y:scrollY}));
  await p.screenshot({path: path.join(OUT, `s${i}.png`)});
  console.log(`  s${i}.png  scrollY ${st.y}`);
}
await b.close();
