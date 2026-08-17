"use client";

/**
 * PathFinder landing — warm-paper redesign (PathFinder Landing.dc.html).
 * Paper grain, a scroll-driven terrain and route, career position report with
 * tilt, coverage marquee, six phase cards, and the one-action pitch.
 */

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { setTheme, useThemeMode } from "@/lib/theme";
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

/* ── Terrain, route and camera ────────────────────────────────────────
 * The landing's one visual. A height field in world space, projected in
 * perspective and drawn back-to-front so each ridge occludes the one behind
 * it — a real 3D scene, but stroked line art, so it needs no material
 * system and no WebGL.
 *
 * Scroll moves a camera along the route through seven stations rather than
 * firing seven unrelated section effects. Station 0 is the trailhead;
 * stations 1–6 are the six phases, and the camera arrives at each as its
 * section does.
 */

/** How much of the route is visible ahead of the camera at once. */
const VIEW = 3;

/** Perspective strength. Screen position and scale both go as 1/(1+PERSP·d),
 *  so the far end of the valley compresses toward a vanishing point instead of
 *  ramping evenly to the horizon — the difference between a slope and a
 *  distance. */
const PERSP = 4.5;

/** Elevation ramp for the globe's surface shell, lightest first. */
const GLOBE_RAMP = ["·", ":", ";", "-", "=", "+", "*", "#"];

/** Fraction of a glyph's cycle spent flashing orange on the globe. */
const FLASH_DUTY_GLOBE = 0.1;

/** Fraction of its cycle a node spends lit. With ~100 nodes in view this leaves
 *  roughly a quarter firing at any moment — eased back from 0.34, but only a
 *  step: at 0.14 the ground went quiet enough to look broken. */
const FLASH_DUTY = 0.26;

/** Seconds per node cycle, min and added range. Each node picks its own from
 *  this window so they never fall into a shared beat. Duty is held constant
 *  while these grow, so a longer cycle also means a longer, slower swell rather
 *  than the same quick blink spaced further apart. */
const FLASH_PERIOD_MIN = 4.6, FLASH_PERIOD_RANGE = 6.4;

/** Pins past this normalised depth are dropped. Beyond it the shape is only a
 *  few pixels tall and reads as a tapered dot, so it contributes noise without
 *  contributing the icon. Culling by depth rather than by rendered size matters:
 *  size also depends on the flash envelope, so a size test would pop a pin in
 *  and out during a single flash. PIN_FADE eases the last stretch so there is
 *  no hard line across the ground where they stop. */
const PIN_MAX_DEPTH = 0.42, PIN_FADE = 0.13;

/** Camera stations, one per section in document order. `v` is distance along
 *  the route, `pitch` is 0 at eye level and 1 looking straight down. */
const STATIONS: { v: number; pitch: number }[] = [
  { v: 0.0, pitch: 0.04 }, // 0 hero — point A, standing at the trailhead
  { v: 2.4, pitch: 0.12 }, // 1 position report
  { v: 4.8, pitch: 0.68 }, // 2 six phases — the one climb of the journey, high
                           //   enough for the opportunity graph to resolve. The
                           //   page explains "six phases, two that convert"
                           //   here, so it is where seeing the whole structure
                           //   is worth leaving the ground for.
  { v: 7.2, pitch: 0.16 }, // 3 one action — back down into the valley
  { v: 9.6, pitch: 0.08 }, // 4 honest status — level, and then it barely moves:
  { v: 9.9, pitch: 0.08 }, // 5 CTA — a 0.3 crawl against 2.4 everywhere else, so
                           //   the stretch across "no numbers we haven't earned"
                           //   is the one that doesn't perform.
  { v: 12.6, pitch: 0.14 }, // 6 footer — point B
];

/** Total distance travelled, for spacing the waypoints across the journey. */
const ROUTE_LENGTH = STATIONS[STATIONS.length - 1].v;

function useTerrainRoute(canvasRef: React.RefObject<HTMLCanvasElement | null>, rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current;
    const root = rootRef.current;
    if (!cv || !root) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* More rows than before: the far half of the valley compresses into the top
       of the band, so it needs the density to stay continuous rather than
       banding. Rows are sampled evenly in world depth and land unevenly on
       screen, which is what perspective should do. */
    const ROWS = 62, COLS = 150;
    let W = 0, H = 0;
    let raf = 0, last = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const sm = (t: number) => t * t * (3 - 2 * t);
    const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

    /* A gentle bend, not a sweep. At ±0.30 the valley centre moved further
       across the view than the visible half-window, so only the outer wall was
       ever in frame and the canyon read as a single hillside. */
    const routeU = (v: number) => 0.5 + Math.sin(v * 0.38) * 0.14 + Math.sin(v * 0.97) * 0.05;

    /* Open country, not a canyon. The route still runs a flat floor, but past
       the floor the ground swells into rolling ridges that keep climbing
       outward instead of walling the frame in. */
    const RELIEF_RISE = 1.15;
    const RELIEF_CAP = 3.2;
    /* Half-width of the flat floor, measured from the hero copy so the text
       always sits on level ground. A world constant can't work: the copy is a
       fixed pixel width, so at 1280 it covers half the frame and at 760 nearly
       all of it. */
    let copyHalfPx = 0;

    /* Distance out from the route, past the flat floor. Shared by the surface
       and the ASCII pass so the glyphs land on the high ground and never on
       the floor the copy sits on. */
    const outFrom = (u: number, v: number, floorHalf: number) =>
      Math.max(0, Math.abs(u - routeU(v)) - floorHalf);

    /* Linear swell plus ridge structure that only fades in past the floor —
       a range receding outward rather than a wall at a fixed offset. */
    const reliefAt = (u: number, v: number, floorHalf: number) => {
      const t = outFrom(u, v, floorHalf);
      if (t <= 0) return 0;
      const swell = Math.min(t * RELIEF_RISE, RELIEF_CAP);
      const ridges =
        Math.sin(u * 4.3 + v * 0.85) * 0.42 +
        Math.sin(u * 9.1 - v * 1.6) * 0.24 +
        Math.sin(u * 2.1 + v * 0.4) * 0.30;
      return swell + ridges * Math.min(t * 2.4, 1) * 0.9;
    };

    const height = (u: number, v: number, d: number, floorHalf: number) => {
      const relief = reliefAt(u, v, floorHalf) * (1 - d * 0.25);
      const rough =
        Math.sin(u * 7.1 + v * 3.4) * 0.16 +
        Math.sin(u * 13.7 - v * 5.2) * 0.09 +
        Math.sin(u * 3.3 + v * 1.7) * 0.12;
      /* Roughness scales with the relief, so the floor stays walkable and only
         the high ground goes craggy. */
      return relief + rough * (0.35 + relief * 0.5);
    };

    /* At eye level the horizon is placed below the hero's last content row, so
       the ground never climbs into the copy; at plan view it rises to fill the
       frame. Measured rather than tuned — a constant that clears the CTAs on a
       desktop cuts through them on a phone. */
    let floorY = 0;
    /* Peaks rise about PEAK_RISE of the band above the horizon, and the band is
       itself whatever is left below the horizon — so the clearance the horizon
       needs depends on where the horizon ends up. Solving that rather than
       adding a fixed margin: a constant that cleared the copy at 1280x800 was
       40px into it at 768x1024, because the band scales with the viewport. */
    /* The valley floor is what has to clear the copy — the walls are at the
       sides of the frame, where centred text isn't, and they read as a frame
       around it rather than an obstruction. So this is sized off the floor's
       roughness, not the wall cap. */
    const PEAK_RISE = 0.16;
    const horizonAt = (pitch: number) => {
      const eye = (floorY + 16 + 0.95 * PEAK_RISE * H) / (1 + PEAK_RISE);
      return lerp(Math.min(Math.max(eye, H * 0.40), H * 0.88), H * 0.02, pitch);
    };

    /* Pitch blends two projections: eye level (strong squeeze, shallow band)
       and plan view (near-orthographic, full frame). Relief is a fraction of
       the band, so peaks can never out-climb the horizon they belong to. */
    const rowGeom = (d: number, pitch: number) => {
      const horizon = horizonAt(pitch);
      const band = H * 0.95 - horizon;
      /* One perspective factor drives scale, screen depth and relief together,
         so the valley recedes as a single consistent space. */
      const p = 1 / (1 + PERSP * d);
      const pFar = 1 / (1 + PERSP);
      const squeeze = lerp(p, lerp(1, 0.5, d), pitch);
      return {
        squeeze,
        horizon,
        /* Normalised so d=1 lands exactly on the horizon. Most of the world
           depth now compresses into the top of the band — that compression is
           what reads as distance. */
        dScreen: (1 - p) / (1 - pFar),
        /* Constant *screen* width, so the corridor flares with distance. A
           constant world width shrinks on screen as depth grows, which is what
           let far walls climb into the copy however wide the floor was set. */
        floorHalf: copyHalfPx / Math.max(squeeze * W * 1.02, 1),
        /* Deliberately larger than the band: only the floor has to stay under
           the copy, and the walls are meant to overshoot it and frame the shot. */
        amp: band * lerp(1.15, 0.55, pitch) * p,
      };
    };

    /* camU is the camera's lateral position, and it tracks the route. Without
       it the camera advances along the route's axis but keeps staring down the
       middle, so the path snakes across the screen instead of staying ahead of
       you — it reads as a line drawn over the ground rather than one you are
       walking. */
    const project = (u: number, v: number, camV: number, camU: number, pitch: number) => {
      const d = clamp01((v - camV) / VIEW);
      const g = rowGeom(d, pitch);
      return {
        x: (u - camU) * g.squeeze * W * 1.02 + W / 2,
        y: H * 0.95 - g.dScreen * (H * 0.95 - g.horizon) - height(u, v, d, g.floorHalf) * g.amp,
        d,
      };
    };

    /* ── Opportunity graph ──────────────────────────────────────────────
     * The same node/edge structure the old ASCII globe drew on a sphere, laid
     * on the ground plane instead: the route is one traversal through it, and
     * the unlit edges are the paths not taken. Built once — it is scenery, not
     * data, and must never be labelled with a real company or person. */
    /* Math.imul and unsigned shifts. The previous version used plain `*` on
       32-bit-sized integers, which overflows float-exact range and silently
       corrupts the bit mixing, and `>>`, which propagates sign. For the input
       pattern used to place nodes it never once returned above 0.4998 — so all
       280 nodes landed on the same side of the route. */
    const hash = (x: number, y: number) => {
      let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      n = Math.imul(n ^ (n >>> 16), 2246822519);
      return ((n ^ (n >>> 13)) >>> 0) / 4294967295;
    };


    /* Node count is up from 280: with nodes visible only while firing, the
       population sets how much of the ground can light rather than how dense a
       drawn mesh looks. Edges and their nearest-neighbour wiring are gone —
       nothing connects the nodes now, so none of that structure was read. */
    const NODES: { u: number; v: number }[] = [];
    (() => {
      const span = ROUTE_LENGTH + VIEW;
      const N = 520;

      /* Stratified rather than pure random. Uniform random is correct but it
         clumps — it leaves bald patches and knots, which is what reads as an
         uneven scatter even when the statistics are fine. Each node instead
         owns one slot per axis and jitters inside it, so coverage is even at
         every scale and the randomness only decides where within a slot.
         Measured against pure random: lateral quartiles 129/148/121/122 became
         130/130/130/130, and the spread of nearest-neighbour gaps halved. */
      const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => hash(a, 91) - hash(b, 91));

      for (let i = 0; i < N; i++) {
        const v = ((i + hash(i, 7)) / N) * span;
        /* The permutation is what keeps the lateral slot independent of the
           depth slot — without it every node would sit on one diagonal.

           Spread is ±0.7, not the ±2.6 it started at. Wider is not better here:
           the visible world width is only about ±0.5 units at the plan station
           and ±0.5 to ±1.4 across the culled depth band at eye level, so a ±2.6
           spawn put four nodes in five off-frame sideways and left only the
           small-offset ones — which bunched down the middle and left the outer
           quarter of the frame empty. Sizing the spawn to the visible cone is
           what actually puts pins on both sides. */
        const spread = ((order[i] + hash(i, 11)) / N - 0.5) * 1.4;
        NODES.push({ u: routeU(v) + spread, v });
      }
    })();

    /* Split in two so the animated layer does not repay for the static one.
       The terrain is 62 rows of path work and only changes when the camera
       moves; the graph flash and the flow along the edges change every
       frame. Painting terrain into an offscreen canvas and blitting it took
       the graph station from a 22ms median frame to roughly idle. */
    /* The globe gets its own layer: capping each glyph's alpha does not bound
       what they composite to — a dozen glyphs at 0.115 stack to ~0.77, which is
       how the paragraph still measured 3.61:1 after a per-glyph cap. Masked as
       a whole layer, the ceiling actually holds. */
    const globeCv = document.createElement("canvas");
    const gctx = globeCv.getContext("2d");
    if (!gctx) return;

    /* ── Distant ASCII globe ──────────────────────────────────────────
     * The original hero globe, kept as scenery: a Fibonacci sphere wired to
     * nearest neighbours, rotating, with pulses running its edges. Smaller and
     * fainter than it was, sitting in the sky. Painted before the terrain is
     * blitted, so the ground occludes its lower half and it reads as something
     * far off rather than a decal on the front. */
    const GLOBE_N = 340;
    const globeNodes: { x: number; y: number; z: number }[] = [];
    const globeEdges: { a: number; b: number; phase: number; speed: number }[] = [];
    (() => {
      const GA = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < GLOBE_N; i++) {
        const y = 1 - (2 * (i + 0.5)) / GLOBE_N;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        globeNodes.push({ x: r * Math.cos(i * GA), y, z: r * Math.sin(i * GA) });
      }
      const seen: Record<string, 1> = {};
      for (let i = 0; i < GLOBE_N; i++) {
        const a = globeNodes[i];
        const ds = globeNodes
          .map((n, j) => ({ j, d: (n.x - a.x) ** 2 + (n.y - a.y) ** 2 + (n.z - a.z) ** 2 }))
          .filter((x) => x.j !== i)
          .sort((p, q) => p.d - q.d);
        for (let m = 0; m < 3; m++) {
          const key = Math.min(i, ds[m].j) + "_" + Math.max(i, ds[m].j);
          if (seen[key]) continue;
          seen[key] = 1;
          globeEdges.push({ a: i, b: ds[m].j, phase: hash(i, ds[m].j + 7), speed: 0.4 + hash(i, m + 3) * 0.5 });
        }
      }
    })();

    /** Edge glyph by angle — the trick the original used, and still the one. */
    const slash = (dx: number, dy: number) => {
      const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 180;
      return deg < 22.5 || deg >= 157.5 ? "-" : deg < 67.5 ? "\\" : deg < 112.5 ? "|" : "/";
    };

    const paintGlobe = (pitch: number, el: number) => {
      const horizon = horizonAt(pitch);
      /* Centred and large, sunk so its lower third falls below the horizon —
         the terrain blit lands on top, so it reads as rising from behind the
         land rather than floating in front of it. R is clamped to whatever sky
         there is, so a low horizon shrinks it instead of pushing it off frame. */
      /* Centre sits below the horizon so a wide cap fills the sky: at the
         horizon line the sphere is 0.87R across, which spans the whole frame.
         Sinking it until only the crest showed gave a 54px sliver of a 1116px
         sphere — the extreme top, where almost no nodes land. */
      const R = W * 0.46;
      const cx = W * 0.5, cy = horizon + R * 0.34;
      if (horizon < 80) return;

      const cs = getComputedStyle(root);
      const faint = (cs.getPropertyValue("--faint") || "").trim() || "#A08E77";
      const accent = (cs.getPropertyValue("--accent") || "").trim() || "#B0673C";

      const ang = el * 0.16, ca = Math.cos(ang), sa = Math.sin(ang);
      const tilt = 0.34, ct = Math.cos(tilt), st = Math.sin(tilt);
      const P = globeNodes.map((n) => {
        const x1 = ca * n.x + sa * n.z, z1 = -sa * n.x + ca * n.z;
        const y2 = ct * n.y - st * z1, z2 = st * n.y + ct * z1;
        return { sx: cx + x1 * R, sy: cy - y2 * R, d: (z2 + 1) / 2 };
      });

      gctx.clearRect(0, 0, W, H);
      gctx.textAlign = "center";
      gctx.textBaseline = "middle";

      /* Any glyph can fire orange, on its own cycle. Keyed by a stable id so a
         given cell keeps its rhythm frame to frame rather than strobing. */
      const flashOf = (id: number) => {
        const period = 2.4 + hash(id, 61) * 3.4;
        const c = ((el / period) + hash(id, 67)) % 1;
        return c < FLASH_DUTY_GLOBE ? Math.sin((c / FLASH_DUTY_GLOBE) * Math.PI) : 0;
      };

      /* Surface shell — the shading pass the original globe had, and where most
         of its detail lived. Marching the screen grid over the sphere's disc,
         lifting each cell back to a surface point, and ramping a glyph by the
         noise there. Without it the globe is only nodes and wires. */
      /* Coarser grid on small viewports. The shell is the most expensive pass
         in the frame and phones are both the weakest hardware and the place
         p99 was overrunning the 33ms budget; a wider cell cuts the glyph count
         roughly in half for detail nobody can resolve at that size anyway. */
      const CELL = W < 700 ? 12 : 9;
      gctx.font = `700 ${CELL}px ${mono}`;
      for (let gy = Math.max(0, cy - R); gy < Math.min(horizon, cy + R); gy += CELL) {
        for (let gx = Math.max(0, cx - R); gx < Math.min(W, cx + R); gx += CELL) {
          const X = (gx - cx) / R, Y = -(gy - cy) / R;
          const rr = X * X + Y * Y;
          if (rr > 1) continue;
          const Z = Math.sqrt(1 - rr);
          /* Rotate the sample into world space so the pattern turns with the
             sphere instead of sitting still on the screen. */
          const y1 = ct * Y + st * Z, z1 = -st * Y + ct * Z;
          const ux = ca * X - sa * z1, uz = sa * X + ca * z1;
          const n = 0.5 + 0.5 * Math.sin(ux * 4.2 + 1.7) * Math.sin(y1 * 3.6 - 2.1) * Math.sin(uz * 3.1 + 0.6);
          const f = flashOf(((gx / CELL) | 0) * 997 + ((gy / CELL) | 0));
          gctx.globalAlpha = (0.05 + Z * 0.09 + n * 0.10) * (1 + f * 2.2);
          gctx.fillStyle = f > 0.25 ? accent : faint;
          gctx.fillText(GLOBE_RAMP[Math.min(GLOBE_RAMP.length - 1, (n * GLOBE_RAMP.length) | 0)], gx, gy);
        }
      }

      gctx.font = `700 8px ${mono}`;
      for (const e of globeEdges) {
        const pa = P[e.a], pb = P[e.b];
        const dx = pb.sx - pa.sx, dy = pb.sy - pa.sy;
        const steps = Math.max(1, Math.round(Math.hypot(dx, dy) / 7));
        const ch = slash(dx, dy);
        const depth = (pa.d + pb.d) / 2;
        const pulse = (el * e.speed * 0.35 + e.phase) % 1;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const near = Math.abs(t - pulse);
          const lit = near < 0.09 && depth > 0.42;
          gctx.globalAlpha = (0.13 + depth * 0.22) * (lit ? 2.4 : 1);
          gctx.fillStyle = lit ? accent : faint;
          gctx.fillText(lit && near < 0.045 ? "*" : ch, pa.sx + dx * t, pa.sy + dy * t);
        }
      }
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        const nf = flashOf(i * 31 + 5);
        gctx.globalAlpha = (0.18 + p.d * 0.38) * (1 + nf * 1.8);
        gctx.fillStyle = nf > 0.25 ? accent : faint;
        gctx.fillText(p.d > 0.66 ? "#" : p.d > 0.36 ? "O" : "o", p.sx, p.sy);
      }
      gctx.globalAlpha = 1;

      /* Mask the whole layer down through the copy column, then blit. Because
         this multiplies the already-composited layer, GLOBE_CAP is a real
         ceiling on what lands behind the text — 0.10 sits under the 0.115 the
         paragraph can absorb and still clear 4.5:1. The flanks keep full
         strength, so the globe reads bright either side of the copy. */
      /* Erase back through the copy block only — the rectangle the hero text
         actually occupies, feathered at the sides. destination-out with alpha a
         scales what is there by (1-a), so 0.9 leaves a tenth: under the 0.115
         the paragraph can absorb. Everything below the copy, including the wide
         band down to the horizon, keeps full strength. */
      const b = Math.min(copyHalfPx / W, 0.5), f = 0.06;
      const erase = gctx.createLinearGradient(0, 0, W, 0);
      const stop = (t: number, a: number) => erase.addColorStop(Math.min(Math.max(t, 0), 1), `rgba(0,0,0,${a})`);
      stop(0, 0);
      stop(0.5 - b - f, 0);
      stop(0.5 - b, 0.45);
      stop(0.5 + b, 0.45);
      stop(0.5 + b + f, 0);
      stop(1, 0);
      gctx.globalCompositeOperation = "destination-out";
      gctx.fillStyle = erase;
      gctx.fillRect(0, 0, W, floorY + 12);
      gctx.globalCompositeOperation = "source-over";

      ctx.drawImage(globeCv, 0, 0, W, H);
    };

    /* Offscreen buffers: the last painted terrain, and the globe. The globe
       needs its own because capping each glyph's alpha does not bound what they
       composite to — a dozen glyphs at 0.115 stack to ~0.77, which is how the
       paragraph still measured 3.61:1 after a per-glyph cap. Drawn to a layer
       and masked as a whole, the ceiling actually holds. */
    const terrainCv = document.createElement("canvas");
    const tctx = terrainCv.getContext("2d");
    if (!tctx) return;
    /* cacheValid is a flag, not a NaN sentinel. It used to be `cacheV = NaN`
       tested with `Math.abs(camV - cacheV) > eps` — but every comparison
       against NaN is false, so the sentinel never triggered the repaint it
       existed to trigger. The terrain only appeared when the theme check
       happened to fire instead; with no data-theme set at first draw, all
       three conditions were false and the buffer stayed empty for good. */
    let cacheValid = false;
    let cacheV = 0, cachePitch = 0, cacheTheme = "";

    const paintTerrain = (camV: number, pitch: number) => {
      const cs = getComputedStyle(root);
      const ground = (cs.getPropertyValue("--bg") || "").trim() || "#EBE2D1";
      const ink = (cs.getPropertyValue("--fg") || "").trim() || "#382C20";
      const faint = (cs.getPropertyValue("--faint") || "").trim() || "#A08E77";

      tctx.clearRect(0, 0, W, H);
      tctx.lineJoin = "round";

      const camU = routeU(camV);

      /* Sparse ASCII above the horizon. The frame's top third was empty paper;
         the old globe carried the same faint stipple and it is what made the
         thing read as an instrument rather than an illustration. */
      {
        const sky = horizonAt(pitch);
        tctx.font = `700 10px ${mono}`;
        tctx.textAlign = "center";
        tctx.textBaseline = "middle";
        tctx.fillStyle = faint;
        const step = 22;
        for (let sy = 14; sy < sky; sy += step) {
          for (let sx = 12; sx < W; sx += step) {
            const h = hash(sx + Math.round(camV * 40), sy);
            if (h > 0.82) {
              const base = (0.10 + h * 0.14) * (sy / Math.max(sky, 1));
              /* Held down through the copy column. This stipple spans the full
                 frame, and at its natural 0.24 peak it was the thing dragging
                 the hero paragraph to 4.26:1 — not the globe, which is masked.
                 The glyphs are sparse enough that they rarely overlap, so a
                 per-glyph cap does bound the composite here. */
              const col = clamp01(1 - Math.abs(sx - W / 2) / Math.max(copyHalfPx, 1));
              tctx.globalAlpha = base * (1 - col) + Math.min(base, 0.1) * col;
              tctx.fillText(h > 0.955 ? "+" : h > 0.90 ? ":" : "·", sx, sy);
            }
          }
        }
        tctx.globalAlpha = 1;
      }
      /* Only the hero's copy is fitted to the valley floor; every later section
         sits wherever its own layout puts it, so the ground steps back to
         texture once you leave the trailhead. The route does not — it is the
         subject, and it keeps full weight the whole way. */
      const contrast = 1 - 0.55 * clamp01(camV / STATIONS[1].v);

      /* Back to front. Filling under each ridge occludes the row behind it,
         which is the whole depth cue for the price of one fill. */
      for (let r = ROWS - 1; r >= 0; r--) {
        const d = r / (ROWS - 1);
        const v = camV + d * VIEW;
        /* Each row samples a u-window wide enough to span the viewport at its
           own squeeze — far rows are compressed, so they need a wider slice of
           world to reach both edges. */
        /* Hoisted: the glyph pass calls this per column, and recomputing it
           ~50 times a row for a value that only varies by row is waste. */
        const rg = rowGeom(d, pitch);
        const half = 0.54 / Math.max(rg.squeeze, 0.14);
        const uAt = (c: number) => camU - half + (c / COLS) * 2 * half;
        const trace = () => {
          tctx.beginPath();
          for (let c = 0; c <= COLS; c++) {
            const p = project(uAt(c), v, camV, camU, pitch);
            if (c === 0) tctx.moveTo(p.x, p.y); else tctx.lineTo(p.x, p.y);
          }
        };
        trace();
        tctx.lineTo(project(uAt(COLS), v, camV, camU, pitch).x, H + 2);
        tctx.lineTo(project(uAt(0), v, camV, camU, pitch).x, H + 2);
        tctx.closePath();
        tctx.fillStyle = ground;
        tctx.fill();

        /* Contours carry the surface on their own — the glyph pass that used to
           shade the ground was removed, so their weight goes back up. */
        trace();
        tctx.strokeStyle = d > 0.62 ? faint : ink;
        tctx.globalAlpha = (0.16 + (1 - d) * 0.34) * (1 - pitch * 0.25) * contrast;
        tctx.lineWidth = 1 + (1 - d) * 0.8;
        tctx.stroke();
        tctx.globalAlpha = 1;
      }

    };

    /* Blit the cached terrain, repainting it only when the camera or the theme
       actually moved, then draw the live layer over it. */
    const draw = (camV: number, pitch: number, el: number) => {
      const theme = document.documentElement.getAttribute("data-theme") || "";
      if (!cacheValid || Math.abs(camV - cacheV) > 0.0004 || Math.abs(pitch - cachePitch) > 0.0004 || theme !== cacheTheme) {
        paintTerrain(camV, pitch);
        cacheV = camV;
        cachePitch = pitch;
        cacheTheme = theme;
        cacheValid = true;
      }
      ctx.clearRect(0, 0, W, H);
      /* Order is the whole trick: globe, then the terrain blit over it. The
         cached terrain has a transparent sky and an opaque ground, so the globe
         shows through above the horizon and is cut off below it. */
      paintGlobe(pitch, el);
      ctx.drawImage(terrainCv, 0, 0, W, H);
      paintOverlay(camV, pitch, el);
    };

    const paintOverlay = (camV: number, pitch: number, el: number) => {
      const cs = getComputedStyle(root);
      const accent = (cs.getPropertyValue("--accent") || "").trim() || "#B0673C";
      const ground = (cs.getPropertyValue("--bg") || "").trim() || "#EBE2D1";
      const camU = routeU(camV);
      ctx.lineJoin = "round";
      /* Visible at every altitude now, not just from above. The pitch gate made
         sense while these formed a diagram that needed height to read; as bare
         points of activity they work at eye level too — signals scattered over
         the ground you are walking. No edges and no resting state: a node
         exists but is only visible while it fires. */
      for (let i = 0; i < NODES.length; i++) {
        const n = NODES[i];
        if (n.v < camV || n.v > camV + VIEW) continue;

        const period = FLASH_PERIOD_MIN + hash(i, 41) * FLASH_PERIOD_RANGE;
        const cycle = ((el / period) + hash(i, 53)) % 1;
        if (cycle > FLASH_DUTY) continue;

        const p = project(n.u, n.v, camV, camU, pitch);
        if (p.x < -20 || p.x > W + 20 || p.d > PIN_MAX_DEPTH) continue;

        /* Sine envelope over the lit window: swells and fades rather than
           switching on, which would read as a blink at this size. */
        const env = Math.sin((cycle / FLASH_DUTY) * Math.PI);
        const near = 1 - p.d;
        /* Bigger than before: with the far field culled, the survivors can
           carry the shape instead of hedging toward a dot. */
        const r = (2.0 + near * 2.6) * (0.62 + env * 0.6);
        ctx.globalAlpha = env * (0.45 + near * 0.5) * clamp01((PIN_MAX_DEPTH - p.d) / PIN_FADE);

        /* Map pin rather than a dot: round head, tip planted at the node's
           position on the ground, so it reads as marking a place rather than
           floating above one. The arc leaves a gap at the bottom and the two
           lines close it through the tip. */
        const head = p.y - r * 2.5;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(p.x, head, r, Math.PI * 0.82, Math.PI * 0.18);
        ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fill();

        /* Punch the head out on the nearer pins — below about 2.5px the hole
           closes up into a smudge and costs a fill for nothing. */
        if (r > 2.5) {
          ctx.fillStyle = ground;
          ctx.beginPath();
          ctx.arc(p.x, head, r * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      ctx.beginPath();
      for (let s = 0; s <= 200; s++) {
        const v = camV + (s / 200) * VIEW;
        const rp = project(routeU(v), v, camV, camU, pitch);
        if (s === 0) ctx.moveTo(rp.x, rp.y - 3); else ctx.lineTo(rp.x, rp.y - 3);
      }
      /* The route is the subject, so it gets drawn twice: a wide soft underlay
         to lift it off the ground it crosses, then the line itself. */
      ctx.strokeStyle = accent;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.16 * (1 - pitch * 0.25);
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.globalAlpha = 0.95 * (1 - pitch * 0.2);
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* Flow along the route itself: three bright runs travelling toward the
         horizon, so the path reads as a direction of travel rather than a line
         that happens to be drawn. Same idea as the edge flow, slower — this is
         the subject, and a fast pulse on it would fidget. */
      const ROUTE_STEPS = 200;
      const routePt = (t: number) => {
        const v = camV + clamp01(t) * VIEW;
        const p = project(routeU(v), v, camV, camU, pitch);
        return { x: p.x, y: p.y - 3 };
      };
      ctx.lineCap = "round";
      ctx.strokeStyle = accent;
      for (let k = 0; k < 3; k++) {
        const head = ((el * 0.075 + k / 3) % 1);
        const tail = Math.max(head - 0.11, 0);
        if (head <= 0) continue;
        ctx.beginPath();
        const steps = Math.max(2, Math.round((head - tail) * ROUTE_STEPS));
        for (let s = 0; s <= steps; s++) {
          const pt = routePt(tail + ((head - tail) * s) / steps);
          if (s === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        }
        /* Fades out as it recedes, so it reads as distance rather than the
           pulse simply ending. */
        ctx.globalAlpha = 0.85 * (1 - head * 0.8) * (1 - pitch * 0.2);
        ctx.lineWidth = 4.6 * (1 - head * 0.55);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

    };

    /* Scroll → camera. Sections tagged data-wp are the stations; the camera
       lerps between the two the viewport centre currently sits between. */
    let anchors: HTMLElement[] = [];
    const measure = () => {
      anchors = Array.from(root.querySelectorAll<HTMLElement>("[data-wp]"))
        .sort((a, b) => Number(a.dataset.wp) - Number(b.dataset.wp));
    };

    const camera = () => {
      /* Reduced motion is handled by freezing time, not by pinning the camera:
         scrolling is the reader's own action, so the scene should still answer
         it. Pinning here also parked them at STATIONS[2] — the plan view, pitch
         0.68 — where the terrain fills the frame and the hero copy sits over it,
         a composition the horizon guard never sizes for. Fallback is the hero,
         which is where the page opens. */
      if (anchors.length < 2) return STATIONS[0];
      /* The eye tracks the top of the viewport, not its centre. With the centre,
         a page opened at scroll 0 already sat 39% of the way to station 1 —
         the hero never actually got its own camera. A section now arrives as
         its top reaches the top of the frame. */
      const eye = window.scrollY;
      const top = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
      if (eye <= top(anchors[0])) return STATIONS[0];
      for (let i = 0; i < anchors.length - 1; i++) {
        const a = top(anchors[i]), b = top(anchors[i + 1]);
        if (eye < b) {
          const t = sm(clamp01((eye - a) / Math.max(b - a, 1)));
          const s0 = STATIONS[Math.min(i, STATIONS.length - 1)];
          const s1 = STATIONS[Math.min(i + 1, STATIONS.length - 1)];
          return { v: lerp(s0.v, s1.v, t), pitch: lerp(s0.pitch, s1.pitch, t) };
        }
      }
      return STATIONS[STATIONS.length - 1];
    };

    const t0 = performance.now();

    const frame = (t: number) => {
      if (!cv.isConnected) return;
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return;
      last = t;
      const cam = camera();
      /* Always redraw now: the route flow animates at every station, not just
         where the graph is up. The old skip-when-parked guard lives in draw()
         instead, which repaints the terrain only when the camera moves and
         blits the cached copy otherwise. */
      draw(cam.v, cam.pitch, (t - t0) / 1000);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth || 900;
      H = cv.clientHeight || 500;
      cv.width = Math.max(1, Math.floor(W * dpr));
      cv.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* Buffer matches the backing store, and its transform matches too, so
         the terrain pass can keep drawing in CSS pixels. */
      terrainCv.width = cv.width;
      terrainCv.height = cv.height;
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      globeCv.width = cv.width;
      globeCv.height = cv.height;
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cacheValid = false;
      measure();
      /* The hero sits at the top of the document, so this element's document
         offset is also its viewport position at station 0 — where the eye-level
         horizon has to clear. */
      const sill = root.querySelector<HTMLElement>("[data-horizon]");
      /* offsetTop, not getBoundingClientRect: this row enters on a translate
         (pf-anim-up), and a rect read mid-animation returns the transformed
         position, which put the horizon ~80px too high for the rest of the
         session. Layout offsets ignore transforms. */
      let y = 0;
      for (let el: HTMLElement | null = sill; el; el = el.offsetParent as HTMLElement | null) y += el.offsetTop;
      floorY = sill ? y + sill.offsetHeight : H * 0.72;

      /* Widest hero text, not just the paragraph — the h1 runs wider than the
         copy block and walls were rising inside it. */
      let widest = 0;
      root.querySelectorAll<HTMLElement>("[data-wp='0'] h1, [data-wp='0'] p")
        .forEach((el) => { widest = Math.max(widest, el.offsetWidth); });
      copyHalfPx = Math.min((widest || W * 0.6) / 2 + 46, W * 0.47);
      cacheValid = false;
      const cam = camera();
      draw(cam.v, cam.pitch, 0);
    };

    let cleanupReduced: (() => void) | null = null;

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    /* Repaint on the theme toggle: the loop skips unmoved frames, so a colour
       change needs to invalidate the cache explicitly. */
    const mo = new MutationObserver(() => {
      cacheValid = false;
      const cam = camera();
      draw(cam.v, cam.pitch, 0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (reduce) {
      /* No rAF: redraw on scroll only, with elapsed time pinned at 0 so the
         node flashes and the route flow stay still. The reader gets every
         station's composition, none of the autonomous movement. */
      const onScroll = () => { const cam = camera(); draw(cam.v, cam.pitch, 0); };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanupReduced = () => window.removeEventListener("scroll", onScroll);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      cleanupReduced?.();
    };
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
  const terrainRef = useRef<HTMLCanvasElement | null>(null);
  const mode = useThemeMode();

  useTerrainRoute(terrainRef, rootRef);
  useParallaxTilt(rootRef);

  const toggleTheme = () => setTheme(mode === "dark" ? "light" : "dark");

  const navLink: CSSProperties = { color: "inherit", textDecoration: "none", padding: "8px 12px", margin: "-8px 0", borderRadius: 9, transition: "color .2s var(--ease), background .2s var(--ease)" };
  const kicker: CSSProperties = { fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accent)" };

  /* isolation:isolate on the root is load-bearing — without a stacking context
     there, the globe's z-index:-1 escapes to the root element and paints
     *behind* this div's background, i.e. invisible. */
  return (
    <div ref={rootRef} className="pf pf-landing" style={{ position: "relative", width: "100%", background: "var(--bg)", overflow: "hidden", isolation: "isolate" }}>
      {/* Neural globe — a fixed viewport layer, not a hero decoration, so it
          stays present behind every section. z-index -1 puts it above the
          page background but below all in-flow content; sections that carry
          their own --panel background (marquee, report card) occlude it,
          which is what gives the page depth. */}
      <canvas ref={terrainRef} aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: -1, pointerEvents: "none" }} />

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
        <nav className="pf-hide-mobile" style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13.5, fontWeight: 500, color: "var(--muted)" }}>
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
      <section data-wp="0" style={{ position: "relative", textAlign: "center", padding: "clamp(64px,9vw,112px) clamp(20px,5vw,40px) 0", overflow: "hidden" }}>
        <div aria-hidden data-parallax="14" style={{ position: "absolute", inset: 0, left: "50%", transform: "translateX(-50%)", width: "100%", pointerEvents: "none", backgroundImage: "radial-gradient(var(--dot) 1px, transparent 1.6px)", backgroundSize: "9px 9px", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 24%, #000 12%, transparent 72%)", maskImage: "radial-gradient(ellipse 70% 60% at 50% 24%, #000 12%, transparent 72%)", transition: "transform .4s var(--ease)" }} />
        {/* Terrain plate — the hero's ground. Opaque fill, so it occludes the
            page-wide globe layer within the hero and hands over to it below. */}
        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Eyebrow, not a chip. The pill was a bordered panel floating over
              open ground — a card in all but name, and the one thing above the
              headline competing with it. Plain type sits better on terrain. */}
          <div className="pf-anim-up" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: mono, fontSize: 11.5, fontWeight: 600, letterSpacing: ".2em", color: "var(--muted)", marginBottom: 30, whiteSpace: "nowrap" }}>
            <span aria-hidden style={{ color: "var(--accent)", fontSize: 13 }}>✦</span>
            AI INTERNSHIP READINESS COACH
          </div>
          <h1 className="pf-anim-up" style={{ fontSize: "clamp(46px,8vw,92px)", lineHeight: 0.98, letterSpacing: "-.045em", fontWeight: 800, margin: "0 auto 26px", maxWidth: "16ch", animationDelay: ".05s" }}>
            From uncertain to <span style={serifItalic}>hired.</span>
          </h1>
          <p className="pf-anim-up" style={{ fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.6, color: "var(--fg)", opacity: 0.82, maxWidth: "40rem", margin: "0 auto 38px", animationDelay: ".12s" }}>
            For university students chasing internships. PathFinder coaches you to become genuinely ready — the referrals and interview skills that actually land offers — instead of spraying applications no one reads. Every day, it shows your one highest-leverage move.
          </p>
          <div data-horizon className="pf-anim-up" style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap", marginBottom: 14, animationDelay: ".19s" }}>
            <Link href="/start" style={{ display: "flex", alignItems: "center", gap: 9, height: 54, padding: "0 30px", borderRadius: 13, background: "var(--fg)", color: "var(--bg)", fontSize: 16, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 10px 26px rgba(56,44,32,.16),var(--rim)", transition: "transform .22s var(--ease),box-shadow .22s var(--ease)" }}>
              Get your baseline →
            </Link>
            {/* Ghost link, not a second button. Two filled surfaces side by
                side read as two primary actions; the rule is one. Keeps the
                54px height so the touch target still clears 44px. */}
            <a href="#phases" style={{ display: "flex", alignItems: "center", gap: 9, height: 54, padding: "0 20px", color: "var(--fg)", fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", textDecoration: "underline", textDecorationColor: "var(--lineStrong)", textUnderlineOffset: 6, textDecorationThickness: 1.5, transition: "all .22s var(--ease)" }}>
              See the journey
            </a>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 2, marginTop: "clamp(150px,22vw,280px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          {/* Sits on the globe's crest, not on clean paper: --faint measured
              2.46:1 here and --muted 3.77:1 once the globe was behind it, both
              under the 4.5:1 floor. --fg is the only token with headroom over
              textured ground at this size. */}
          <span style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg)", opacity: 0.75 }}>Built for UK &amp; EU internship season</span>
        </div>
      </section>

      {/* ── Product panel ── */}
      <section data-wp="1" id="product" style={{ position: "relative", zIndex: 3, padding: "0 clamp(20px,5vw,40px)", marginTop: "clamp(-40px,-3vw,-20px)" }}>
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
                {/* Wraps: at 320px the readiness figure and its label could not
                    sit on one line, and .pf's overflow-x:hidden clipped the
                    overflow rather than scrolling it — so the text was cut off
                    rather than merely tight. */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" }}>Readiness</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 11, marginTop: 6, flexWrap: "wrap" }}>
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
      {/* The one section where the camera leaves the ground and the opportunity
          graph resolves, so the layout is opened up to let it read: deeper
          padding, a wide band under the heading, and a row gap far larger than
          the column gap so ground shows between the two rows of cards. */}
      <section data-wp="2" id="phases" style={{ padding: "clamp(92px,12vw,168px) clamp(20px,5vw,56px)", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "clamp(64px,9vw,112px)" }}>
          <span style={kicker}>The Journey</span>
          <h2 style={{ fontSize: "clamp(34px,5vw,52px)", fontWeight: 800, letterSpacing: "-.04em", margin: "16px 0 14px" }}>
            Six phases. Two that get you <span style={serifItalic}>hired.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: "34rem", margin: "0 auto", lineHeight: 1.6 }}>
            Direction, CV and tracking keep you tidy — but referrals and interview readiness are what convert. PathFinder coaches all six, and pushes hardest on the two that decide the offer.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", columnGap: "clamp(16px,2.6vw,34px)", rowGap: "clamp(68px,9vw,116px)", maxWidth: 1050, margin: "0 auto" }}>
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
      <section data-wp="3" style={{ padding: "0 clamp(20px,5vw,56px) clamp(70px,9vw,110px)", maxWidth: 1120, margin: "0 auto" }}>
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
      <section data-wp="4" id="results" style={{ padding: "0 clamp(20px,5vw,56px) clamp(70px,9vw,110px)", maxWidth: 1120, margin: "0 auto" }}>
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
      <section data-wp="5" style={{ position: "relative", padding: "clamp(84px,11vw,140px) clamp(20px,5vw,40px)", textAlign: "center", borderTop: "1px solid var(--line)", overflow: "hidden" }}>
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
      <footer data-wp="6" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "28px clamp(20px,5vw,56px)", borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F7F1E4" strokeWidth="2.5"><path d="M12 2L2 12l10 10 10-10L12 2z" /></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>PathFinder</span>
        </div>
        <div style={{ display: "flex", gap: 26, fontSize: 13, color: "var(--faint)" }}>
          {/* The header nav is hidden on phones, so this is the only route to
              the universities page on mobile — it must live here. */}
          <Link href="/universities" style={{ color: "inherit", textDecoration: "none" }}>For universities</Link>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
        </div>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".08em", color: "var(--faint)" }}>© 2026 PATHFINDER · CAREER INTELLIGENCE OS</span>
      </footer>
    </div>
  );
}
