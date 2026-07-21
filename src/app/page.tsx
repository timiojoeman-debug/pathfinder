"use client";

/**
 * PathFinder landing — warm-paper redesign (PathFinder Landing.dc.html).
 * Paper grain, ASCII neural globe, career position report with tilt,
 * university marquee, six phase cards, and the one-action pitch.
 */

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { applyTheme, getStoredTheme, setStoredTheme, type ThemeMode } from "@/lib/theme";
import { CountUp, Reveal } from "@/components/pf/ui";

const mono = "var(--font-mono), 'JetBrains Mono', monospace";
const serifItalic: CSSProperties = {
  fontFamily: "var(--font-serif), 'Instrument Serif', serif",
  fontWeight: 400,
  fontStyle: "italic",
  letterSpacing: "-.01em",
  color: "var(--accent)",
};

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ── Content (from the design script) ─────────────────────────────── */

const PIPELINE = [
  { name: "Career Direction", dot: "var(--strong)", textColor: "var(--muted)", weight: 500, railBg: "transparent", href: "/direction" },
  { name: "CV Optimisation", dot: "var(--warn)", textColor: "var(--muted)", weight: 500, railBg: "transparent", href: "/cv" },
  { name: "Opportunity Discovery", dot: "var(--accent)", textColor: "var(--fg)", weight: 700, railBg: "var(--accentSoft)", href: "/jobs" },
  { name: "Networking", dot: "var(--faint)", textColor: "var(--muted)", weight: 500, railBg: "transparent", href: "/networking" },
  { name: "Interview Preparation", dot: "var(--faint)", textColor: "var(--muted)", weight: 500, railBg: "transparent", href: "/interview" },
  { name: "Application Tracking", dot: "var(--faint)", textColor: "var(--muted)", weight: 500, railBg: "transparent", href: "/tracker" },
];

const REPORT_OPPS = [
  { company: "Skyscanner", role: "SWE Intern", fit: 86, move: "Apply now", tone: "var(--strong)" },
  { company: "FanDuel", role: "Backend Intern", fit: 79, move: "Tailor & apply", tone: "var(--strong)" },
  { company: "Monzo", role: "Backend Intern", fit: 66, move: "Tailor CV", tone: "var(--warn)" },
];

const ACTIONS = [
  { text: "Apply to 3 matched SWE internships", tag: "jobs" },
  { text: "Open a warm intro at FanDuel", tag: "network" },
  { text: "Practice system design — interview soon", tag: "prep" },
];

/**
 * What PathFinder actually coaches. This replaced a marquee of university
 * names (Stanford, MIT, Imperial and friends) which implied institutional
 * endorsements that do not exist -- the same reason this page carries no
 * testimonials and no outcome statistics.
 */
const COVERAGE = [
  "Career direction",
  "ATS-ready CVs",
  "Referral outreach",
  "Coffee chats",
  "STAR stories",
  "Pattern drills",
  "Mock interviews",
  "Application tracking",
];

/** The metrics the product actually tracks for you. Stated as what gets
 *  measured, not as results we have not yet earned the right to claim. */
const TRACKED = [
  { title: "Interview rate", note: "Applications that turn into conversations \u2014 the number that actually matters." },
  { title: "Referrals opened", note: "Warm paths into a team, counted separately from cold applications." },
  { title: "Readiness", note: "Derived from evidence you have logged \u2014 never from what you say about yourself." },
];

const PHASES = [
  { n: "01", label: "Phase 01 · Discovery", title: "Career Direction", href: "/direction", desc: "Surface your strengths, values and fit — the AI helps you name a direction worth pursuing.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></svg> },
  { n: "02", label: "Phase 02 · Precision", title: "CV Optimisation", href: "/cv", desc: "Line-by-line feedback with match scores per role — every bullet sharpened against the job.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg> },
  { n: "03", label: "Phase 03 · Growth", title: "Opportunity Discovery", href: "/jobs", desc: "A living map of internships matched to your skills and level — ranked by real fit, not keywords.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg> },
  { n: "04", label: "Phase 04 · Connections", title: "Networking", href: "/networking", desc: "The highest-leverage move in the whole search: AI-coached referrals and coffee chats. A warm intro converts ~4× a cold application.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.2" /><path d="M15.5 11a3 3 0 100-5M3 20a6 6 0 0112 0M15 20a6 6 0 00-3-5.2" /></svg> },
  { n: "05", label: "Phase 05 · Mastery", title: "Interview Preparation", href: "/interview", desc: "STAR stories, pattern drills and realistic mock rounds — built over weeks, so you're ready when the callback lands instead of scrambling after.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg> },
  { n: "06", label: "Phase 06 · Momentum", title: "Application Tracking", href: "/tracker", desc: "Every application in one calm board, so nothing slips and momentum compounds toward the offer.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg> },
];

/* ── ASCII neural globe (ported from the design script) ───────────── */

function useNeuralGlobe(canvasRef: React.RefObject<HTMLCanvasElement | null>, rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current;
    const root = rootRef.current;
    if (!cv || !root) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const CELL = 8;
    let W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
    let raf = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth || 800;
      H = cv.clientHeight || 300;
      cv.width = Math.max(1, Math.floor(W * dpr));
      cv.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CELL);
      rows = Math.ceil(H / CELL);
      ctx.font = `700 ${CELL + 1}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    let ink = "#382C20", accent = "#B0673C", themeName = "";
    const readColors = () => {
      const cs = getComputedStyle(root);
      ink = (cs.getPropertyValue("--fg") || "").trim() || ink;
      accent = (cs.getPropertyValue("--accent") || "").trim() || accent;
      themeName = document.documentElement.getAttribute("data-theme") || "";
    };
    readColors();

    const hash = (x: number, y: number, z: number) => {
      let n = (x | 0) * 374761393 + (y | 0) * 668265263 + (z | 0) * 1274126177;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const sm = (t: number) => t * t * (3 - 2 * t);
    const vnoise = (x: number, y: number, z: number) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const u = sm(x - xi), v = sm(y - yi), w = sm(z - zi);
      const c000 = hash(xi, yi, zi), c100 = hash(xi + 1, yi, zi), c010 = hash(xi, yi + 1, zi), c110 = hash(xi + 1, yi + 1, zi);
      const c001 = hash(xi, yi, zi + 1), c101 = hash(xi + 1, yi, zi + 1), c011 = hash(xi, yi + 1, zi + 1), c111 = hash(xi + 1, yi + 1, zi + 1);
      return lerp(lerp(lerp(c000, c100, u), lerp(c010, c110, u), v), lerp(lerp(c001, c101, u), lerp(c011, c111, u), v), w);
    };

    const t0 = performance.now();
    let last = 0;

    interface GNode { ux: number; uy: number; uz: number; phase: number }
    interface GEdge { a: number; b: number; phase: number; speed: number }
    const N = 108;
    let nodes: GNode[] = [];
    let edges: GEdge[] = [];
    const buildNet = () => {
      nodes = []; edges = [];
      const GA = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const uy = 1 - (2 * (i + 0.5)) / N;
        const r = Math.sqrt(Math.max(0, 1 - uy * uy));
        const th = i * GA;
        nodes.push({ ux: r * Math.cos(th), uy, uz: r * Math.sin(th), phase: hash(i + 1, i * 2 + 3, 7) });
      }
      const seen: Record<string, 1> = {};
      for (let i = 0; i < N; i++) {
        const a = nodes[i];
        const ds: { j: number; d: number }[] = [];
        for (let j = 0; j < N; j++) {
          if (j === i) continue;
          const b = nodes[j];
          const dx = a.ux - b.ux, dy = a.uy - b.uy, dz = a.uz - b.uz;
          ds.push({ j, d: dx * dx + dy * dy + dz * dz });
        }
        ds.sort((p, q) => p.d - q.d);
        const k = 3 + (hash(i, 2, 9) > 0.7 ? 1 : 0);
        for (let m = 0; m < k; m++) {
          const j = ds[m].j;
          const key = Math.min(i, j) + "_" + Math.max(i, j);
          if (seen[key]) continue;
          seen[key] = 1;
          edges.push({ a: i, b: j, phase: hash(i + 2, j + 5, 4), speed: 0.45 + hash(i, j, 6) * 0.8 });
        }
      }
    };
    buildNet();
    let lastW = W, lastH = H;

    const slashFor = (dx: number, dy: number) => {
      const a = Math.atan2(dy, dx);
      const deg = ((a * 180) / Math.PI + 360) % 180;
      if (deg < 22.5 || deg >= 157.5) return "-";
      if (deg < 67.5) return "\\";
      if (deg < 112.5) return "|";
      return "/";
    };

    let chBuf: (string | undefined)[] = new Array(cols * rows);
    let aBuf = new Float32Array(cols * rows);
    let acBuf = new Uint8Array(cols * rows);
    const ensureBuf = () => {
      if (chBuf.length !== cols * rows) {
        chBuf = new Array(cols * rows);
        aBuf = new Float32Array(cols * rows);
        acBuf = new Uint8Array(cols * rows);
      }
    };
    const put = (cxg: number, cyg: number, ch: string, a: number, ac: number) => {
      if (cxg < 0 || cyg < 0 || cxg >= cols || cyg >= rows) return;
      const idx = cyg * cols + cxg;
      if (a > aBuf[idx]) { aBuf[idx] = a; chBuf[idx] = ch; acBuf[idx] = ac ? 1 : 0; }
    };

    const frame = (t: number) => {
      if (!cv.isConnected) return;
      if (t - last < 33) { raf = requestAnimationFrame(frame); return; }
      last = t;
      if (document.documentElement.getAttribute("data-theme") !== themeName) readColors();
      if (W !== lastW || H !== lastH) { buildNet(); lastW = W; lastH = H; ensureBuf(); }
      const el = (t - t0) / 1000;
      const intro = reduce ? 1 : Math.min(el / 1.8, 1);

      ensureBuf();
      aBuf.fill(0);
      ctx.clearRect(0, 0, W, H);

      for (let ry = 0; ry < rows; ry += 1) {
        for (let rx = 0; rx < cols; rx += 1) {
          if (hash(rx * 2 + 5, ry * 2 + 9, 1) > 0.87) put(rx, ry, "·", 0.06, 0);
        }
      }

      const ang = reduce ? 0.5 : el * 0.26;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
      const R = Math.min(H * 0.6, W * 0.34);
      const cx = W / 2, cy = H * 0.72;

      const rCells = Math.ceil(R / CELL) + 1;
      const cgx0 = Math.max(0, Math.floor(cx / CELL) - rCells), cgx1 = Math.min(cols - 1, Math.floor(cx / CELL) + rCells);
      const cgy0 = Math.max(0, Math.floor(cy / CELL) - rCells), cgy1 = Math.min(rows - 1, Math.floor(cy / CELL) + rCells);
      for (let gy = cgy0; gy <= cgy1; gy++) {
        for (let gx = cgx0; gx <= cgx1; gx++) {
          const X = (gx * CELL + CELL / 2 - cx) / R;
          const Y = -(gy * CELL + CELL / 2 - cy) / R;
          const rr = X * X + Y * Y;
          if (rr > 1) continue;
          const Z = Math.sqrt(1 - rr);
          const y1 = ct * Y + st * Z, z1 = -st * Y + ct * Z;
          const ux = ca * X - sa * z1, uz = sa * X + ca * z1;
          const n = vnoise(ux * 2.8 + 9.3, y1 * 2.8 + 4.7, uz * 2.8 + 2.1);
          const ch = n < 0.38 ? "·" : n < 0.6 ? ":" : n < 0.8 ? "-" : "+";
          put(gx, gy, ch, 0.07 + Z * 0.09 + n * 0.09, 0);
        }
      }

      const P: { sx: number; sy: number; d: number }[] = [];
      for (let n = 0; n < nodes.length; n++) {
        const nd = nodes[n];
        const x1 = ca * nd.ux + sa * nd.uz;
        const z1 = -sa * nd.ux + ca * nd.uz;
        const y1 = nd.uy;
        const y2 = ct * y1 - st * z1;
        const z2 = st * y1 + ct * z1;
        P.push({ sx: cx + x1 * R, sy: cy - y2 * R, d: (z2 + 1) / 2 });
      }

      for (let e = 0; e < edges.length; e++) {
        const ed = edges[e];
        const pa = P[ed.a], pb = P[ed.b];
        const dx = pb.sx - pa.sx, dy = pb.sy - pa.sy;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(2, Math.ceil(dist / (CELL * 0.6)));
        const ch = slashFor(dx, dy);
        const depth = (pa.d + pb.d) / 2;
        const base = 0.08 + depth * 0.34;
        const pulse = (el * ed.speed * 0.4 + ed.phase) % 1;
        for (let s = 0; s <= steps; s++) {
          const tt = s / steps;
          const px = pa.sx + dx * tt, py = pa.sy + dy * tt;
          const cxg = Math.floor(px / CELL), cyg = Math.floor(py / CELL);
          let a = base, ac = 0, chE = ch;
          const near = Math.abs(tt - pulse);
          if (near < 0.08 && depth > 0.34) {
            const b = 1 - near / 0.08;
            a = base + b * 0.72;
            ac = b > 0.45 ? 1 : 0;
            if (near < 0.04) chE = "*";
          }
          put(cxg, cyg, chE, a, ac);
        }
      }

      for (let n = 0; n < nodes.length; n++) {
        const p = P[n];
        const nd = nodes[n];
        const cxg = Math.floor(p.sx / CELL), cyg = Math.floor(p.sy / CELL);
        const breathe = 0.5 + 0.5 * Math.sin(el * 2.2 + nd.phase * 6.28);
        const core = (0.32 + p.d * 0.62) * (0.7 + breathe * 0.3);
        const glyph = p.d > 0.62 ? "#" : p.d > 0.34 ? "O" : "o";
        put(cxg, cyg, glyph, core, p.d > 0.6 && breathe > 0.7 ? 1 : 0);
        if (p.d > 0.4) { put(cxg - 1, cyg, ":", core * 0.5, 0); put(cxg + 1, cyg, ":", core * 0.5, 0); }
      }

      for (let ry = 0; ry < rows; ry++) {
        const rowReveal = intro * rows * 1.18 - ry;
        if (rowReveal <= 0) continue;
        const rowAlpha = Math.min(rowReveal, 1);
        const py = ry * CELL + CELL / 2;
        for (let rx = 0; rx < cols; rx++) {
          const idx = ry * cols + rx;
          const a = aBuf[idx];
          if (a <= 0.02) continue;
          ctx.globalAlpha = Math.min(a * rowAlpha, 1);
          ctx.fillStyle = acBuf[idx] ? accent : ink;
          ctx.fillText(chBuf[idx] || "·", rx * CELL + CELL / 2, py);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── Parallax + panel tilt ────────────────────────────────────────── */

function useParallaxTilt(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const spots = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    const panel = root.querySelector<HTMLElement>("[data-tilt]");
    const onMove = (ev: MouseEvent) => {
      const r = root.getBoundingClientRect();
      const nx = (ev.clientX - r.left) / r.width - 0.5;
      const ny = (ev.clientY - r.top) / r.height - 0.5;
      spots.forEach((s) => {
        const d = parseFloat(s.getAttribute("data-parallax") || "16");
        s.style.transform = `translateX(-50%) translate(${nx * d}px,${ny * d}px)`;
      });
      if (panel) {
        const pr = panel.getBoundingClientRect();
        if (ev.clientY > pr.top - 60 && ev.clientY < pr.bottom + 60) {
          const px = (ev.clientX - pr.left) / pr.width - 0.5;
          const py = (ev.clientY - pr.top) / pr.height - 0.5;
          panel.style.transform = `perspective(1400px) rotateY(${px * 2.6}deg) rotateX(${-py * 2.6}deg)`;
        }
      }
    };
    const onLeave = () => {
      spots.forEach((s) => { s.style.transform = "translateX(-50%)"; });
      if (panel) panel.style.transform = "";
    };
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function Landing() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(getStoredTheme() ?? "light");
    const sync = () => setMode(getStoredTheme() ?? "light");
    window.addEventListener("pf:theme", sync);
    return () => window.removeEventListener("pf:theme", sync);
  }, []);

  useNeuralGlobe(globeRef, rootRef);
  useParallaxTilt(rootRef);

  const toggleTheme = () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
    setMode(next);
  };

  const navLink: CSSProperties = { color: "inherit", textDecoration: "none", padding: "8px 12px", margin: "-8px 0", borderRadius: 9, transition: "color .2s var(--ease), background .2s var(--ease)" };
  const kicker: CSSProperties = { fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accent)" };

  return (
    <div ref={rootRef} className="pf pf-landing" style={{ position: "relative", width: "100%", background: "var(--bg)", overflow: "hidden" }}>
      {/* Paper grain */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", opacity: "var(--grainOpacity)" as unknown as number, mixBlendMode: "multiply", backgroundImage: GRAIN, backgroundSize: "150px 150px" }} />

      {/* ── Nav ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, padding: "0 clamp(20px,4vw,56px)", borderBottom: "1px solid var(--line)", background: "color-mix(in srgb,var(--bg) 80%,transparent)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--rim)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7F1E4" strokeWidth="2.4"><path d="M12 2L2 12l10 10 10-10L12 2z" /></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em" }}>PathFinder</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13.5, fontWeight: 500, color: "var(--muted)" }}>
          <a href="#product" className="pf-hover-row" style={navLink}>Product</a>
          <a href="#phases" className="pf-hover-row" style={navLink}>Phases</a>
          <a href="#results" className="pf-hover-row" style={navLink}>Approach</a>
          <Link href="/universities" className="pf-hover-row" style={navLink}>For universities</Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, height: 36, padding: "0 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontFamily: mono, fontSize: 11, fontWeight: 500, transition: "all .2s var(--ease)" }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid currentColor" }} />
            {mode === "dark" ? "Paper" : "Night"}
          </button>
          <Link href="/intel" style={{ display: "flex", alignItems: "center", height: 39, padding: "0 19px", borderRadius: 11, background: "var(--fg)", color: "var(--bg)", fontSize: 13.5, fontWeight: 600, textDecoration: "none", boxShadow: "var(--rim)", transition: "transform .2s var(--ease)" }}>
            Start free →
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: "relative", textAlign: "center", padding: "clamp(64px,9vw,112px) clamp(20px,5vw,40px) 0", overflow: "hidden" }}>
        <div aria-hidden data-parallax="14" style={{ position: "absolute", inset: 0, left: "50%", transform: "translateX(-50%)", width: "100%", pointerEvents: "none", backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1.6px)", backgroundSize: "9px 9px", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 24%, #000 12%, transparent 72%)", maskImage: "radial-gradient(ellipse 70% 60% at 50% 24%, #000 12%, transparent 72%)", transition: "transform .4s var(--ease)" }} />
        <canvas ref={globeRef} data-parallax="16" aria-hidden style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", width: "min(1240px,150%)", height: "100%", zIndex: 1, pointerEvents: "none", transition: "transform .4s var(--ease)" }} />

        <div style={{ position: "relative", zIndex: 2 }}>
          <div className="pf-anim-up" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 15px 6px 8px", borderRadius: 100, border: "1px solid var(--lineStrong)", background: "var(--panel)", fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: ".08em", color: "var(--muted)", marginBottom: 32, whiteSpace: "nowrap", boxShadow: "var(--rim)" }}>
            <span style={{ display: "inline-flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 100, background: "var(--accentSoft)", color: "var(--accent)" }}>✦</span>
            AI INTERNSHIP READINESS COACH
          </div>
          <h1 className="pf-anim-up" style={{ fontSize: "clamp(46px,8vw,92px)", lineHeight: 0.98, letterSpacing: "-.045em", fontWeight: 800, margin: "0 auto 26px", maxWidth: "16ch", animationDelay: ".05s" }}>
            From uncertain to <span style={serifItalic}>hired.</span>
          </h1>
          <p className="pf-anim-up" style={{ fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.6, color: "var(--muted)", maxWidth: "40rem", margin: "0 auto 38px", animationDelay: ".12s" }}>
            For university students chasing internships. PathFinder coaches you to become genuinely ready — the referrals and interview skills that actually land offers — instead of spraying applications no one reads. Every day, it shows your one highest-leverage move.
          </p>
          <div className="pf-anim-up" style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap", marginBottom: 14, animationDelay: ".19s" }}>
            <Link href="/start" style={{ display: "flex", alignItems: "center", gap: 9, height: 54, padding: "0 30px", borderRadius: 13, background: "var(--fg)", color: "var(--bg)", fontSize: 16, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 10px 26px rgba(56,44,32,.16),var(--rim)", transition: "transform .22s var(--ease),box-shadow .22s var(--ease)" }}>
              Get your baseline →
            </Link>
            <a href="#phases" style={{ display: "flex", alignItems: "center", gap: 9, height: 54, padding: "0 26px", borderRadius: 13, background: "var(--panel)", color: "var(--fg)", border: "1px solid var(--lineStrong)", fontSize: 16, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", transition: "all .22s var(--ease)" }}>
              See the journey
            </a>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 2, marginTop: "clamp(150px,22vw,280px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)" }}>Built for UK &amp; EU internship season</span>
        </div>
      </section>

      {/* ── Product panel ── */}
      <section id="product" style={{ position: "relative", zIndex: 3, padding: "0 clamp(20px,5vw,40px)", marginTop: "clamp(-40px,-3vw,-20px)" }}>
        <Reveal style={{ position: "relative", maxWidth: 1060, margin: "0 auto" }}>
          <div data-tilt style={{ position: "relative", borderRadius: 18, border: "1px solid var(--lineStrong)", background: "var(--panelSolid)", boxShadow: "0 40px 90px rgba(56,44,32,.14),var(--rim)", overflow: "hidden", textAlign: "left", transition: "transform .3s var(--ease)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "15px 20px", borderBottom: "1px dashed var(--lineStrong)", background: "var(--panel)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: mono, fontSize: 10.5, fontWeight: 500, letterSpacing: ".12em", color: "var(--faint)" }}>
                <span className="pf-anim-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--strong)" }} />
                CAREER POSITION REPORT
              </span>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10.5, color: "var(--faint)" }}>No. 074 · 08 JUL 2026</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: 360 }}>
              <div style={{ borderRight: "1px dashed var(--lineStrong)", padding: "22px 18px", background: "var(--panel)" }}>
                <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 16 }}>Your pipeline</div>
                {PIPELINE.map((p) => (
                  <Link key={p.name} href={p.href} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 9, marginBottom: 2, background: p.railBg, textDecoration: "none" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: p.weight, color: p.textColor }}>{p.name}</span>
                  </Link>
                ))}
              </div>
              <div style={{ padding: "26px 28px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>Readiness</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 11, marginTop: 6 }}>
                      <CountUp value={74} style={{ fontFamily: mono, fontSize: 56, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 0.9, color: "var(--strong)" }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Competitive — closing fast</span>
                    </div>
                    <div style={{ height: 6, width: 280, maxWidth: "100%", borderRadius: 3, background: "var(--panel2)", overflow: "hidden", marginTop: 14 }}>
                      <div className="pf-anim-grow" style={{ height: "100%", width: "74%", borderRadius: 3, background: "var(--strong)" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, background: "var(--accentSoft)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)" }}>
                    <span style={{ display: "flex", width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--accent)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
                    </span>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accentText)" }}>Do next</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>Ship systems project</div>
                    </div>
                  </div>
                </div>
                <div style={{ border: "1px dashed var(--lineStrong)", borderRadius: 13, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 54px 1.2fr", gap: 10, padding: "9px 15px", borderBottom: "1px dashed var(--lineStrong)", background: "var(--panel)" }}>
                    {["Opportunity", "Fit", "Move"].map((h) => (
                      <span key={h} style={{ fontFamily: mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>{h}</span>
                    ))}
                  </div>
                  {REPORT_OPPS.map((o) => (
                    <div key={o.company} style={{ display: "grid", gridTemplateColumns: "1.6fr 54px 1.2fr", gap: 10, alignItems: "center", padding: "12px 15px", borderBottom: "1px solid var(--line2)" }}>
                      <div>
                        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{o.company}</span>
                        <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{o.role}</span>
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: o.tone }}>{o.fit}</span>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.move}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: -24, right: -14, display: "flex", alignItems: "center", gap: 11, padding: "13px 17px", borderRadius: 14, background: "var(--fg)", color: "var(--bg)", boxShadow: "0 20px 40px rgba(56,44,32,.22)", animation: "pfFloat 5.5s ease-in-out infinite" }}>
            <span style={{ display: "flex", width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--accent)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
            </span>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.65 }}>Next best action</div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Ship your systems project today</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Marquee ── */}
      <section style={{ marginTop: "clamp(60px,7vw,90px)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "22px 0", overflow: "hidden", position: "relative", background: "var(--panel)" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "linear-gradient(90deg,var(--panel),transparent 12%,transparent 88%,var(--panel))" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 60, width: "max-content", animation: "pfMarquee 32s linear infinite", fontFamily: mono, fontSize: 15, fontWeight: 500, letterSpacing: ".02em", color: "var(--faint)" }}>
          {[...COVERAGE, ...COVERAGE].map((u, i) => (
            <span key={u + i}>{u}</span>
          ))}
        </div>
      </section>

      {/* ── Phases ── */}
      <section id="phases" style={{ padding: "clamp(70px,9vw,120px) clamp(20px,5vw,56px)", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={kicker}>The Journey</span>
          <h2 style={{ fontSize: "clamp(34px,5vw,52px)", fontWeight: 800, letterSpacing: "-.04em", margin: "16px 0 14px" }}>
            Six phases. Two that get you <span style={serifItalic}>hired.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: "34rem", margin: "0 auto", lineHeight: 1.6 }}>
            Direction, CV and tracking keep you tidy — but referrals and interview readiness are what convert. PathFinder coaches all six, and pushes hardest on the two that decide the offer.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {PHASES.map((p) => (
            <Reveal key={p.n} style={{}}>
              <Link href={p.href} style={{ display: "block", position: "relative", border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 18, padding: 28, overflow: "hidden", boxShadow: "var(--rim)", transition: "transform .34s var(--ease),border-color .34s var(--ease),background .34s var(--ease)", textDecoration: "none", color: "var(--fg)", height: "100%" }} className="pf-hover-border">
                <span aria-hidden style={{ position: "absolute", top: -18, right: 6, fontFamily: "var(--font-serif), 'Instrument Serif', serif", fontSize: 96, lineHeight: 1, color: "var(--fg)", opacity: 0.06, pointerEvents: "none" }}>{p.n}</span>
                <div style={{ width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accentSoft)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", color: "var(--accent)", marginBottom: 22 }}>{p.icon}</div>
                <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 9 }}>{p.label}</div>
                <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 8px" }}>{p.title}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>{p.desc}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── One action ── */}
      <section style={{ padding: "0 clamp(20px,5vw,56px) clamp(70px,9vw,110px)", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 60, alignItems: "center" }}>
          <Reveal style={{}}>
            <span style={kicker}>The core idea</span>
            <h2 style={{ fontSize: "clamp(32px,4.5vw,46px)", fontWeight: 800, letterSpacing: "-.04em", margin: "16px 0 18px", lineHeight: 1.04 }}>
              One action<br />at a <span style={serifItalic}>time.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--muted)", margin: 0 }}>
              No spreadsheet paralysis. No guessing. PathFinder reads your whole pipeline and surfaces the single highest-impact move — then the next, and the next, until the offer is signed.
            </p>
          </Reveal>
          <Reveal style={{ position: "relative", border: "1px solid var(--lineStrong)", borderRadius: 18, overflow: "hidden", background: "var(--panelSolid)", boxShadow: "0 30px 70px rgba(56,44,32,.12),var(--rim)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "17px 20px", borderBottom: "1px dashed var(--lineStrong)", background: "var(--accentSoft)" }}>
              <span style={{ display: "flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, background: "var(--accent)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Ship a distributed-systems project</span>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: "var(--accentText)", background: "var(--accentSoft)", padding: "3px 9px", borderRadius: 6 }}>cv</span>
            </div>
            {ACTIONS.map((a) => (
              <div key={a.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 20px", borderBottom: "1px solid var(--line2)" }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, border: "1.5px solid var(--lineStrong)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, color: "var(--muted)" }}>{a.text}</span>
                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: "var(--faint)", border: "1px solid var(--line)", background: "var(--panel)", padding: "3px 9px", borderRadius: 6 }}>{a.tag}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── What we track ──
          Replaced a "Measured outcomes" block that claimed 3× more callbacks,
          89% landing an interview and a 14-day average response, plus three
          named testimonials. None of it was real. A product that tells students
          not to embellish their CV cannot embellish its own landing page. */}
      <section id="results" style={{ padding: "0 clamp(20px,5vw,56px) clamp(70px,9vw,110px)", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={kicker}>Honest status</span>
          <h2 style={{ fontSize: "clamp(32px,4.5vw,46px)", fontWeight: 800, letterSpacing: "-.04em", margin: "16px 0 14px" }}>
            No numbers we haven&apos;t <span style={serifItalic}>earned.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: "42rem", margin: "0 auto", lineHeight: 1.6 }}>
            PathFinder is new. Rather than borrow university logos or invent testimonials, here is what it measures for you — and what we will publish once there is real data behind it.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {TRACKED.map((t) => (
            <Reveal key={t.title} style={{ border: "1px solid var(--line)", borderRadius: 18, padding: 34, background: "var(--panel)", boxShadow: "var(--rim)" }}>
              <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accent)" }}>Tracked</div>
              <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em", margin: "12px 0 10px" }}>{t.title}</div>
              <div style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.6 }}>{t.note}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", padding: "clamp(84px,11vw,140px) clamp(20px,5vw,40px)", textAlign: "center", borderTop: "1px solid var(--line)", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1.6px)", backgroundSize: "9px 9px", WebkitMaskImage: "radial-gradient(ellipse 60% 80% at 50% 100%, #000 8%, transparent 70%)", maskImage: "radial-gradient(ellipse 60% 80% at 50% 100%, #000 8%, transparent 70%)" }} />
        <Reveal style={{ position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--faint)" }}>ASSESS → ANALYSE → REPORT → OFFER</span>
          <h2 style={{ fontSize: "clamp(38px,6vw,66px)", fontWeight: 800, letterSpacing: "-.045em", margin: "20px auto 18px", maxWidth: "16ch", lineHeight: 1.02 }}>
            Stop guessing your career. Start <span style={serifItalic}>measuring</span> it.
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: "32rem", margin: "0 auto 36px", lineHeight: 1.6 }}>
            The assessment takes five minutes and builds your complete career-intelligence profile — readiness, gaps, opportunities, and your highest-leverage next move.
          </p>
          <Link href="/start" style={{ display: "inline-flex", alignItems: "center", gap: 9, height: 56, padding: "0 32px", borderRadius: 15, background: "var(--fg)", color: "var(--bg)", fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 12px 34px rgba(56,44,32,.2),var(--rim)", transition: "transform .22s var(--ease)" }}>
            Get your baseline →
          </Link>
          <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 18 }}>Free during early access · No credit card</p>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "28px clamp(20px,5vw,56px)", borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F7F1E4" strokeWidth="2.5"><path d="M12 2L2 12l10 10 10-10L12 2z" /></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>PathFinder</span>
        </div>
        <div style={{ display: "flex", gap: 26, fontSize: 13, color: "var(--faint)" }}>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
          <a href="mailto:support@pathfinder.app" style={{ color: "inherit", textDecoration: "none" }}>Contact</a>
        </div>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".08em", color: "var(--faint)" }}>© 2026 PATHFINDER · CAREER INTELLIGENCE OS</span>
      </footer>
    </div>
  );
}
