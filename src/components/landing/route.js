/* PathFinder route: a wireframe relief of the climb, like a planning-table hologram drawn in ink.
 A height grid of ridged peaks is drawn as a mesh (lines both ways) with hidden-line
 occlusion: each band of cells is filled with paper and outlined in ink, far to near, so
 nearer ridges hide what's behind them. A route winds up the valley floor and climbs the
 summit at the end. The camera flies along it one stage per click, and at the last stage
 pulls back to show the whole line from the trailhead to the peak. */
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (x, a, b) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/* the route: winding lateral offset, with the summit where it ends */
// the last stretch swings right, so the summit stands beside the stop text rather than under it
const ROUTE_X = (z) => 3.2 * Math.sin(z * 0.13) + 1.6 * Math.sin(z * 0.31 + 1.1) + 6 * sstep(z, 30, 52);
const SUMMIT_Z = 52, SUMMIT_X = ROUTE_X(SUMMIT_Z), SUMMIT_H = 25, SUMMIT_R = 12;
/* one stop per click: the trailhead, then the six stages; the last is the summit */
const STOPS_Z = [0, 8, 16, 24, 33, 42, SUMMIT_Z];
const X0 = -42, X1 = 42, Z0 = -16, Z1 = SUMMIT_Z + 22, STEP = 1;

const lerp = (a, b, t) => a + (b - a) * t;

/* ridged sines: sharp crests, soft valleys */
function ridge(x, z) {
  let sum = 0, amp = 1, norm = 0, fx = x, fz = z;
  for (let o = 0; o < 5; o++) {
    const n = Math.sin(fx * 1.7 + fz * 0.9 + o * 1.3) * 0.6 + Math.sin(fx * 0.8 - fz * 1.9 + o * 2.1) * 0.4;
    const r = 1 - Math.abs(n);
    sum += r * r * amp; norm += amp;
    amp *= 0.5; fx *= 2.03; fz *= 2.03;
  }
  return sum / norm;
}
/* the valley floor climbs gently, then steeply through Networking and Interview */
const floorAt = (z) => 0.8 * sstep(z, 0, 24) + 3.2 * sstep(z, 24, 44);
const summitAt = (x, z) => SUMMIT_H * Math.exp(-Math.hypot(x - SUMMIT_X, z - SUMMIT_Z) / SUMMIT_R);   // pointed, not domed
function heightAt(x, z) {
  const dist = Math.abs(x - ROUTE_X(z));
  const walls = sstep(dist, 2.6, 10) * (4 + 14 * sstep(dist, 7, 30)) * (0.2 + 0.8 * ridge(x * 0.075, z * 0.075));
  const behind = sstep(z, SUMMIT_Z - 4, SUMMIT_Z + 16) * 8 * ridge(x * 0.11 + 3, z * 0.09);
  const s = summitAt(x, z);
  return floorAt(z) + walls * (1 - clamp01(s / SUMMIT_H) * 0.4) + behind + s * (0.62 + 0.38 * ridge(x * 0.22, z * 0.22));
}
const routePt = (z) => { const x = ROUTE_X(z); return [x, heightAt(x, z), z]; };

/* the camera: a different shot at every stage (close over the shoulder, skimming the floor,
   high on a wall, looking up the steep face), so each click lands somewhere new. Offsets are
   relative to the route: how far back, how high, how far to the side, how far it turns away
   from the route's heading, and how far it tilts down. */
const aim = (pos, yaw, pitch) => ({ pos, tgt: [pos[0] + Math.sin(yaw) * Math.cos(pitch) * 10, pos[1] - Math.sin(pitch) * 10, pos[2] + Math.cos(yaw) * Math.cos(pitch) * 10] });
const SHOTS = [
  { back: 8, up: 6, side: -1.5, yaw: 0.22, pitch: 0.2 },    // trailhead: up the valley
  { back: 5, up: 3.4, side: 3, yaw: 0.4, pitch: 0.12 },     // close, over the right shoulder
  { back: 9, up: 11, side: -7, yaw: 0.5, pitch: 0.36 },     // high on the left wall, looking across
  { back: 4, up: 2.8, side: 1.6, yaw: 0.26, pitch: 0.06 },  // skimming the valley floor
  { back: 7, up: 3.2, side: -3.5, yaw: 0.34, pitch: -0.03 },// looking up the steep face
  { back: 6, up: 7, side: 4.5, yaw: 0.24, pitch: 0.18 },    // on the ridge beside the climb
];
function camAt(z, shot, yawScale) {
  const pz = z - shot.back, [rx, ry] = routePt(pz);
  const [ax, , az] = routePt(Math.min(z + 10, SUMMIT_Z));
  const heading = Math.atan2(ax - rx, az - pz);
  const px = rx + Math.cos(heading) * shot.side, qz = pz - Math.sin(heading) * shot.side;
  const ground = Math.max(ry, heightAt(px, qz));
  return aim([px, ground + shot.up, qz], heading * 0.6 + shot.yaw * yawScale, shot.pitch);
}
/* the arrival: pulled back, higher and steeper, so the whole route, start to summit, is in frame */
const OVERVIEW = aim([-18, 30, -8], Math.atan2(SUMMIT_X + 18, SUMMIT_Z * 0.55 + 8) + 0.1, 0.4);

function create(cv, root, opts = {}) {
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const tok = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const mono = tok('--mono') || 'ui-monospace, monospace';
  let W = 0, H = 0, raf = 0, last = 0;
  let hole = null;   // the stop text's box, kept clear of lines

  // world grid, computed once
  const NX = Math.round((X1 - X0) / STEP) + 1, NZ = Math.round((Z1 - Z0) / STEP) + 1;
  const GX = new Float32Array(NX * NZ), GY = new Float32Array(NX * NZ), GZ = new Float32Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = X0 + i * STEP, z = Z0 + j * STEP;
    GX[k] = x; GZ[k] = z; GY[k] = heightAt(x, z);
  }
  const SX = new Float32Array(NX * NZ), SY = new Float32Array(NX * NZ), SD = new Float32Array(NX * NZ);

  let view = null;   // { C, f, r, u, F, cy }
  function setView(pos, tgt, roll = 0) {
    const f = norm([tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]]);
    const r0 = norm(cross(f, [0, 1, 0])), u0 = cross(r0, f);
    const cr = Math.cos(roll), sr = Math.sin(roll);   // banking through the turns
    const r = [0, 1, 2].map((i) => r0[i] * cr + u0[i] * sr), u = [0, 1, 2].map((i) => u0[i] * cr - r0[i] * sr);
    view = { C: pos, f, r, u, F: Math.max(W * 0.5, H * 0.8), cy: H * 0.64 };
  }
  function project(x, y, z, out, k) {
    const { C, f, r, u, F, cy } = view;
    const dx = x - C[0], dy = y - C[1], dz = z - C[2];
    const d = dx * f[0] + dy * f[1] + dz * f[2];
    if (d < 0.4) { out.d[k] = -1; return false; }
    out.x[k] = W / 2 + (dx * r[0] + dy * r[1] + dz * r[2]) * F / d;
    out.y[k] = cy - (dx * u[0] + dy * u[1] + dz * u[2]) * F / d;
    out.d[k] = d;
    return true;
  }
  const scratch = { x: new Float32Array(1), y: new Float32Array(1), d: new Float32Array(1) };
  const proj1 = (p) => (project(p[0], p[1], p[2], scratch, 0) ? { x: scratch.x[0], y: scratch.y[0], d: scratch.d[0] } : null);

  const terrainCv = document.createElement('canvas');
  const tctx = terrainCv.getContext('2d');
  let cacheKey = '';

  function paintTerrain(arr) {
    const ink = tok('--fg') || '#382c20', paper = tok('--bg') || '#ebe2d1';
    const grid = { x: SX, y: SY, d: SD };
    for (let k = 0; k < NX * NZ; k++) project(GX[k], GY[k], GZ[k], grid, k);
    tctx.clearRect(0, 0, W, H);
    tctx.lineJoin = 'round';
    const FAR = lerp(80, 150, arr), FOG_STEPS = 8;
    // far to near: each band fills paper (hiding what's behind), then is outlined in ink
    // bands run across the axis the camera looks along, painted from the far side
    const { f } = view, alongZ = Math.abs(f[2]) >= Math.abs(f[0]);
    const NB = (alongZ ? NZ : NX) - 1, NC = (alongZ ? NX : NZ) - 1;
    const towardFar = alongZ ? f[2] > 0 : f[0] > 0;
    for (let bi = 0; bi < NB; bi++) {
      const band = towardFar ? NB - 1 - bi : bi;
      let dSum = 0, n = 0;
      const fill = new Path2D(), buckets = [];
      for (let ci = 0; ci < NC; ci++) {
        const i = alongZ ? ci : band, j = alongZ ? band : ci;
        const a = j * NX + i, b = a + 1, c = a + NX + 1, e = a + NX;
        if (SD[a] < 0 || SD[b] < 0 || SD[c] < 0 || SD[e] < 0) continue;
        const minX = Math.min(SX[a], SX[b], SX[c], SX[e]), maxX = Math.max(SX[a], SX[b], SX[c], SX[e]);
        if (maxX < -40 || minX > W + 40) continue;
        fill.moveTo(SX[a], SY[a]); fill.lineTo(SX[b], SY[b]); fill.lineTo(SX[c], SY[c]); fill.lineTo(SX[e], SY[e]); fill.closePath();
        // the near edge and the left edge of each cell: together the bands make the full mesh
        const fogK = Math.round(sstep(SD[a], 6, FAR) * FOG_STEPS);
        if (fogK >= FOG_STEPS) continue;
        const tall = (GY[a] + GY[b] + GY[e]) / 3 > 7.5 ? 1 : 0, bk = fogK * 2 + tall;
        const path = buckets[bk] || (buckets[bk] = new Path2D());
        path.moveTo(SX[e], SY[e]); path.lineTo(SX[a], SY[a]); path.lineTo(SX[b], SY[b]);
        dSum += SD[a]; n++;
      }
      if (!n) continue;
      const d = dSum / n;
      tctx.globalAlpha = 1; tctx.fillStyle = paper; tctx.fill(fill);
      tctx.strokeStyle = ink;
      tctx.lineWidth = 0.55 + 0.75 * (1 - sstep(d, 4, 40));
      buckets.forEach((path, bk) => {
        const fog = 1 - (bk >> 1) / FOG_STEPS;
        // the high ground reads stronger, like snow catching light
        tctx.globalAlpha = (bk & 1 ? 0.22 + 0.6 * fog : 0.12 + 0.4 * fog) * fog;
        tctx.stroke(path);
      });
    }
    tctx.globalAlpha = 1;
    eraseHole(tctx);
  }
  // keep the stop text on clean paper: lines fade out behind it
  function eraseHole(tctx) {
    if (hole) {
      tctx.save();
      tctx.globalCompositeOperation = 'destination-out';
      const cx = hole.x + hole.w / 2, cyy = hole.y + hole.h / 2;
      tctx.translate(cx, cyy); tctx.scale(hole.w * 0.62, hole.h * 0.72);
      const g = tctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(0,0,0,.94)'); g.addColorStop(0.7, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tctx.fillStyle = g; tctx.beginPath(); tctx.arc(0, 0, 1, 0, Math.PI * 2); tctx.fill();
      tctx.restore();
    }
  }

  /* the route, drawn all the way to the summit, with a diamond at each stage still ahead */
  function paintOverlay(camZ, arr, el) {
    const accent = tok('--accent') || '#b0673c', paper = tok('--bg') || '#ebe2d1';
    const from = lerp(Math.max(camZ - 2.5, 0), 0, arr);
    const pts = [];
    for (let z = from; z <= SUMMIT_Z + 0.001; z += 0.25) {
      const [x, y] = routePt(z);
      const p = proj1([x, y + 0.08, z]);
      if (p) pts.push(p);
    }
    if (pts.length > 1) {
      const line = new Path2D();
      pts.forEach((p, i) => (i ? line.lineTo(p.x, p.y) : line.moveTo(p.x, p.y)));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.16; ctx.lineWidth = 9; ctx.stroke(line);
      ctx.globalAlpha = 0.95; ctx.lineWidth = 2.6; ctx.stroke(line);
      // light travelling up the line
      for (let k = 0; k < 3; k++) {
        const head = (el * 0.07 + k / 3) % 1, tail = Math.max(0, head - 0.08);
        const a = Math.floor(tail * (pts.length - 1)), b = Math.floor(head * (pts.length - 1));
        if (b - a < 1) continue;
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y);
        for (let s = a + 1; s <= b; s++) ctx.lineTo(pts[s].x, pts[s].y);
        ctx.globalAlpha = 0.9 * (1 - head * 0.6); ctx.lineWidth = 4.4 * (1 - head * 0.5); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (let s = 1; s < STOPS_Z.length; s++) {
      const z = STOPS_Z[s];
      if (arr < 0.5 && z < camZ - 0.5) continue;   // the current stage keeps its diamond: its text darts out of it
      const [x, y] = routePt(z);
      const p = proj1([x, y, z]);
      if (!p || p.x < -20 || p.x > W + 20) continue;
      const sz = Math.max(4, Math.min(11, 70 / p.d));
      ctx.globalAlpha = clamp01(1.3 - p.d / 70);
      ctx.fillStyle = s === STOPS_Z.length - 1 ? accent : paper; ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - sz * 2.2); ctx.lineTo(p.x + sz, p.y - sz * 1.2); ctx.lineTo(p.x, p.y - sz * 0.2); ctx.lineTo(p.x - sz, p.y - sz * 1.2); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (W > 560) {
        ctx.font = `700 10px ${mono}`; ctx.textAlign = 'center'; ctx.fillStyle = accent;
        ctx.fillText('0' + s, p.x, p.y - sz * 2.2 - 7);
      }
    }
    ctx.globalAlpha = 1;
  }

  let camZ = STOPS_Z[0], arr = 0, shot = { ...SHOTS[0] }, swoop = 0, roll = 0;
  function draw(el) {
    // wide screens keep the text on the left, so the climb is turned to the right; phones stack it above
    const c = camAt(camZ, { ...shot, up: shot.up + swoop }, W > 720 ? 1 : 0.25), e = arr * arr * (3 - 2 * arr);
    const pos = [0, 1, 2].map((i) => lerp(c.pos[i], OVERVIEW.pos[i], e));
    const tgt = [0, 1, 2].map((i) => lerp(c.tgt[i], OVERVIEW.tgt[i], e));
    setView(pos, tgt, roll * (1 - e));
    const key = [camZ, arr, swoop, roll, shot.back, shot.up, shot.side, shot.yaw, shot.pitch].map((v) => v.toFixed(3)).join('|') + W + 'x' + H;
    if (key !== cacheKey) { paintTerrain(e); cacheKey = key; }
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(terrainCv, 0, 0, W, H);
    paintOverlay(camZ, e, el);
    eraseHole(ctx);
    // the section ends in paper, not a cut: the mesh and the line dissolve over the last stretch
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(0, H * 0.74, 0, H);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.55, 'rgba(0,0,0,.7)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = fade; ctx.fillRect(0, H * 0.74, W, H * 0.26);
    ctx.restore();
  }
  /* where a stage's diamond sits on screen right now, so the stop text can dart to and from it */
  function markerAt(i) {
    if (!view) return null;
    const z = STOPS_Z[Math.max(1, Math.min(STOPS_Z.length - 1, i))];
    const [x, y] = routePt(z);
    const p = proj1([x, y, z]);
    return p && p.x > 0 && p.x < W && p.y > 0 && p.y < H ? { x: p.x, y: p.y - 12 } : null;
  }

  /* ---- click-driven camera ---- */
  let index = 0, tween = null, running = false;
  const t0 = performance.now();
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LAST = STOPS_Z.length - 1;
  const KEYS = ['back', 'up', 'side', 'yaw', 'pitch'];
  function goTo(i, instant) {
    i = Math.max(0, Math.min(LAST, i));
    index = i;
    const toZ = i === LAST ? STOPS_Z[LAST - 1] : STOPS_Z[i], toArr = i === LAST ? 1 : 0;
    const toShot = SHOTS[Math.min(i, SHOTS.length - 1)];
    if (instant || reduce()) {
      camZ = toZ; arr = toArr; shot = { ...toShot }; swoop = 0; roll = 0; tween = null;
      draw(0);
      opts.onArrive?.(i);
      return;
    }
    const dist = Math.abs(toZ - camZ) + Math.abs(toArr - arr) * 12;
    // the move lifts and banks toward the side the next shot sits on
    const bank = Math.sign(toShot.side - shot.side || 1) * Math.min(0.12, 0.03 + Math.abs(toShot.side - shot.side) * 0.012);
    tween = { fz: camZ, tz: toZ, fa: arr, ta: toArr, fs: { ...shot }, ts: toShot, bank, lift: 2 + Math.min(dist, 16) * 0.22,
      start: performance.now(), dur: 1100 + Math.min(dist, 30) * 45, i };
    kick();
  }
  function frame(t) {
    raf = 0;
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (t - last < 33) return;
    last = t;
    if (tween) {
      const k = clamp01((t - tween.start) / tween.dur), e = k * k * k * (k * (k * 6 - 15) + 10);
      camZ = lerp(tween.fz, tween.tz, e); arr = lerp(tween.fa, tween.ta, e);
      KEYS.forEach((key) => { shot[key] = lerp(tween.fs[key], tween.ts[key], e); });
      const arc = Math.sin(Math.PI * k);
      swoop = arc * tween.lift; roll = arc * tween.bank;
      if (k >= 1) { const i = tween.i; tween = null; swoop = 0; roll = 0; opts.onArrive?.(i); }
    }
    draw((t - t0) / 1000);
  }
  function kick() { if (running && !raf) raf = requestAnimationFrame(frame); }
  function start() { if (reduce()) { draw(0); return; } running = true; kick(); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || 900; H = cv.clientHeight || 500;
    cv.width = Math.max(1, Math.floor(W * dpr)); cv.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    terrainCv.width = cv.width; terrainCv.height = cv.height;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cr = cv.getBoundingClientRect(), pr = opts.panel && opts.panel.getBoundingClientRect();
    hole = pr ? { x: pr.left - cr.left, y: pr.top - cr.top, w: pr.width, h: pr.height } : null;
    cacheKey = '';
    draw((performance.now() - t0) / 1000);
  }
  resize();
  return { goTo, start, stop, resize, markerAt, get index() { return index; }, count: STOPS_Z.length };
}

function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

export { create };
