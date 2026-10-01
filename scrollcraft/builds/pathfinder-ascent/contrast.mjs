/* Contrast of the arrival copy measured on the COMPOSITED page, not the canvas.
   The canvas alone reports nonsense: undrawn regions are transparent black, and
   the real background under this copy is page bg + scrim + terrain stacked. So
   the frame is screenshotted, loaded back into the page as an image, drawn to
   an offscreen canvas and sampled under each line's own box. */
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","/usr/bin/google-chrome"].find(p=>fs.existsSync(p));
const b = await chromium.launch({ executablePath: CHROME, headless: true });
for (const dark of [false, true]) {
  const p = await b.newPage({ viewport:{width:1440,height:900} });
  if (dark) await p.addInitScript(()=>{try{localStorage.setItem("pf-theme","dark")}catch{}});
  await p.goto("http://localhost:3000/?arrival=ab",{waitUntil:"domcontentloaded"});
  await p.waitForSelector("canvas"); await p.evaluate(()=>document.fonts.ready);
  const th = await p.evaluate(()=>document.documentElement.getAttribute("data-theme"));
  console.log(`    [theme attribute: ${th}]`);
  const g = await p.evaluate(()=>({top:document.querySelector("[data-wp='6']").getBoundingClientRect().top+scrollY, vh:innerHeight}));
  let worst = 99, worstAt = 0, worstTxt = "";
  for (let i=0;i<=6;i++){
    const y = Math.round(g.top - g.vh*0.6 + (g.vh*1.4)*i/6);
    await p.evaluate(v=>scrollTo(0,v), y); await p.waitForTimeout(650);
    /* Screenshot with the copy HIDDEN. Sampling inside a text element's own
       box reads its anti-aliased glyphs as if they were background, which for
       mid-tone text lands the extremum on the glyph itself and reports 1.00:1.
       visibility:hidden keeps layout identical, so the boxes still line up. */
    await p.evaluate(()=>{document.querySelectorAll("[data-wp='6'] h2, [data-wp='6'] p, [data-wp='6'] a, [data-wp='6'] span")
      .forEach(e=>e.style.visibility="hidden");});
    const shot = (await p.screenshot()).toString("base64");
    await p.evaluate(()=>{document.querySelectorAll("[data-wp='6'] h2, [data-wp='6'] p, [data-wp='6'] a, [data-wp='6'] span")
      .forEach(e=>e.style.visibility="");});
    const r = await p.evaluate(async (b64)=>{
      const img = new Image(); img.src = "data:image/png;base64,"+b64;
      await img.decode();
      const c = document.createElement("canvas"); c.width=img.width; c.height=img.height;
      const x = c.getContext("2d"); x.drawImage(img,0,0);
      const lum=(r,g,b)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
      const els=[...document.querySelectorAll("[data-wp='6'] h2, [data-wp='6'] p, [data-wp='6'] a")].filter(e=>e.offsetParent);
      let min=99, txt="";
      for(const e of els){
        const R=e.getBoundingClientRect();
        /* Fully inside the viewport AND clear of the fixed 68px header.
           A partly off-screen box had its top clamped to 0, which sampled the
           header strip instead of the ground under the line — the header
           carries near---fg pixels, so the reading came back as 1.00:1 against
           text that was nowhere near it. */
        if(R.top<74||R.bottom>innerHeight||R.width<2||R.height<2) continue;
        const cs=getComputedStyle(e).color.match(/[\d.]+/g).map(Number);
        const fg=lum(cs[0],cs[1],cs[2]);
        const left=Math.round(R.left), top=Math.round(R.top);
        const w=Math.round(R.width), h=Math.round(R.height);
        if(w<1||h<1) continue;
        const d=x.getImageData(left,top,w,h).data;
        /* Lightest background pixel under dark text is the worst case, and
           vice versa: that is the pixel the glyph has least to stand against. */
        /* Worst case is the background pixel CLOSEST in luminance to the
           text, whichever side it falls on — not "the lightest", which is only
           the worst case for dark text. */
        let ext = 0, best = Infinity;
        for(let k=0;k<d.length;k+=4*11){
          const L=lum(d[k],d[k+1],d[k+2]);
          const gap=Math.abs(L-fg);
          if(gap<best){best=gap; ext=L;}
        }
        const ratio=(Math.max(fg,ext)+0.05)/(Math.min(fg,ext)+0.05);
        if(ratio<min){min=ratio; txt=`${(e.textContent||"").trim().slice(0,30)} | fg=${fg.toFixed(3)} bg=${ext.toFixed(3)} rgb=${cs.slice(0,3)}`;}
      }
      return {min, txt};
    }, shot);
    if (r.min<worst){worst=r.min; worstAt=y; worstTxt=r.txt;}
  }
  const verdict = worst>=4.5 ? "PASS" : worst>=3 ? "large-text only" : "FAIL";
  console.log(`  ${dark?"dark ":"light"}  worst ${worst.toFixed(2)}:1  ${verdict}  @${worstAt}  "${worstTxt}"`);
  await p.close();
}
await b.close();
