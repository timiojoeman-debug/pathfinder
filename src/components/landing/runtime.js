/* The landing's runtime, ported from cinematic/site/index.html: the scroll-scrubbed walk,
   the ASCII summit outline, the click-driven 3D route, the readiness gauge and the entrances.
   initLanding(root) enhances the static markup in ./markup.ts and returns a dispose function
   that removes every listener, observer and frame loop and restores the markup, so a client-side
   navigation away and back (or React's dev double-mount) starts from a clean page. */
import { create as createRoute } from './route.js';

export function initLanding(root) {
  const pristine = root.innerHTML;
  const ac = new AbortController(), signal = ac.signal;
  const observers = [];
  const watch = o => { observers.push(o); return o; };
  let blobUrl = null;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  // the canvases' colours come from the theme tokens (paper or night), re-read when the theme changes
  let INK = '#382c20', ACCENT = '#b0673c', PAPER = '#ebe2d1';
  const readTheme = () => { const cs = getComputedStyle($('#main')), v = (n, d) => cs.getPropertyValue(n).trim() || d;
    INK = v('--ink', INK); ACCENT = v('--accent', ACCENT); PAPER = v('--canvas', PAPER); };
  readTheme();
  const MONO = getComputedStyle(root).getPropertyValue('--mono') || 'ui-monospace, monospace';
  /* ---------- the nav gets a paper bar once the page moves, so headings pass under it cleanly ---------- */
  {
    const nav = $('.nav');
    let solid = null;
    const top = $('#top');   // the hero keeps its clear gradient; the bar appears once content scrolls under the nav
    const setNav = () => { const on = top.getBoundingClientRect().bottom < 72; if (on !== solid) { nav.classList.toggle('solid', on); solid = on; } };
    addEventListener('scroll', setNav, { passive: true, signal }); setNav();
  }

  /* ---------- environment contours ---------- */
  {
    const svg = $('#contours'), r = rng(7), NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 22; i++) {
      const y0 = 40 + i * 44, a1 = 10 + r() * 26, f1 = .002 + r() * .003, ph = r() * 6.28;
      let d = '';
      for (let x = -40; x <= 1640; x += 40) d += (x === -40 ? 'M' : 'L') + x + ' ' + (y0 + Math.sin(x * f1 + ph) * a1 + Math.sin(x * f1 * 2.7 + ph * 1.3) * a1 * .35).toFixed(1);
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', i % 5 === 0 ? '1.6' : '.8');
      svg.appendChild(p);
    }
  }

  /* ---------- split words (seeded thresholds) ---------- */
  $$('.band .split').forEach((el, n) => {
    const text = el.textContent.trim(), words = text.split(/\s+/), r = rng(31 + n);
    el.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text; el.appendChild(sr);
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    words.forEach((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      s.style.setProperty('--th', ((i / words.length) * .45 + r() * .06).toFixed(3));
      if (el.classList.contains('zig')) s.style.setProperty('--jx', (i % 2 ? -1 : 1) * (22 + r() * 14) + 'px');
      vis.appendChild(s); if (i < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.appendChild(vis);
  });

  /* ================= the ASCII outline renderer =================
     At the summit the footage turns into ink: ridgelines trace themselves as
     / \ | - strokes, the photo fades to paper, and a faint outline stays
     behind the headline. One grid of monospace cells, sampled from the walk's
     last frame so the outline sits exactly on the photo it replaces. */
  const RAMP = [' ', '·', ':', ';', '-', '=', '+', '*', '#'];
  const G_HATCH = RAMP.length, G_SL = G_HATCH + 1, G_PIPE = G_HATCH + 2, G_DASH = 4;
  const GLYPHS = RAMP.concat(['\\', '/', '|']);
  /* edge glyph by angle: the trick the original PathFinder globe used for its wires */
  const slashOf = (dx, dy) => { const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 180;
    return deg < 22.5 || deg >= 157.5 ? G_DASH : deg < 67.5 ? G_HATCH : deg < 112.5 ? G_PIPE : G_SL; };

  function makeAscii(canvas, maskFn) {
    const ctx = canvas.getContext('2d');
    const st = { W: 0, H: 0, dpr: 1, cw: 8, ch: 11, cols: 0, rows: 0, atlas: null, accentAtlas: null, ord: null, font: '', sample: null, sctx: null };
    function atlasFor(color) {
      const c = document.createElement('canvas'), x = c.getContext('2d'), aw = Math.ceil(st.cw * st.dpr);
      c.width = aw * GLYPHS.length; c.height = Math.ceil(st.ch * st.dpr);
      x.scale(st.dpr, st.dpr); x.font = st.font; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
      GLYPHS.forEach((g, i) => x.fillText(g, (i + .5) * aw / st.dpr, st.ch / 2 + .5));
      return c;
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      st.W = Math.max(1, r.width); st.H = Math.max(1, r.height);
      st.dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(st.W * st.dpr); canvas.height = Math.round(st.H * st.dpr);
      const fs = st.W < 700 ? 11 : 10;
      st.font = `700 ${fs}px ${MONO}`;
      ctx.font = st.font;
      st.cw = Math.max(6, Math.round(ctx.measureText('M').width * 1.08));
      st.ch = Math.round(fs * 1.18);
      st.cols = Math.ceil(st.W / st.cw); st.rows = Math.ceil(st.H / st.ch);
      // reveal order: outward from the summit (right third, upper frame), with a little seeded grain
      st.ord = new Float32Array(st.cols * st.rows);
      st.mask = new Float32Array(st.cols * st.rows);
      const px = st.W * .66, py = st.H * .3, far = Math.hypot(Math.max(px, st.W - px), Math.max(py, st.H - py));
      for (let j = 0; j < st.rows; j++) for (let i = 0; i < st.cols; i++)
        { const k = j * st.cols + i; st.ord[k] = clamp(Math.hypot((i + .5) * st.cw - px, (j + .5) * st.ch - py) / far * .88 + hash(i, j) * .12, 0, 1);
          st.mask[k] = maskFn ? maskFn((i + .5) * st.cw / st.W, (j + .5) * st.ch / st.H) : 1; }
      st.atlas = atlasFor(INK); st.accentAtlas = atlasFor(ACCENT);
    }
    /* a frame into glyphs: auto-levels, dark rock as dense ink, ridgelines as strokes, sun glints copper */
    function sample(src, sw, sh, posX) {
      const { W, H, cols, rows } = st;
      if (!cols) return null;
      if (!st.sample) { st.sample = document.createElement('canvas'); st.sctx = st.sample.getContext('2d', { willReadFrequently: true }); }
      st.sample.width = cols; st.sample.height = rows;
      const s = Math.max(W / sw, H / sh), cropW = W / s, cropH = H / s;
      st.sctx.drawImage(src, (sw - cropW) * posX, (sh - cropH) * .5, cropW, cropH, 0, 0, cols, rows);
      const d = st.sctx.getImageData(0, 0, cols, rows).data, n = cols * rows;
      const out = { gl: new Uint8Array(n), a: new Float32Array(n), acc: new Uint8Array(n), edge: new Uint8Array(n) };
      const L = new Float32Array(n), warm = new Uint8Array(n);
      for (let k = 0, p = 0; k < n; k++, p += 4) {
        const r = d[p] / 255, gg = d[p + 1] / 255, b = d[p + 2] / 255;
        L[k] = .2126 * r + .7152 * gg + .0722 * b;
        warm[k] = (r - b > .28 && L[k] > .5) ? 1 : 0;
      }
      const pick = []; for (let k = 0; k < n; k += 7) pick.push(L[k]); pick.sort((x, y) => x - y);
      const lo = pick[(pick.length * .04) | 0], hi = pick[(pick.length * .97) | 0], span = Math.max(.08, hi - lo);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i, dk = Math.pow(1 - clamp((L[k] - lo) / span, 0, 1), 1.25);
        let gl = Math.max(1, Math.round(dk * (RAMP.length - 1))), a = .3 + dk * .7;
        if (i > 0 && j > 0 && i < cols - 1 && j < rows - 1) {
          const at = (x, y) => L[(j + y) * cols + i + x];
          const gx = (at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1)) / span;
          const gy = (at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1)) / span;
          const mag = Math.hypot(gx, gy);
          if (mag > .7) { gl = slashOf(-gy, gx); a = Math.min(1, .55 + mag * .2); out.edge[k] = 1; }
        }
        out.gl[k] = gl; out.a[k] = a; out.acc[k] = warm[k];
      }
      return out;
    }
    /* reveal: 0..1 how far the outline has traced out from the summit; edgeMul and
       fillMul scale the strokes and the tonal fill; paper paints the page behind */
    function drawOutline(F, reveal, edgeMul, fillMul, paper) {
      const { cols, rows, cw, ch, dpr, ord, mask, atlas, accentAtlas } = st;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      if (paper) { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!F) return;
      const aw = Math.ceil(cw * dpr), ah = Math.ceil(ch * dpr);
      for (let j = 0; j < rows; j++) {
        const y = Math.round(j * ch * dpr);
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          if (ord[k] > reveal) continue;
          const a = F.a[k] * (F.edge[k] ? edgeMul : fillMul) * mask[k];
          if (a < .02) continue;
          ctx.globalAlpha = a > 1 ? 1 : a;
          ctx.drawImage(F.acc[k] ? accentAtlas : atlas, F.gl[k] * aw, 0, aw, ah, Math.round(i * cw * dpr), y, aw, ah);
        }
      }
      ctx.globalAlpha = 1;
    }
    return { st, resize, sample, drawOutline };
  }

  /* ================= the walk timeline =================
     Continuous footage to WALK_END, the ASCII outline to OUT_END, then the headline. */
  const WALK_END = .72, OUT_END = .86;
  const BANDS = [[0, .18], [.22, .38], [.42, .58], [.84, 1]];   // captions sit on clips 1-3 (10s each); the 6s summit arrival is wordless
  const PLACE_ENDS = [.2, .4, .6];   // clip boundaries (10s, 10s, 10s, 6s) as scroll progress
  const placeAt = p => PLACE_ENDS.filter(e => p >= e).length;

  /* ================= the desktop hero ================= */
  const hero = $('#hero'), stage = $('#stage'), video = $('#heroVideo'), photo = $('#photo'), posterLayer = $('.poster', stage);
  const ringArc = $('#ringArc'), hud = $('.hud'), outlineCv = $('#outlineCv');
  const VIDEO_URL = '/landing/hero-walk.mp4';
  const VIDEO_BYTES = 12162860;   // DEPLOY STEP: keep in sync with hero-walk.mp4
  // the headline column stays clean paper; the outline lives on the peak side
  const asc = makeAscii(outlineCv, (u) => .12 + .88 * smoothstep(u, .3, .52));
  const bands = $$('.band', stage).map((el, i, all) => ({
    el, a: BANDS[i][0], b: BANDS[i][1], ramp: +el.dataset.ramp || 0,
    first: i === 0, last: i === all.length - 1, op: -1, k: -1, live: null
  }));
  const heroProgress = () => {
    const range = hero.offsetHeight - innerHeight;
    return range > 0 ? clamp(-hero.getBoundingClientRect().top / range, 0, 1) : 0;
  };
  const videoTime = p => clamp(p / WALK_END, 0, 1) * Math.max(0, (video.duration || 0) - .06);

  let loadK = 0, loadStart = 0, failed = false, scrubOn = false;
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  let endImg = null, endField = null;
  const sampleEnd = () => { if (endImg) endField = asc.sample(endImg, endImg.naturalWidth, endImg.naturalHeight, .62); };

  let outKey = '', photoShown = -1;
  function drawOutlinePhase(p) {
    const o = clamp((p - WALK_END) / (OUT_END - WALK_END), 0, 1);
    const photoOp = 1 - smoothstep(o, .38, .74);
    if (Math.abs(photoOp - photoShown) > .004 || (photoOp === 1 && photoShown !== 1) || (photoOp === 0 && photoShown !== 0)) { photo.style.opacity = photoOp.toFixed(3); photoShown = photoOp; }
    const reveal = RM.matches ? 1.01 : smoothstep(o, 0, .45) * 1.01;
    const edgeMul = 1 - .42 * smoothstep(o, .75, 1);
    const fillMul = smoothstep(o, .3, .62) * (1 - .82 * smoothstep(o, .7, 1));
    const key = o === 0 ? 'off' : reveal.toFixed(3) + edgeMul.toFixed(3) + fillMul.toFixed(3) + (endField ? 1 : 0);
    if (key === outKey) return;
    outKey = key;
    asc.drawOutline(o === 0 ? null : endField, reveal, edgeMul, fillMul, false);
  }

  let placeShown = -1;
  function setPlace(p) {
    const i = placeAt(p);
    if (i === placeShown) return;
    placeShown = i;
    if (failed || !stage.classList.contains('video-ready')) posterLayer.style.backgroundImage = `url('/landing/place-${i + 1}.jpg')`;
  }

  function updateCaptions(p) {
    for (const b of bands) {
      const f = Math.min(0.03, (b.b - b.a) / 3);
      const op = (b.first ? 1 : smoothstep(p, b.a, b.a + f)) * (b.last ? 1 : 1 - smoothstep(p, b.b - f, b.b));
      let k = clamp((p - b.a) / (b.ramp || Math.min(0.025, (b.b - b.a) * .35)), 0, 1);
      if (b.first) k = Math.max(k, loadK);
      if (Math.abs(op - b.op) > 0.004 || (op === 0 && b.op !== 0) || (op === 1 && b.op !== 1)) { b.el.style.opacity = op.toFixed(3); b.op = op; }
      if (Math.abs(k - b.k) > 0.008 || (k === 1 && b.k !== 1) || (k === 0 && b.k !== 0)) { b.el.style.setProperty('--k', k.toFixed(3)); b.k = k; }
      const live = op > .6;
      if (live !== b.live) { b.el.classList.toggle('live', live); b.live = live; $$('a', b.el).forEach(a => a.tabIndex = live ? 0 : -1); }
    }
  }

  // gated seeks
  let seekBusy = false, pendingTime = null, lastSeekT = -1;
  function requestSeek(t) {
    if (!video.duration || failed) return;
    t = clamp(t, 0, video.duration - .05);
    if (seekBusy) { pendingTime = t; return; }
    if (Math.abs(t - lastSeekT) < .015) return;
    seekBusy = true; lastSeekT = t; video.currentTime = t;
  }
  video.addEventListener('seeked', () => {
    seekBusy = false;
    if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', () => { seekBusy = false; pendingTime = null; failVideo(); });

  // lerp loop that rests
  let target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now)); lastTick = now;
    shown += (target - shown) * (1 - Math.pow(1 - .16, dt / 16.667));
    if (loadK < 1) loadK = clamp((now - loadStart) / 1400, 0, 1);
    if (Math.abs(target - shown) < 0.0005 && loadK >= 1) { shown = target; rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
    requestSeek(videoTime(shown));
    setPlace(shown);
    drawOutlinePhase(shown);
    updateCaptions(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen && scrubOn) rafId = requestAnimationFrame(tick);
  }
  watch(new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; if (heroOnScreen) onScroll(); })).observe(hero);

  // poster first, then the summit frame for the outline, then the streamed blob
  let heroInit = false;
  function initHeroOnce() {
    if (heroInit) return; heroInit = true;
    loadStart = performance.now();
    posterLayer.style.backgroundImage = "url('/landing/hero-poster.jpg')";
    let started = false;
    const startBlobFetch = () => { if (started || signal.aborted) return; started = true; loadHeroBlob().catch(failVideo); };
    loadImg('/landing/hero-poster.jpg').catch(() => {}).finally(startBlobFetch);
    setTimeout(startBlobFetch, 4000);
    loadImg('/landing/hero-end.jpg').then(img => { endImg = img; sampleEnd(); outKey = ''; drawOutlinePhase(shown); }).catch(() => {});
  }
  async function loadHeroBlob() {
    const ctrl = new AbortController();
    signal.addEventListener('abort', () => ctrl.abort());
    let watchdog = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal });
    if (!res.ok) throw new Error('video ' + res.status);
    const total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
    const reader = res.body.getReader(), chunks = [];
    let got = 0, lastRing = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(watchdog); watchdog = setTimeout(() => ctrl.abort(), 20000);
      chunks.push(value); got += value.length;
      const frac = Math.min(1, got / total), now = performance.now();
      if (now - lastRing > 100 || frac === 1) { lastRing = now; ringArc.style.setProperty('--ld', Math.round(126 * (1 - frac))); }
    }
    clearTimeout(watchdog);
    ringArc.style.setProperty('--ld', 0);
    video.src = blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    video.load();
    video.addEventListener('canplay', () => {
      lastSeekT = -1; requestSeek(videoTime(heroProgress()));
      stage.classList.add('video-ready');
      const ring = $('.ring', hud); if (ring) ring.remove();
    }, { once: true });
  }
  function failVideo() {
    if (failed) return; failed = true;
    const ring = $('.ring', hud); if (ring) ring.remove();
    video.style.display = 'none';
    stage.classList.add('video-failed');
    placeShown = -1; setPlace(shown);   // the still of each place carries the walk
  }

  /* ================= the phone walk ================= */
  const pw = $('#phoneWalk'), pImgs = $$('#pstage img'), pCaps = $$('#pstage .pcap'), pOut = $('#pOutlineCv');
  const pAsc = makeAscii(pOut);
  let phoneOn = false, phoneRaf = null, pPlace = -1, pOutOn = null, pImg4 = null;
  const phoneProgress = () => {
    const range = pw.offsetHeight - innerHeight;
    return range > 0 ? clamp(-pw.getBoundingClientRect().top / range, 0, 1) : 0;
  };
  function drawPhoneOutline() {
    if (!pImg4) return;
    pAsc.resize();
    pAsc.drawOutline(pAsc.sample(pImg4, pImg4.naturalWidth, pImg4.naturalHeight, .6), 1.01, .75, .16, true);
  }
  function phoneUpdate() {
    phoneRaf = null;
    if (RM.matches) return;   // reduced motion: the stills, the outline and the captions are simply stacked
    const p = phoneProgress(), out = p >= .72;
    const i = Math.min(3, Math.floor(clamp(p / .72, 0, .999) * 4));
    if (i !== pPlace) { pImgs.forEach((im, n) => im.classList.toggle('on', n === i)); pPlace = i; }
    if (out !== pOutOn) { pOut.classList.toggle('on', out); pOutOn = out; }
    pCaps.forEach((c, n) => c.classList.toggle('on', n < 3 ? (!out && n === i) : p >= .78));
  }
  const onPhoneScroll = () => { if (!phoneRaf) phoneRaf = requestAnimationFrame(phoneUpdate); };
  function enablePhone() {
    if (phoneOn) return; phoneOn = true;
    pImgs.forEach(img => { if (!img.src) img.src = img.dataset.src; });
    loadImg('/landing/hero-end.jpg').then(img => { pImg4 = img; drawPhoneOutline(); }).catch(() => {});
    addEventListener('scroll', onPhoneScroll, { passive: true, signal });
    pPlace = -1; pOutOn = null; onPhoneScroll();
  }
  function disablePhone() { if (!phoneOn) return; phoneOn = false; removeEventListener('scroll', onPhoneScroll); if (phoneRaf) { cancelAnimationFrame(phoneRaf); phoneRaf = null; } }

  // the five static-hero gates, decided live
  const GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  function enableScrub() {
    if (scrubOn) return; scrubOn = true;
    asc.resize(); sampleEnd();
    initHeroOnce();
    addEventListener('scroll', onScroll, { passive: true, signal });
    bands.forEach(b => { b.op = -1; b.k = -1; b.live = null; });
    placeShown = -1; photoShown = -1; outKey = '';
    unpinFinalStates();
    target = shown = heroProgress();
    rafId = null; onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return; scrubOn = false;
    removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function applyHeroMode() {
    if (GATES.some(q => matchMedia(q).matches)) { disableScrub(); enablePhone(); }
    else { disablePhone(); enableScrub(); }
  }
  const MQLS = GATES.map(q => matchMedia(q));
  MQLS.forEach(m => m.addEventListener('change', applyHeroMode, { signal }));

  /* ================= the route: 3D terrain, one step per click ================= */
  const STOPS = [
    null,
    { n: '01', name: 'Direction', line: 'Name a direction worth chasing.', acts: ['Explore roles that fit your strengths', 'Compare job-title variants', 'Set your target'], href: '/direction' },
    { n: '02', name: 'CV', line: 'Every line checked against the job you want.', acts: ['Paste or upload your CV', 'Match it to a job description', 'Check your LinkedIn so recruiters can find you'], href: '/cv' },
    { n: '03', name: 'Opportunities', line: 'Real listings, matched to your level.', acts: ['Add each scheme’s opening and deadline', 'Get a plan that works back from them', 'Search live internship lists'], href: '/jobs' },
    { n: '04', name: 'Networking', steep: true, line: 'Peers can refer you. Recruiters need to see fit.', acts: ['Tell PathFinder who they are', 'Prep the coffee chat', 'Follow up, then ask the right person'], href: '/networking' },
    { n: '05', name: 'Interview', steep: true, line: 'Stories, drills and mock rounds, built over weeks.', acts: ['Blind 75 by pattern', 'Build STAR stories once', 'Company briefings and practice questions'], href: '/interview' },
    { n: '06', name: 'Tracking', line: 'Every application on one calm board.', acts: ['Move each application through five stages', 'Rejection timing tells you where it breaks'], href: '/tracker' },
  ];
  const APP = '';
  const routeSec = $('#route'), rpanel = $('#rpanel'), rnext = $('#rnext'), wpsEl = $('#wps');
  const introHTML = rpanel.innerHTML;
  STOPS.forEach((s, i) => {
    if (!s) return;
    const li = document.createElement('li');
    li.innerHTML = `<button class="wpb" type="button" data-i="${i}"><i aria-hidden="true"></i><span>${s.n} ${s.name}</span></button>`;
    wpsEl.appendChild(li);
  });
  const wpBtns = $$('.wpb', wpsEl);
  let route = null, routeAt = 0;
  function renderStop(i) {
    routeAt = i;
    const s = STOPS[i];
    rpanel.innerHTML = !s ? introHTML :
      `<span class="eyebrow mono">Stage ${s.n} of 06${s.steep ? ' · steep' : ''}</span>` +
      `<h2>${s.name}</h2>` +
      `<p class="line">${s.line}</p>` +
      `<ul>${s.acts.map(a => `<li>${a}</li>`).join('')}</ul>` +
      `<a class="go" href="${APP}${s.href}">Open ${s.name} →</a>`;
    wpBtns.forEach((b, n) => { const k = n + 1; b.classList.toggle('done', k < i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    rnext.textContent = i === 0 ? 'Take the first step' : i < STOPS.length - 1 ? 'Take the next step' : 'Back to the start';
    rpanel.classList.remove('leaving');
    dashIn();
  }

  /* the stop text dashes into place: the heading's letters start scattered round the panel,
     run in on short curved paths, overshoot a touch and settle; the rest follows a beat later.
     Leaving, they scatter out again before the camera moves. Reduced motion: no movement. */
  function splitLetters(h) {
    const text = h.textContent;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    const walk = (node, into) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          for (const ch of n.textContent) {
            if (ch === ' ') { into.appendChild(document.createTextNode(' ')); continue; }
            const l = document.createElement('span'); l.className = 'l'; l.textContent = ch; into.appendChild(l);
          }
        } else if (n.nodeType === 1) { const c = n.cloneNode(false); walk(n, c); into.appendChild(c); }
      }
    };
    walk(h, vis);
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
    h.replaceChildren(sr, vis);
    return $$('.l', vis);
  }
  let dashSeed = 1;
  /* a keyframe path: rest (0,0) to an offset (dx,dy) along a curve that bends to one side, spinning
     and shrinking toward the far end. inward runs it backwards, from the far end to rest. */
  function pathFrames(dx, dy, bend, spin, inward) {
    const cx = dx / 2 - dy * bend, cy = dy / 2 + dx * bend, frames = [];
    for (let k = 0; k <= 8; k++) {
      const u = inward ? 1 - k / 8 : k / 8;
      const x = 2 * u * (1 - u) * cx + u * u * dx, y = 2 * u * (1 - u) * cy + u * u * dy;
      frames.push({ offset: k / 8, transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(spin * u).toFixed(1)}deg) scale(${(1 - .78 * u).toFixed(3)})`, opacity: u > .82 ? +((1 - u) / .18).toFixed(3) : 1 });
    }
    return frames;
  }
  /* the offset from an element's centre to a point on the route canvas, or a random throw if the point is off screen */
  function towards(el, pt, r) {
    if (pt) { const box = routeSec.getBoundingClientRect(), b = el.getBoundingClientRect();
      return [pt.x - (b.left + b.width / 2 - box.left), pt.y - (b.top + b.height / 2 - box.top)]; }
    const ang = r() * Math.PI * 2, d = 160 + r() * 200;
    return [Math.cos(ang) * d, Math.sin(ang) * d * .6];
  }
  /* arriving: the stage's text bursts out of its diamond on the mountain and arcs into place,
     every letter on its own path; the lines follow a beat later. Reduced motion: no movement. */
  function dashIn() {
    if (RM.matches || !rpanel.animate) return;
    const from = route && route.markerAt ? route.markerAt(routeAt) || route.markerAt(routeAt + 1) : null;
    const h = $('h2', rpanel), rest = [...rpanel.children].filter(c => c !== h);
    const letters = h ? splitLetters(h) : [];
    const r = rng(dashSeed++ * 97);
    letters.forEach((l, i) => { const [dx, dy] = towards(l, from, r);
      l.animate(pathFrames(dx, dy, (r() - .5) * 1.2, (r() - .5) * 180, true),
        { duration: 860 + r() * 320, delay: i * 26, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }); });
    rest.forEach((el, i) => { const [dx, dy] = towards(el, from, r);
      el.animate(pathFrames(dx, dy, (r() - .5) * .9, (r() - .5) * 30, true),
        { duration: 820, delay: 220 + letters.length * 16 + i * 85, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }); });
  }
  /* leaving: everything darts off along curves into the next stage's diamond as the camera sets off for it */
  function dashOut(done, toI) {
    const h = $('h2', rpanel), letters = $$('h2 .l', rpanel), rest = [...rpanel.children].filter(c => c !== h);
    if (RM.matches || !rpanel.animate || !letters.length) { done(); return; }
    const to = route && route.markerAt ? route.markerAt(toI) : null;
    const r = rng(dashSeed * 131);
    let last;
    [...rest, ...letters].forEach((el, i) => { const [dx, dy] = towards(el, to, r);
      last = el.animate(pathFrames(dx, dy, (r() - .5) * 1.1, (r() - .5) * 160, false),
        { duration: 440 + r() * 160, delay: i * 14, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' }); });
    last.onfinish = done;
  }
  let stepping = false;
  function stepTo(i) {
    if (!route || stepping) return;
    stepping = true;
    dashOut(() => { stepping = false; }, i);   // the text and the camera leave together
    route.goTo(i);
  }
  rnext.addEventListener('click', () => stepTo(routeAt < STOPS.length - 1 ? routeAt + 1 : 0));
  wpBtns.forEach(b => b.addEventListener('click', () => stepTo(+b.dataset.i)));
  routeSec.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); stepTo(Math.min(routeAt + 1, STOPS.length - 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepTo(Math.max(routeAt - 1, 0)); }
  });
  function initRoute() {
    if (route) return;
    route = createRoute($('#routeCv'), routeSec, { panel: rpanel, onArrive: renderStop });
    watch(new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) route.start(); else route.stop(); })).observe(routeSec);
    document.addEventListener('visibilitychange', () => { if (document.hidden) route.stop(); else if (routeSec.getBoundingClientRect().bottom > 0 && routeSec.getBoundingClientRect().top < innerHeight) route.start(); }, { signal });
  }
  initRoute();

  let rsT = 0;
  const refit = () => {
    if (scrubOn) { asc.resize(); sampleEnd(); outKey = ''; drawOutlinePhase(shown); }
    if (phoneOn) drawPhoneOutline();
    if (route) route.resize();
  };
  addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(refit, 150); }, { signal });
  if (document.fonts) document.fonts.ready.then(() => { if (!signal.aborted) refit(); });

  /* paper or night: the canvases repaint in the new ink when <html data-theme> or the OS scheme changes */
  const retheme = () => { readTheme(); refit(); };
  const themeMO = watch(new MutationObserver(retheme));
  themeMO.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme, { signal });

  /* ---------- score gauge ---------- */
  {
    const g = $('#ticks'), NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2, r1 = 90, r2 = i % 8 === 0 ? 98 : 94, l = document.createElementNS(NS, 'line');
      l.setAttribute('class', 'tick');
      l.setAttribute('x1', 100 + Math.cos(a) * r1); l.setAttribute('y1', 100 + Math.sin(a) * r1);
      l.setAttribute('x2', 100 + Math.cos(a) * r2); l.setAttribute('y2', 100 + Math.sin(a) * r2);
      g.appendChild(l);
    }
  }
  /* the example readiness score builds as the page is read: each stage's evidence fills in
     route order, and the score is their weighted sum (networking and interview weigh most) */
  const arc = $('#arc'), gNum = $('#gNum');
  const stageBars = $$('.weights .bar i').map(el => ({ el, t: +el.dataset.t, w: +el.dataset.w, a: +el.dataset.a, b: +el.dataset.b, shown: -1 }));
  {
    // every visit, each stage gets its own pace: all start visibly filled, all keep rising, none in lockstep
    stageBars.forEach(b => {
      b.base = .12 + Math.random() * .16;
      b.t = .72 + Math.random() * .26;
      b.a = Math.random() * .3;
      b.b = Math.min(.98, b.a + .35 + Math.random() * .4);
    });
  }
  let arcShown = -1, numShown = -1;
  function drawArc() {
    // from the moment the section scrolls into view to the bottom of the page
    const max = document.documentElement.scrollHeight - innerHeight;
    const start = $('#score').getBoundingClientRect().top + scrollY - innerHeight;
    const q = RM.matches ? 1 : clamp((scrollY - start) / Math.max(1, max - start), 0, 1);
    let score = 0;
    for (const b of stageBars) {
      const f = b.base + (b.t - b.base) * smoothstep(q, b.a, b.b);
      score += b.w * f;
      if (Math.abs(f - b.shown) > .004 || (f === 0 && b.shown !== 0)) { b.el.style.transform = `scaleX(${f.toFixed(3)})`; b.shown = f; }
    }
    if (Math.abs(score - arcShown) > .002) { arcShown = score; arc.style.strokeDashoffset = (503 * (1 - score)).toFixed(1); }
    const n = Math.round(score * 100);
    if (n !== numShown) { numShown = n; gNum.textContent = n; }
  }
  addEventListener('scroll', drawArc, { passive: true, signal }); drawArc();

  /* ---------- drifting glyphs in the final call ---------- */
  {
    const m = $('.motes'), r = rng(5), G = ['·', ':', '+', '*'];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i'); s.textContent = G[(r() * G.length) | 0];
      s.style.left = (r() * 100).toFixed(1) + '%'; s.style.top = (30 + r() * 70).toFixed(1) + '%';
      s.style.animationDuration = (12 + r() * 10).toFixed(1) + 's'; s.style.animationDelay = (-r() * 20).toFixed(1) + 's';
      m.appendChild(s);
    }
  }

  /* ---------- entrances, then retire the stagger ---------- */
  const io = watch(new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    setTimeout(() => e.target.classList.add('done'), 1400);
  }), { rootMargin: '0px 0px -12% 0px' }));
  $$('.reveal').forEach(s => io.observe(s));
  const idleIO = watch(new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('idle', !e.isIntersecting))));
  $$('.live-sec').forEach(s => idleIO.observe(s));
  document.addEventListener('visibilitychange', () => root.classList.toggle('paused', document.hidden), { signal });

  /* ---------- reduced motion, live in both directions ---------- */
  function pinToFinalStates() { arcShown = -1; drawArc(); if (route) route.goTo(route.index, true); }
  function unpinFinalStates() { arcShown = -1; drawArc(); }
  RM.addEventListener('change', e => { if (e.matches) pinToFinalStates(); else applyHeroMode(); }, { signal });

  applyHeroMode();

  return () => {
    ac.abort();
    observers.forEach(o => o.disconnect());
    disableScrub(); disablePhone();
    if (route) route.stop();
    clearTimeout(rsT);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    root.innerHTML = pristine;   // every DOM change above is undone, so a re-init starts clean
  };
}
