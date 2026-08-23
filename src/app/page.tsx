"use client";

/**
 * PathFinder landing — warm-paper redesign (PathFinder Landing.dc.html).
 * Paper grain, a scroll-driven terrain and route, career position report with
 * tilt, coverage marquee, six phase cards, and the one-action pitch.
 */

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

/**
 * Sample rows for the illustrative report panel. Sectors, not employers: this
 * previously named Skyscanner, FanDuel and Monzo against invented fit scores
 * of 86, 79 and 66, under a header reading "No. 074 · 08 JUL 2026". Nothing
 * marked it as a mockup, so it read as a real report asserting real numbers
 * about real companies' hiring — the same implied relationship that got the
 * university marquee removed. The panel is labelled EXAMPLE now, and the rows
 * describe a kind of employer rather than a named one.
 */
const REPORT_OPPS = [
  /* The text variants: these render as 13px numerals, where --strong and
     --warn measure 3.97:1 and 2.89:1 against the panel. */
  { company: "Travel platform", role: "SWE Intern", fit: 86, move: "Apply now", tone: "var(--strongText)" },
  { company: "Fintech scale-up", role: "Backend Intern", fit: 79, move: "Tailor & apply", tone: "var(--strongText)" },
  { company: "Health-tech startup", role: "Backend Intern", fit: 66, move: "Tailor CV", tone: "var(--warnText)" },
];

const ACTIONS = [
  { text: "Apply to 3 matched SWE internships", tag: "jobs" },
  { text: "Open a warm intro at a matched team", tag: "network" },
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

/** Header height. The bar is fixed rather than sticky: sticky positions
 *  against the nearest scrolling ancestor, and this page has three of them —
 *  the .pf-landing root plus html and body, all carrying overflow-x:hidden to
 *  keep phones from scrolling sideways. Sticky therefore anchored to a box that
 *  never scrolls and the bar rode the content away. Fixed ignores all of that;
 *  the root pads by this much to replace the flow space the bar gave up. */
const HEADER_H = 68;

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

    /** Parse a colour token to [r,g,b]. Handles `#rgb`, `#rrggbb` and
     *  `rgb()/rgba()` — between them that is every form --terrainNear, --haze
     *  and --snow take in either theme. Anything else returns the fallback
     *  rather than throwing: a token edit should degrade the haze, not blank
     *  the whole canvas. */
    type RGB = [number, number, number];
    const readRGB = (raw: string, fb: RGB): RGB => {
      const h = raw.trim();
      if (h[0] === "#") {
        const parts =
          h.length === 4 ? [h[1] + h[1], h[2] + h[2], h[3] + h[3]]
          : h.length >= 7 ? [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)]
          : null;
        if (parts) {
          const v = parts.map((x) => parseInt(x, 16));
          if (v.every(Number.isFinite)) return v as RGB;
        }
      }
      const m = h.match(/-?\d+(\.\d+)?/g);
      if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
      return fb;
    };
    const mixRGBArr = (a: RGB, b: RGB, t: number): RGB => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];

    /* Aerial perspective: how far a ridge at normalised depth d has faded into
       the sky. This is the cue every one of the reference photographs is built
       on, and the ground had none of it — each row filled with the same flat
       --bg, so sixty ridges stacked up as one undifferentiated mass and only
       the contour lines said anything about distance.

       The ramp is concave, which is the opposite of what it looks like it
       should be. PERSP compresses the far half of the world into the last
       twenty pixels below the horizon, so a convex ramp spends almost its
       whole range inside that sliver and the entire lower two-thirds of the
       frame — the part anyone actually reads as terrain — comes out one flat
       tone. Measured at the plan station with pow 1.35: 224 at the horizon
       against 217 at the bottom of the frame, a seven-value spread across the
       whole visible band. Front-loading it puts the separation where the
       ridges are. Looking down at the plan station most of the visible ground
       is close below the camera, so there is less air in the way — hence the
       pitch term. */
    /* Smooth again. Quantising this into nine bands was how the ridges were
       separated back when every one of them filled with a single flat tone and
       sixty-two of them dissolved into one wash. The hillshade separates them
       now — by which face is turned to the light, which is how they separate in
       the photographs — and the bands became visible stepping across surfaces
       that already had form. */
    /* Full range. Anything less leaves the farthest ridges carrying some of the
       near ground's weight, and the closing CTA paragraph sits on exactly that
       mid-distance band — it measured 4.48:1 at 0.95, which is the 4.5 floor to
       within rounding. */
    const HAZE_MAX = 1;
    const hazeAt = (d: number, pitch: number) =>
      Math.pow(d, 0.62) * HAZE_MAX * (1 - pitch * 0.4);

    /* How much mountain the current camera position is allowed.
     *
     * Everything that keeps this terrain low — the wide flat corridor, the tiny
     * skyline cap — exists to protect one thing: the hero copy, which is the
     * only text on the page that sits directly on the ground with no panel
     * under it. Every later station has its own panels and headings placed
     * against the layout, not against the terrain.
     *
     * Sizing the whole valley for the hero's constraint is what kept it a
     * plain for the entire scroll. These two are set once per frame from the
     * camera's distance past the trailhead: at v=0 the range stays low and the
     * corridor stays wide, and by the time the report panel is behind you the
     * mountains have their real height and the valley has closed to a corridor
     * you can see the walls of. Walking into the mountains, rather than
     * looking at the same field from further along it. */
    /* Highest the terrain may reach, in screen pixels — small y is high.
     *
     * Everything that used to keep the ground off the copy did it by making the
     * ground smaller: a low horizon, a wide flat corridor, suppressed gains.
     * That trades the whole landscape against one paragraph, and the landscape
     * kept losing. This is the same limit stated directly instead, so the range
     * can be as dense and as three-dimensional as it likes underneath it and
     * still never touch the text.
     *
     * It opens up as the camera moves off the trailhead — past the hero there
     * is no unpanelled copy sitting on the horizon, so the view widens rather
     * than the mountains growing. That is the difference the scroll is meant to
     * show: the same country from a different place, not a different country. */
    let ceilingY = 0;

    /* World relief per screen pixel, chosen once per frame.
     *
     * The ceiling alone is not enough. Relief runs to about 11 in world units
     * while a row's allowance under the ceiling is nearer 2, so every column
     * saturated the soft clamp and the range came out as a dead flat plateau
     * pinned to the ceiling — measured 506-510px across all sixteen sampled
     * columns, a variation of four pixels. This scales the whole field so its
     * tallest peak lands just under the tightest allowance in the frame, which
     * puts the shape back inside the range where the clamp is the identity.
     *
     * One scale for the whole frame, not one per row: hMax is a per-row
     * allowance, and normalising each row against its own would let a single
     * world point be a different height depending on which row happened to
     * sample it. The ground would swell and sink under the camera instead of
     * being travelled across. */
    let reliefScale = 1;

    let floorCap = 3;
    let horizonLift = 0;
    const setRange = (camV: number) => {
      const away = sm(clamp01(camV / STATIONS[1].v));
      /* Was lerp(3, …): an effectively uncapped corridor at the trailhead,
         which is what flattened the middle of the hero into a plain and left
         the mountains only at the frame edges. With a ceiling overhead the
         corridor no longer has to do the protecting, so it goes back to being
         what it is meant to be — the flat floor the route runs along. */
      /* 0.16 at the trailhead. A near row samples only ~0.54 world units of
         half-window, so a 0.55 corridor was wider than the entire row — every
         near row came out pure flat floor, and the only flanks left were the
         far ones, which the projection makes small. The corridor that matters
         is the one the route runs down, and it does not need to be wide. */
      /* Narrow: the corridor's one remaining job is to give the route flat
         ground to run along and read as a path. It used to also be the thing
         keeping terrain off the hero copy, which is why it was wide enough to
         swallow whole rows — the ceiling does that now. */
      floorCap = lerp(0.1, 0.16, away);
      horizonLift = away;
      ceilingY = lerp(copyEndY, H * 0.14, away);


    };

    /* Height above the range floor at which rock gives way to snow, in the
       same units reliefAt returns. Peaks reach a little over 3, so this puts
       the snowline high enough that only the summits carry a cap. */
    const SNOW_LINE = 2.15;

    /* Where a range rises at all. The ridged sum below has no large-scale
       structure of its own — left alone it corrugates both flanks evenly for
       the whole length of the valley, which reads as texture rather than as
       terrain. This gates it into separate massifs with open saddles between
       them, so the route passes through country that has shape. */
    /* Where a range rises at all, and how strongly.
     *
     * The u frequencies were 1.5 and 0.9 — low enough that a near row, which
     * spans about half a world unit, saw one constant value across the entire
     * foreground. The gate that is supposed to group the field into separate
     * massifs was instead applying a single multiplier to the whole front of
     * the scene, which is the same near/far split the rest of this rewrite
     * removed, hiding one level down. At 5.6 and 3.4 it turns through roughly a
     * cycle across a near row and five across a far one, so both see it vary. */
    const massif = (u: number, v: number) =>
      Math.max(0, 0.55 + Math.sin(v * 0.29 + u * 5.6) * 0.5 + Math.sin(v * 0.61 - u * 3.4) * 0.32);

    /* ── The height field ──────────────────────────────────────────────
     *
     * One generator for the whole scene. There used to be three — a swell
     * driven by lateral distance from the route, a separate term to stand a
     * range across the horizon, and a third layer of folds bolted onto the
     * foreground. All three existed for one reason: relief was defined as a
     * function of distance from the route, and a near row spans only about half
     * a world unit, so it had almost no distance to be a function of. Each term
     * was a patch for the same missing thing.
     *
     * Here the field is a plain function of position, evaluated identically at
     * every depth, and the valley is carved *into* it rather than being what
     * produces it. Near and far are the same architecture; the only thing that
     * differs is which octaves land at a readable size, which is what
     * perspective is supposed to decide.
     *
     * On the spectrum. A near row spans ±0.54 world units across the frame
     * against a far row's ±2.97, a ratio of 5.5, and the projection scales them
     * by the inverse of that — so two forms of the same *world* size land at
     * the same share of the frame when relief scales linearly with world size,
     * a Hurst exponent of 1 (persistence = 1/lacunarity = 0.483).
     *
     * That is not sufficient, and it is worth being precise about why: near and
     * far rows are not showing the same world size. The far rows show the
     * coarse octaves, the near rows the fine ones, and at H=1 the fine octaves
     * correctly carry proportionally less relief. Physically right, and it
     * renders a foreground that is smooth next to a mountainous horizon —
     * which is also what standing in a real valley looks like, and not what
     * this page wants.
     *
     * So persistence is deliberately above the parity figure. That is a
     * rougher terrain — a lower Hurst exponent, which real ranges span a wide
     * band of anyway — and it puts enough energy in the octaves the near rows
     * resolve for the front of the scene to read like the back.
     */
    const OCTAVES = 7;
    const PERSISTENCE = 0.72;

    /* How far the field's own coordinates are displaced before it is sampled.
     *
     * Bounded by folding, not by taste. The displacement's gradient is its
     * amplitude times its frequency, and once that passes 1 the coordinate map
     * folds: neighbouring columns start reading non-neighbouring parts of the
     * field, and the result is incoherent rather than merely bent. The warp
     * field below has an effective frequency near 1.16, so this stays under
     * 0.86.
     *
     * Worth recording why this is not larger. Measured on a 6x6 world patch,
     * bigger warps kept improving the numbers — the ten largest high-ground
     * components fell from an aspect of 7.49 unwarped to 1.97 at amplitude 0.9.
     * But a 6x6 patch is far-row scale. A near row samples about ±0.54, and at
     * 0.9 the map is folding hard across exactly that range: the hero flattened
     * to a pale strip while the far view improved. The measurement optimised
     * one end of the scene by breaking the other. */
    const WARP = 0.7;

    const heightField = (u: number, v: number) => {
      /* Domain warping: sample the field at a position that has itself been
       * displaced by a second, slower field.
       *
       * Measured on the un-warped field, the high ground came out as 58
       * separate components, the largest holding 19% of it inside a bounding
       * box 21 cells wide and 200 tall — the full height of the sample. Long
       * parallel corrugations that never meet. In a real range the ridgelines
       * radiate from summits and merge, so one component dominates; the
       * references are dendritic and this was not.
       *
       * Warping fixes it at the input rather than the output: the octaves are
       * unchanged, but the coordinates they read are bent, so a crease that ran
       * straight now wanders, meets its neighbour and joins. It is the standard
       * trick for exactly this and costs four sines a sample.
       *
       * Only the field is warped. The valley carve below still uses the true
       * u and v, because the route has to stay where the layout put it — bend
       * the terrain, not the path through it. */
      /* Low frequencies deliberately: displacement is what bends a ridge, and
         at these the amplitude can be large without the gradient reaching the
         folding threshold. */
      const wu = Math.sin(v * 0.6 + u * 0.35) * 0.62 + Math.sin(v * 1.1 - u * 0.7) * 0.38;
      const wv = Math.sin(u * 0.65 - v * 0.4) * 0.62 + Math.sin(u * 1.25 + v * 0.8) * 0.38;
      const su = u + wu * WARP;
      const sv = v + wv * WARP;

      let sum = 0, amp = 1, weight = 1;
      let fu = su * 4.6, fv = sv * 0.52;
      for (let o = 0; o < OCTAVES; o++) {
        const n = Math.sin(fu + fv * 0.8) * 0.62 + Math.sin(fu * 0.63 - fv * 1.27) * 0.38;
        /* Creased and squared: crests come to a point and the ground between
           them stays broad and flat. That asymmetry is what separates rock from
           water, and it is the whole reason for a ridged fractal. */
        let sig = 1 - Math.abs(n);
        sig *= sig * weight;
        sum += sig * amp;
        /* Each octave weighted by the one above it, so detail collects on the
           high ground instead of corrugating the field evenly.
         *
         * 1.4, down from 2.2. The multiplier decides how hard fine detail
         * concentrates onto what is already high, and at 2.2 it was serrating
         * the summits — the big near masses came out spiky rather than shaped.
         * Measured over a near-row-width strip, mean absolute curvature falls
         * from 37.75 to 15.21 while the tallest peak barely moves, 3.10 to
         * 3.03: the summits stay, the serration goes.
         *
         * It also lowers the bulk. Mean height against peak drops from 0.156 to
         * 0.132, so the typical ground sits further below the skyline — which
         * is the only way to make a mass read as smaller here, since
         * reliefScale normalises the tallest peak to the ceiling and would
         * simply undo a uniform reduction in gain. */
        weight = clamp01(sig * 1.4);
        amp *= PERSISTENCE;
        /* Non-integer lacunarity: at exactly 2 the octaves share zero crossings
           and the creases stack into a visible grid. */
        fu *= 2.07;
        fv *= 2.07;
      }
      /* Normalised against the series the octaves actually sum to rather than
         a fitted constant, so changing PERSISTENCE does not silently change the
         field's height as well as its roughness. */
      /* The massif gate reads the warped coordinates too. Left on the true
         ones it would draw straight boundaries across a field that no longer
         runs straight. */
      return clamp01(sum * (1 - PERSISTENCE) * 1.5) * clamp01(massif(su, sv));
    };

    /* How much of the relief the field carries against how much the valley
       walls do. The field dominates: the walls are a composition decision —
       the route runs through a valley — not a source of landform. */
    const FIELD_GAIN = 3.1;
    const WALL_GAIN = 0.5;
    /* World distance over which the flat floor becomes mountain. Short, because
       the corridor only has to be as wide as the route needs. */
    const VALLEY_EDGE = 0.085;

    const reliefRaw = (u: number, v: number, floorHalf: number) => {
      const t = outFrom(u, v, floorHalf);
      if (t <= 0) return 0;
      const c = clamp01(t / VALLEY_EDGE);
      return (heightField(u, v) * FIELD_GAIN + Math.min(t * RELIEF_RISE, RELIEF_CAP) * WALL_GAIN)
        * (c * c * (3 - 2 * c));
    };

    /* One-entry memo in front of it. The row loop needs the projected point and
       the relief at the same (u,v), and project() already computes the relief
       internally on its way to a y — so without this every sample runs the
       five-octave loop, the massif and the skyline twice. A single slot is
       enough because the two calls are consecutive — but only if the arguments
       match bit for bit, which is why the caller below re-derives d exactly the
       way project() does rather than reusing the row's own d. `camV + d*VIEW`
       then dividing back out does not necessarily return the same float. */
    let mU = NaN, mV = NaN, mF = NaN, mR = 0;
    const reliefAt = (u: number, v: number, floorHalf: number) => {
      if (u === mU && v === mV && floorHalf === mF) return mR;
      mR = reliefRaw(u, v, floorHalf);
      mU = u; mV = v; mF = floorHalf;
      return mR;
    };

    const height = (u: number, v: number, d: number, floorHalf: number, hMax: number) => {
      const relief = reliefAt(u, v, floorHalf) * (1 - d * 0.25);
      const rough =
        Math.sin(u * 7.1 + v * 3.4) * 0.16 +
        Math.sin(u * 13.7 - v * 5.2) * 0.09 +
        Math.sin(u * 3.3 + v * 1.7) * 0.12;
      /* Roughness scales with the relief, so the floor stays walkable and only
         the high ground goes craggy. Coupled at 0.34 rather than 0.5: the
         ridged relief already supplies the crags, and the old coupling on top
         of it frayed the summits into noise instead of sharpening them. */
      const raw = (relief + rough * (0.35 + relief * 0.34)) * reliefScale;
      /* tanh, not a clamp. Below about a third of hMax it is the identity to
         within a percent, so the valley floor and the lower slopes are
         untouched; above that it bends asymptotically, so a range tops out in a
         skyline instead of being sheared flat along one horizontal line. With
         reliefScale sizing the field to the frame this is now a guard that
         rarely engages, rather than the thing deciding every height. */
      /* The grain is added after the scale and the clamp, not inside them.
       *
       * reliefScale sizes the whole field to the frame, and it is set by the
       * far rows, where relief runs an order of magnitude higher than it does
       * underfoot. Folded in before it, the grain's slope was divided down with
       * everything else until the floor was optically flat again: measured, the
       * foreground carried a texture index of 0.063 against 0.183 on the far
       * ridges — a wide tonal spread built from one-unit steps, which is what
       * an unrendered smear is.
       *
       * Its amplitude is therefore in final height units and stays constant
       * with distance, so it textures the near ground, where a tenth of a unit
       * is a real slope, and is beneath notice on the far peaks, where hMax is
       * several units. */
      /* Matched to the far ranges by height, which is what was actually
         mismatched. Measured across the frame, the near forms were already the
         wider ones — 116px against 19px at the skyline — but carried an rms
         contrast of 13 against the mid band's 37. Wide and shallow: the shape
         was right and the relief was not, so this is amplitude rather than
         frequency, with the frequency eased down only enough to keep the forms
         reading as landform at the larger height. */
      /* Grain goes inside the clamp, not after it. Outside, it was free to add
         its full amplitude on top of an already-ceilinged height — harmless at
         0.09, and at 0.34 enough to push the near ridges up through the hero
         copy the ceiling exists to protect. Inside, the ceiling is the ceiling
         for everything, and grain simply compresses as the surface approaches
         it, which is what it should do. */
      return hMax * Math.tanh(raw / hMax);
    };

    /* At eye level the horizon is placed below the hero's last content row, so
       the ground never climbs into the copy; at plan view it rises to fill the
       frame. Measured rather than tuned — a constant that clears the CTAs on a
       desktop cuts through them on a phone. */
    let floorY = 0;
    /* Bottom of the hero copy, in viewport pixels. The hero sits at the top of
       the document so its layout offset is also its screen position there. */
    let copyEndY = 0;
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
      /* floorY is measured from a fixed element in the hero, so this solves the
         eye-level horizon against the hero copy — and then every later station
         inherited it, leaving a quarter-frame of ground under three quarters of
         empty sky for the whole rest of the scroll. Past the trailhead it rises
         to put the valley in the frame. Not all the way: the globe sits in the
         sky above the horizon and needs somewhere to be. */
      /* The horizon is placed inside the band the ceiling opens up, not as a
         fraction of the frame.
       *
         Sizing it against H had the two limits fighting: at H*0.70 the horizon
         sat *above* the ceiling, so every row's allowance came out negative,
         hMax collapsed and the whole range flattened into a wash. They are not
         independent — the ceiling is where the peaks stop and the horizon is
         where the flat ground vanishes behind them, so the horizon belongs
         below the ceiling by construction.
       *
         PEAK_SHARE splits the band between the two: the upper half is sky the
         peaks climb into, the lower half is the ground in front of them. Being
         a share rather than a constant, it holds on any viewport — the hero
         copy ends lower on a short window and the whole range compresses with
         it instead of inverting. */
      /* 0.68, not 0.52. The share decides how the band splits between sky the
         peaks climb into and flat ground in front of them, and at 0.52 nearly
         half the terrain was foreground floor — a lot of frame for the part of
         a landscape that has the least in it. */
      const PEAK_SHARE = 0.68;
      const heroBase = Math.min(Math.max(eye, H * 0.40), ceilingY + PEAK_SHARE * (H * 0.95 - ceilingY));
      const base = lerp(heroBase, H * 0.46, horizonLift);
      return lerp(base, H * 0.02, pitch);
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
      const dScreen = (1 - p) / (1 - pFar);
      const amp = band * lerp(1.15, 0.55, pitch) * p;
      /* The ceiling is a fixed screen line; a row's base is not, so the height
         that reaches the ceiling differs per row. Near rows start at the bottom
         of the frame and may rise a long way; rows at the horizon are already
         most of the way there and may barely rise at all. */
      const baseY = H * 0.95 - dScreen * band;
      return {
        hMax: Math.max(baseY - ceilingY, 1) / Math.max(amp, 1),
        squeeze,
        horizon,
        /* Normalised so d=1 lands exactly on the horizon. Most of the world
           depth now compresses into the top of the band — that compression is
           what reads as distance. */
        dScreen,
        /* Constant *screen* width, so the corridor flares with distance. A
           constant world width shrinks on screen as depth grows, which is what
           let far walls climb into the copy however wide the floor was set.
           Capped in world units past the trailhead: the screen form grows
           without bound as squeeze falls, so by the far end of the view the
           "corridor" covered the whole frame and there were no flanks left to
           see. floorCap only bites once the hero copy is behind the camera. */
        floorHalf: Math.min(copyHalfPx / Math.max(squeeze * W * 1.02, 1), floorCap),
        /* Deliberately larger than the band: only the floor has to stay under
           the copy, and the walls are meant to overshoot it and frame the shot. */
        amp,
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
      const h = height(u, v, d, g.floorHalf, g.hMax);
      return {
        x: (u - camU) * g.squeeze * W * 1.02 + W / 2,
        y: H * 0.95 - g.dScreen * (H * 0.95 - g.horizon) - h * g.amp,
        /* Handed back rather than discarded. The shading pass needs the height
           at each stop and at its two neighbours along the row, and every one
           of those has already been evaluated here. */
        h,
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
          /* Weighted up ~1.5x from 0.05-0.24. Alpha only: the ramp, the cell
             size and the glyph count are unchanged, so this reads as the same
             sphere a little more present rather than a denser one. */
          gctx.globalAlpha = (0.10 + Z * 0.13 + n * 0.13) * (1 + f * 2.0);
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
        /* Node tiers from the requested set. '0' is deliberately not the
           mid tier: that is the largest population of the three, and putting
           it there is what scattered zeros across the sphere before. */
        gctx.fillText(p.d > 0.66 ? "#" : p.d > 0.36 ? "^" : "-", p.sx, p.sy);
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

    /* How much screen height one unit of relief is worth, solved against the
     * ceiling.
     *
     * The ratio has to be taken per depth and then minimised — not, as it was,
     * by dividing the tightest allowance in the frame by the tallest relief in
     * the frame. Those two belong to different rows. The tightest allowance is
     * always the nearest row, because its base is the bottom of the frame and
     * the projection gives it an enormous amplitude; the tallest relief is
     * always a far row, because that is where the corridor is narrow enough to
     * leave room for a mountain. Dividing one by the other let a row that never
     * produces height dictate the scale for every row that does, which is why
     * the range kept coming out at a third of the space available however the
     * gains were set — crest variation of 30px inside a 278px band.
     *
     * Each depth now answers "what scale would put my own tallest point exactly
     * at the ceiling", and the frame takes the smallest of those answers. That
     * is the largest scale at which nothing anywhere crosses the line.
     *
     * Sampled over a fixed span of the route rather than the visible window, so
     * the answer does not shift as the camera moves — a scale that tracked the
     * view would make the ground breathe underfoot. It sits here rather than in
     * setRange because it costs about a sixth of a terrain pass, and this pass
     * is already cached against camera movement; the overlay reuses whatever
     * the last repaint settled on, which is correct precisely because a
     * skipped repaint means the camera has not moved. */
    const solveReliefScale = (pitch: number) => {
      const horizon = horizonAt(pitch);
      const band = H * 0.95 - horizon;
      const pFar = 1 / (1 + PERSP);
      let best = Infinity;
      for (let i = 0; i <= 8; i++) {
        const sd = i / 8;
        const sp = 1 / (1 + PERSP * sd);
        const dScreen = (1 - sp) / (1 - pFar);
        const amp = band * lerp(1.15, 0.55, pitch) * sp;
        const allow = Math.max(H * 0.95 - dScreen * band - ceilingY, 1);
        const sq = lerp(sp, lerp(1, 0.5, sd), pitch);
        const fh = Math.min(copyHalfPx / Math.max(sq * W * 1.02, 1), floorCap);
        const halfW = 0.54 / Math.max(sq, 0.14);
        let mx = 0.001;
        for (let k = 0; k <= 18; k++) {
          const sv = (k / 18) * ROUTE_LENGTH;
          for (let j = 0; j <= 8; j++) {
            const su = routeU(sv) - halfW + (j / 8) * 2 * halfW;
            const r = reliefRaw(su, sv, fh);
            if (r > mx) mx = r;
          }
        }
        const fit = allow / (mx * Math.max(amp, 1));
        if (fit < best) best = fit;
      }
      /* 0.95, so the tallest summit stops just short of the ceiling and the
         clamp stays out of the way — the skyline is then the terrain's own
         shape rather than the limit's. */
      reliefScale = best * 0.95;
    };

    /* Direction the sun comes from, in world axes: u across, v into the
     * screen, h up. Left and a little behind, at roughly forty degrees — the
     * standard hillshade default, and for the same reason: a light from the
     * side separates the two faces of every ridge, where a light from straight
     * ahead flattens them into one tone. Normalised at the point of use. */
    const SUN = { u: -0.62, v: 0.34, h: 0.71 };
    /* Slope exaggeration. The height field is in relief units and u in world
     * units, so the raw gradient carries no meaningful scale; this sets how
     * steep the surface reads to the light, independent of how tall it is
     * drawn. */
    const SLOPE_EXAG = 2.6;
    /* Shading samples per row. Deliberately far below COLS: the silhouette
     * needs 150 points to stay crisp, but the shading only has to be smooth,
     * and each sample costs a second height evaluation at the neighbouring
     * depth to get the gradient along v. At COLS that second evaluation would
     * roughly double an already ~10ms pass. */
    const SHADE_STOPS = 58;

    const paintTerrain = (camV: number, pitch: number) => {
      solveReliefScale(pitch);
      const cs = getComputedStyle(root);
      const ink = (cs.getPropertyValue("--fg") || "").trim() || "#382C20";
      const faint = (cs.getPropertyValue("--faint") || "").trim() || "#A08E77";
      const snow = (cs.getPropertyValue("--snow") || "").trim() || "#FBF7EE";
      const inkRGB = readRGB(ink, [56, 44, 32]);
      const faintRGB = readRGB(faint, [160, 142, 119]);

      /* Contours fade out through the middle of the frame.
       *
       * Body copy on this page is a centred column with no panel behind it, and
       * a contour crossing a paragraph is a hard dark line directly under the
       * text. Measured behind the closing CTA paragraph: line work at roughly
       * (153,143,122) over ground of (223,212,192), which dragged that
       * paragraph to 3.95:1 against a 4.5 floor — and lightening the ground
       * barely moved it, because the ground was never the problem. The sky
       * stipple above already damps itself over this same column for the same
       * reason.
       *
       * Done as a gradient stroke rather than by clipping each row twice: one
       * pass, and two gradient objects for the whole repaint instead of a
       * hundred and twenty clip operations. */
      const copyFade = (rgb: [number, number, number]) => {
        const gd = tctx.createLinearGradient(0, 0, W, 0);
        const c = (a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
        const halfPx = Math.max(copyHalfPx, 1) * 1.45;
        /* Clamped so the stops stay monotonic: on a narrow viewport the copy
           column is the whole frame, and an unclamped left stop would land past
           the centre one, which throws. */
        const l = Math.min(Math.max((W / 2 - halfPx) / W, 0), 0.49);
        const r = Math.max(Math.min((W / 2 + halfPx) / W, 1), 0.51);
        gd.addColorStop(0, c(1));
        gd.addColorStop(l, c(1));
        gd.addColorStop(0.5, c(0.1));
        gd.addColorStop(r, c(1));
        gd.addColorStop(1, c(1));
        return gd;
      };
      const inkFade = copyFade(inkRGB);
      const faintFade = copyFade(faintRGB);

      /* Parsed once per repaint rather than per row: the mix runs ROWS times
         and only the ratio changes. */
      const nearRGB = readRGB(cs.getPropertyValue("--terrainNear"), [217, 204, 180]);
      const hazeRGB = readRGB(cs.getPropertyValue("--haze"), [237, 229, 214]);
      const shadowRGB = readRGB(cs.getPropertyValue("--terrainShadow"), [154, 129, 88]);
      const litRGB = readRGB(cs.getPropertyValue("--terrainLit"), [252, 248, 237]);

      tctx.clearRect(0, 0, W, H);
      tctx.lineJoin = "round";

      const camU = routeU(camV);

      /* Fill for one ridge: aerial haze, hillshade, and the copy-column wash,
       * baked into a single horizontal gradient.
       *
       * One gradient rather than three passes because they all vary along the
       * same axis and canvas can only carry one fill per path. The stops are the
       * shading samples; between them the gradient interpolates, which is what
       * makes 34 samples enough to read as a smooth surface. */
      const shadedFill = (
        v: number, d: number, half: number, haze: number,
        rg: { floorHalf: number; hMax: number }, xs: number[], hs: number[],
      ) => {
        const gd = tctx.createLinearGradient(0, 0, W, 0);
        const base = mixRGBArr(nearRGB, hazeRGB, haze);
        const lit = mixRGBArr(base, litRGB, 0.85);
        const shadow = mixRGBArr(base, shadowRGB, 0.85);

        /* Steps in world units for the two partial derivatives. dv is a fraction
           of the row spacing so the slope it measures is the local one rather
           than an average across the gap to the next ridge. */
        const du = (2 * half) / COLS;
        const dv = (VIEW / (ROWS - 1)) * 0.5;
        const len = Math.hypot(SUN.u, SUN.v, SUN.h);
        const lu = SUN.u / len, lv = SUN.v / len, lh = SUN.h / len;

        const halfPx = Math.max(copyHalfPx, 1) * 1.1;
        for (let i = 0; i <= SHADE_STOPS; i++) {
          const c = Math.round((i / SHADE_STOPS) * COLS);
          const u = camU - half + (c / COLS) * 2 * half;

          /* Central difference across u taken from the row the silhouette pass
             already evaluated, forward difference along v from the one
             evaluation this pass still has to make. Taking all four fresh cost
             four height evaluations per stop on top of the 151 the silhouette
             had already done — roughly 24,000 a repaint against 9,400 before
             the shading existed, enough to stall the renderer under continuous
             scrolling. */
          const cL = Math.max(c - 1, 0), cR = Math.min(c + 1, COLS);
          const hL = hs[cL], hR = hs[cR], hC = hs[c];
          const hF = height(u, v + dv, d, rg.floorHalf, rg.hMax);
          const dhdu = ((hR - hL) / Math.max((cR - cL) * du, 1e-6)) * SLOPE_EXAG;
          const dhdv = ((hF - hC) / dv) * SLOPE_EXAG;

          /* n = (-dh/du, -dh/dv, 1) normalised; shade is its dot with the sun,
             clamped — a face turned past the terminator is simply unlit, not
             negatively lit. */
          const nl = Math.hypot(dhdu, dhdv, 1);
          const shade = clamp01((-dhdu * lu + -dhdv * lv + lh) / nl);
          /* Lifted off zero: a real shadowed face still receives sky light, and
             at a hard zero the dark sides read as holes cut in the page. */
          const kEnv = 0.28 + 0.72 * shade;

          let col = mixRGBArr(shadow, lit, kEnv);
          /* Haze washes the shading out with distance, because the air between
             does not care which way the rock faces. */
          col = mixRGBArr(col, mixRGBArr(nearRGB, hazeRGB, haze), haze * 0.75);
          /* And the centred copy column is carried further toward the sky again
             — the guarantee that keeps body text legible whatever the range
             does. */
          const dist = Math.abs(xs[c] - W / 2);
          const fade = clamp01(1 - dist / halfPx) * 0.5;
          col = mixRGBArr(col, hazeRGB, fade);

          gd.addColorStop(clamp01(i / SHADE_STOPS), `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`);
        }
        return gd;
      };


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

        /* Points and relief cached per row. The old code traced the row twice —
           once to fill, once to stroke — reprojecting all COLS+1 points each
           time; the snowline pass below would have made it three. Caching pays
           for the extra reliefAt call and still comes out ahead. */
        const xs: number[] = [], ys: number[] = [], rel: number[] = [], hs: number[] = [];
        for (let c = 0; c <= COLS; c++) {
          const u = camU - half + (c / COLS) * 2 * half;
          const pt = project(u, v, camV, camU, pitch);
          xs.push(pt.x);
          ys.push(pt.y);
          hs.push(pt.h);
          /* Same expression project() uses internally, so the memo slot it just
             filled is hit rather than recomputed. */
          rel.push(reliefAt(u, v, rg.floorHalf));
        }
        const trace = () => {
          tctx.beginPath();
          tctx.moveTo(xs[0], ys[0]);
          for (let c = 1; c <= COLS; c++) tctx.lineTo(xs[c], ys[c]);
        };
        const haze = hazeAt(d, pitch);
        /* How much rock this row actually crosses. Contour drawn at even weight
           over the flat corridor is the thing that made the valley floor read
           as combed sand: sixty long parallel sweeps across an otherwise
           featureless plain, which is a texture, not a surface. Weighting the
           line by the relief it describes puts it on the mountains and takes it
           off the floor — which is what a contour map does anyway. The 0.28
           floor keeps the hero's valley floor legible as ground rather than
           dropping it out entirely. */
        let relMax = 0;
        for (let c = 0; c <= COLS; c++) if (rel[c] > relMax) relMax = rel[c];
        /* Floor raised from 0.28. It was set when the near ground was a
           featureless plain, where a contour was describing nothing and sixty
           of them read as combed sand. The floor has folds now, so a line along
           each crest is describing real form — and the front rows were the only
           part of the frame with no line work at all, which is what made them
           read as a choppy mass next to the drawn ridges behind. */
        const relWeight = 0.62 + 0.38 * clamp01(relMax / 1.6);

        trace();
        tctx.lineTo(xs[COLS], H + 2);
        tctx.lineTo(xs[0], H + 2);
        tctx.closePath();
        /* Each ridge is filled a step further toward the sky than the one in
           front of it, which is what turns sixty stacked silhouettes into
           depth. The fill is opaque, so a near ridge still occludes the one
           behind it completely — the haze changes its tone, not its solidity.
         *
         * Across the copy column the ridge is also carried further toward the
         * sky than its depth alone would put it. Every text block on this page
         * that is not on a panel is a centred column, and the mountains are at
         * the frame edges by construction — so lightening the middle costs the
         * terrain nothing visible and buys the copy a floor it keeps no matter
         * what the range does. That matters more than it sounds: three separate
         * times, raising the mountains dropped the closing CTA paragraph back
         * under 4.5:1, and each time the fix was to retune the range. This
         * makes the guarantee structural instead, so the two stop trading off.
         * It reads as haze gathering in the middle of the valley, which is
         * where haze in fact gathers. */
        tctx.fillStyle = shadedFill(v, d, half, haze, rg, xs, hs);
        tctx.fill();

        /* Contours carry the surface on their own — the glyph pass that used to
           shade the ground was removed, so their weight goes back up. They fade
           with the haze too; a crisp contour on a washed-out ridge reads as a
           drawing laid over the photograph rather than as distance. */
        trace();
        tctx.strokeStyle = d > 0.62 ? faintFade : inkFade;
        /* Lighter than they were. With the bands carrying the form, contour at
           the old weight turned the whole valley into hatching — a topographic
           map laid over the mountains rather than the surface of them. */
        /* Back to a trace. This carried the foreground's line work only while
           the crest highlight could not reach it; now that the highlight runs
           along every ridge, a dark contour under it states the same geometry a
           second time and in the opposite colour, which is what made the front
           and the back look like two different drawings. */
        tctx.globalAlpha = (0.03 + (1 - d) * 0.07) * (1 - pitch * 0.25) * contrast * (1 - haze * 0.7) * relWeight;
        tctx.lineWidth = 1 + (1 - d) * 0.8;
        tctx.stroke();

        /* The lit crest line, along every ridge in the frame.
         *
         * This used to fire only where relief cleared SNOW_LINE, which meant
         * only the far ranges were ever high enough to get it — the pale line
         * that gives the back of the scene its definition simply could not
         * reach the foreground, and the front was left carrying dark contour
         * instead. Two different treatments for the same landform, and the
         * seam between them was visible.
         *
         * Physically it is a rim light rather than snow: a crest is the one
         * part of a ridge turned edge-on to a low sun, so it catches light the
         * faces below it do not. That is true of a foreground fold as much as
         * a distant summit, which is why it belongs on every row.
         *
         * Still stroked as its own pass, because a canvas stroke cannot change
         * colour partway along a path. Summits above the old snowline keep a
         * brighter, heavier line, so the far peaks still read as capped rather
         * than merely lit. */
        tctx.strokeStyle = snow;
        tctx.lineWidth = 1.1 + (1 - d) * 1.1;
        tctx.globalAlpha = 0.52 * (1 - haze * 0.4) * (1 - pitch * 0.4) * contrast;
        tctx.beginPath();
        tctx.moveTo(xs[0], ys[0]);
        for (let c = 1; c <= COLS; c++) tctx.lineTo(xs[c], ys[c]);
        tctx.stroke();

        /* Second pass over the summits only, so height still reads. */
        tctx.lineWidth = 1.9 + (1 - d) * 1.4;
        tctx.globalAlpha = 0.62 * (1 - haze * 0.45) * (1 - pitch * 0.4) * contrast;
        tctx.beginPath();
        let open = false;
        for (let c = 0; c <= COLS; c++) {
          if (rel[c] > SNOW_LINE) {
            if (open) tctx.lineTo(xs[c], ys[c]);
            else { tctx.moveTo(xs[c], ys[c]); open = true; }
          } else open = false;
        }
        tctx.stroke();
        tctx.globalAlpha = 1;
      }

    };

    /* Blit the cached terrain, repainting it only when the camera or the theme
       actually moved, then draw the live layer over it. */
    const draw = (camV: number, pitch: number, el: number) => {
      /* Before anything projects: rowGeom and skyline both read these, and the
         overlay pass projects against the same geometry as the cached terrain
         it draws on top of. Setting them here rather than inside paintTerrain
         keeps them correct on the frames where the terrain cache is reused. */
      setRange(camV);
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

    /* ── The camera, driven by ScrollTrigger ────────────────────────────
     *
     * The mapping is unchanged: the camera travels from station i to station
     * i+1 as the top of section i passes the top of the viewport, easing with
     * smoothstep inside each leg. What changed is who reads the scroll.
     *
     * The previous version resolved that mapping from scratch on every frame,
     * calling getBoundingClientRect on all seven section anchors to find their
     * document offsets. Measured on this page, those reads cost 0.033ms while
     * layout is clean — and a forced synchronous layout, which is what they
     * become if anything has written to the DOM earlier in the same frame,
     * costs 8.86ms. The page has a second rAF loop writing --pf-progress to
     * this very element tree, so whether the frame paid 0.03ms or 8.9ms came
     * down to which of the two callbacks the browser happened to run first.
     * That is not a thing to leave to chance.
     *
     * ScrollTrigger resolves the positions once per refresh — creation, resize
     * (debounced 200ms), or an explicit refresh() — and hands the frame a
     * number that is already computed. camera() becomes a property read.
     *
     * `scrub` also gives the camera a playhead that lags the scroll rather
     * than being welded to it, which is the difference between a camera and a
     * scrubber. It is deliberately small: every camera movement invalidates
     * the terrain cache, so a long scrub keeps repainting after the reader has
     * stopped, and the repaint is the expensive part of this scene.
     */
    gsap.registerPlugin(ScrollTrigger);
    /* GSAP has no smoothstep, and the easing inside each leg is not cosmetic —
       it is what stops the camera changing direction abruptly at a station. */
    gsap.registerEase("pfSmoothstep", (t: number) => t * t * (3 - 2 * t));

    const camState = { v: STATIONS[0].v, pitch: STATIONS[0].pitch };
    const camTl = gsap.timeline({ paused: true, defaults: { ease: "pfSmoothstep" } });
    let camST: ScrollTrigger | null = null;

    /* Leg durations are proportional to the scroll distance each section
       actually occupies. A single evenly-divided timeline would scrub linearly
       across the whole range and quietly detach the stations from the sections
       they were composed for — the sections are different heights. */
    const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;

    const buildCamera = () => {
      camTl.clear();
      if (anchors.length < 2) return;
      const tops = anchors.map(docTop);
      const total = Math.max(tops[tops.length - 1] - tops[0], 1);
      for (let i = 0; i < anchors.length - 1; i++) {
        const from = STATIONS[Math.min(i, STATIONS.length - 1)];
        const to = STATIONS[Math.min(i + 1, STATIONS.length - 1)];
        /* fromTo, not to: a refresh rebuilds these legs while the camera is
           mid-flight, and a plain `to` would capture whatever camState happened
           to hold at that moment as the leg's start. Each leg states both ends,
           so a rebuild cannot smear the route. immediateRender is off so
           building the timeline does not itself snap the camera to leg one. */
        camTl.fromTo(camState,
          { v: from.v, pitch: from.pitch },
          {
            v: to.v,
            pitch: to.pitch,
            duration: Math.max(tops[i + 1] - tops[i], 1) / total,
            immediateRender: false,
          });
      }
    };

    const initCamera = () => {
      if (anchors.length < 2) return;
      camST?.kill();
      buildCamera();
      camST = ScrollTrigger.create({
        animation: camTl,
        /* Numeric start/end, not "top top" against an endTrigger. The last
           anchor is the footer, whose document top (4271px, measured) sits past
           the maximum scroll (3820px) — it can never reach the top of the
           viewport, and asking ScrollTrigger to end there resolved the range to
           NaN and pinned progress at 0. Absolute scroll positions say exactly
           what the old camera meant, and an end beyond max scroll simply means
           the final station is approached but never quite arrived at, which is
           what the previous implementation also did. */
        start: () => docTop(anchors[0]),
        end: () => docTop(anchors[anchors.length - 1]),
        /* Small on purpose — see the note above about repaint cost. */
        scrub: 0.45,
        invalidateOnRefresh: true,
        onRefresh: buildCamera,
      });
    };

    /* Reduced motion is handled by freezing time, not by pinning the camera:
       scrolling is the reader's own action, so the scene should still answer
       it. Pinning here also parked them at STATIONS[2] — the plan view, pitch
       0.68 — where the terrain fills the frame and the hero copy sits over it,
       a composition the horizon guard never sizes for. */
    const camera = () => (anchors.length < 2 ? STATIONS[0] : camState);

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

      /* The line the terrain may not cross. Measured from the bottom of the
         hero paragraph rather than from the CTA row: the buttons are opaque and
         look right sitting on the ground, but the paragraph is unpanelled text
         and the range has to stop below it. Same offsetTop walk as above, for
         the same reason — the copy enters on a transform. */
      const copy = root.querySelector<HTMLElement>("[data-copy-end]");
      let cy = 0;
      for (let el: HTMLElement | null = copy; el; el = el.offsetParent as HTMLElement | null) cy += el.offsetTop;
      copyEndY = copy ? cy + copy.offsetHeight + 26 : H * 0.66;

      /* Widest hero text, not just the paragraph — the h1 runs wider than the
         copy block and walls were rising inside it. */
      let widest = 0;
      root.querySelectorAll<HTMLElement>("[data-wp='0'] h1, [data-wp='0'] p")
        .forEach((el) => { widest = Math.max(widest, el.offsetWidth); });
      /* The 0.47 clamp left 3% of the half-frame for terrain once the copy
         column had taken its share — on a 750px viewport the corridor reached
         353px of a 375px half-frame and the flanks were a 22px strip at each
         edge. 0.38 keeps the corridor under the copy at desktop widths, where
         it is the measured text width that binds anyway, and only bites where
         the frame is too narrow for both. */
      copyHalfPx = Math.min((widest || W * 0.6) / 2 + 46, W * 0.38);
      cacheValid = false;
      /* The anchors have just been re-measured, so the camera's scroll mapping
         has to be rebuilt against them. ScrollTrigger refreshes itself on
         resize, but this also runs for the observers that watch content
         changing, which it cannot know about. */
      if (camST) ScrollTrigger.refresh();
      else initCamera();
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
      camST?.kill();
      camTl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── Parallax + panel tilt ────────────────────────────────────────── */

/**
 * One pointer listener drives four things: the hero's dot-grid parallax, the
 * report panel's tilt, the spotlight wash inside whichever card the pointer is
 * over, and the magnetic pull on whichever CTA it is over.
 *
 * All four are delegated from the root rather than bound per element. That is
 * not tidiness — the spotlight needs the pointer's position *inside* the card,
 * which means a getBoundingClientRect per frame, and six cards each measuring
 * themselves on every mousemove is six forced layouts. `closest()` narrows it
 * to the one element actually under the pointer, so it stays at one.
 */
function useParallaxTilt(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const spots = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    const panel = root.querySelector<HTMLElement>("[data-tilt]");
    /* The last CTA that was pulled, so its offset can be released when the
       pointer moves off it — a magnet with no reset leaves the button parked
       off-centre for the rest of the session. */
    let magnet: HTMLElement | null = null;

    const onMove = (ev: MouseEvent) => {
      const target = ev.target as Element | null;

      const card = target?.closest?.(".pf-card") as HTMLElement | null;
      if (card) {
        const cr = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((ev.clientX - cr.left) / cr.width) * 100 + "%");
        card.style.setProperty("--my", ((ev.clientY - cr.top) / cr.height) * 100 + "%");
      }

      const cta = target?.closest?.(".pf-cta") as HTMLElement | null;
      if (cta !== magnet) {
        magnet?.style.removeProperty("--mx");
        magnet?.style.removeProperty("--my");
        magnet = cta;
      }
      if (cta) {
        const br = cta.getBoundingClientRect();
        /* Capped at 12x7px. Past roughly a sixth of the button the cursor and
           the surface it is meant to be attracting visibly separate, and the
           effect reads as lag rather than pull. */
        cta.style.setProperty("--mx", ((ev.clientX - br.left) / br.width - 0.5) * 12 + "px");
        cta.style.setProperty("--my", ((ev.clientY - br.top) / br.height - 0.5) * 7 + "px");
      }

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
      magnet?.style.removeProperty("--mx");
      magnet?.style.removeProperty("--my");
      magnet = null;
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

/* ── Scroll-linked chrome ─────────────────────────────────────────── */

/**
 * Two things that both answer "how far along the route am I": the rail across
 * the bottom of the header, and the nav link for the section you are standing
 * in. They share one source so they can never disagree.
 *
 * The rail stays live under prefers-reduced-motion. It is scroll-linked, not
 * animated — it moves only because the user moved, which is the class of
 * motion the query is meant to leave alone.
 */
function useJourneyProgress(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty("--pf-progress", String(max > 0 ? Math.min(window.scrollY / max, 1) : 0));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* Scroll-spy by observer rather than by measuring offsets on every scroll
       event: the sections are clamp()-padded and the canvas resizes them, so
       cached offsets go stale and re-measuring each frame is the expensive
       version of what the observer does for free. The margins collapse the
       viewport to a band across its middle, so "active" means the section
       under the centre of the screen, not merely one that is visible. */
    const links = Array.from(root.querySelectorAll<HTMLElement>("[data-nav]"));

    /* The observer reports only what *changed*, so the active link has to be
       derived from a running set rather than from the callback's entries. The
       first version marked on intersect and never unmarked, which left "Phases"
       lit in the hero after scrolling back to the top — the nav claimed you
       were somewhere you had already left. */
    const live = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) live.add(e.target.id);
          else live.delete(e.target.id);
        });
        links.forEach((l) => {
          if (l.dataset.nav && live.has(l.dataset.nav)) l.setAttribute("data-active", "");
          else l.removeAttribute("data-active");
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    links.forEach((l) => {
      const el = l.dataset.nav ? document.getElementById(l.dataset.nav) : null;
      if (el) io.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── Split-text entrance ──────────────────────────────────────────── */

/**
 * A line of display type where each word rides up out of its own clipping
 * box, staggered — the anime.js split-text entrance, built from one span per
 * word and a CSS custom property for the delay instead of a runtime timeline.
 *
 * The separating spaces are emitted *between* the clip boxes rather than
 * inside them, so the line still wraps on word boundaries: a space sealed
 * inside an inline-block is not a break opportunity, and the headline would
 * overflow instead of wrapping on a phone.
 */
function Words({ text, delay = 0, step = 0.055, style }: {
  text: string;
  delay?: number;
  step?: number;
  style?: CSSProperties;
}) {
  const out: ReactNode[] = [];
  text.split(" ").forEach((w, i) => {
    if (i) out.push(" ");
    out.push(
      <span key={i} className="pf-split" style={style}>
        <span style={{ "--d": delay + i * step + "s" } as CSSProperties}>{w}</span>
      </span>,
    );
  });
  return <>{out}</>;
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function Landing() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const terrainRef = useRef<HTMLCanvasElement | null>(null);
  const mode = useThemeMode();

  useTerrainRoute(terrainRef, rootRef);
  useParallaxTilt(rootRef);
  useJourneyProgress(rootRef);

  const toggleTheme = () => setTheme(mode === "dark" ? "light" : "dark");

  const navLink: CSSProperties = { color: "inherit", textDecoration: "none", padding: "8px 12px", margin: "-8px 0", borderRadius: 9, transition: "color .2s var(--ease), background .2s var(--ease)" };
  /* --accentText, not --accent: at 11px this is small text and needs 4.5:1,
     which --accent misses at 3.37:1 on paper. The large serif accents keep
     --accent — large text only needs 3:1 and they clear it. */
  const kicker: CSSProperties = { fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accentText)" };

  /* isolation:isolate on the root is load-bearing — without a stacking context
     there, the globe's z-index:-1 escapes to the root element and paints
     *behind* this div's background, i.e. invisible. */
  return (
    <div ref={rootRef} className="pf pf-landing" style={{ position: "relative", width: "100%", background: "var(--bg)", overflow: "hidden", isolation: "isolate", paddingTop: HEADER_H }}>
      {/* Neural globe — a fixed viewport layer, not a hero decoration, so it
          stays present behind every section. z-index -1 puts it above the
          page background but below all in-flow content; sections that carry
          their own --panel background (marquee, report card) occlude it,
          which is what gives the page depth. */}
      <canvas ref={terrainRef} aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: -1, pointerEvents: "none" }} />

      {/* Paper grain */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", opacity: "var(--grainOpacity)" as unknown as number, mixBlendMode: "multiply", backgroundImage: GRAIN, backgroundSize: "150px 150px" }} />

      {/* ── Nav ── */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, padding: "0 clamp(20px,4vw,56px)", borderBottom: "1px solid var(--line)", background: "color-mix(in srgb,var(--bg) 80%,transparent)", backdropFilter: "blur(12px)" }}>
        {/* How far along the route you are, carried by the chrome. The page is
            literally a walk through seven stations, so a plain scrollbar is a
            weaker answer than the journey's own progress. */}
        <div aria-hidden className="pf-rail" />
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--rim)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F7F1E4" strokeWidth="2.4"><path d="M12 2L2 12l10 10 10-10L12 2z" /></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em" }}>PathFinder</span>
        </div>
        <nav className="pf-hide-mobile" style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13.5, fontWeight: 500, color: "var(--muted)" }}>
          <a href="#product" data-nav="product" className="pf-nav-link" style={navLink}>Product</a>
          <a href="#phases" data-nav="phases" className="pf-nav-link" style={navLink}>Phases</a>
          <a href="#results" data-nav="results" className="pf-nav-link" style={navLink}>Approach</a>
          <Link href="/universities" className="pf-nav-link" style={navLink}>For universities</Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="pf-cta"
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, height: 36, padding: "0 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)", fontFamily: mono, fontSize: 11, fontWeight: 500 }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid currentColor" }} />
            {mode === "dark" ? "Paper" : "Night"}
          </button>
          <Link href="/intel" className="pf-cta" style={{ display: "flex", alignItems: "center", height: 39, padding: "0 19px", borderRadius: 11, background: "var(--fg)", color: "var(--bg)", fontSize: 13.5, fontWeight: 600, textDecoration: "none", boxShadow: "var(--rim)" }}>
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
            <span aria-hidden className="pf-breathe" style={{ color: "var(--accent)", fontSize: 13 }}>✦</span>
            AI INTERNSHIP READINESS COACH
          </div>
          {/* Word by word rather than one fade: the headline is the only type
              on the page big enough for a stagger to read as deliberate rather
              than as jank. "hired." lands last and alone, which is the whole
              sentence made visible. */}
          <h1 style={{ fontSize: "clamp(46px,8vw,92px)", lineHeight: 0.98, letterSpacing: "-.045em", fontWeight: 800, margin: "0 auto 26px", maxWidth: "16ch" }}>
            <Words text="From uncertain to" delay={0.06} />{" "}
            <span className="pf-split" style={serifItalic}>
              <span style={{ "--d": ".33s" } as CSSProperties}>hired.</span>
            </span>
          </h1>
          <p data-copy-end className="pf-anim-up" style={{ fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.6, color: "var(--fg)", opacity: 0.82, maxWidth: "40rem", margin: "0 auto 38px", animationDelay: ".12s" }}>
            For university students chasing internships. PathFinder coaches you to become genuinely ready — the referrals and interview skills that actually land offers — instead of spraying applications no one reads. Every day, it shows your one highest-leverage move.
          </p>
          <div data-horizon className="pf-anim-up" style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap", marginBottom: 14, animationDelay: ".19s" }}>
            <Link href="/start" className="pf-cta" style={{ display: "flex", alignItems: "center", gap: 9, height: 54, padding: "0 30px", borderRadius: 13, background: "var(--fg)", color: "var(--bg)", fontSize: 16, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 10px 26px rgba(56,44,32,.16),var(--rim)" }}>
              Get your baseline →
            </Link>
            {/* Ghost link, not a second button. Two filled surfaces side by
                side read as two primary actions; the rule is one. Keeps the
                54px height so the touch target still clears 44px. */}
            <a href="#phases" className="pf-ghost" style={{ display: "flex", alignItems: "center", gap: 9, height: 54, padding: "0 20px", color: "var(--fg)", fontSize: 16, fontWeight: 600, whiteSpace: "nowrap" }}>
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
        <Reveal variant="scale" style={{ position: "relative", maxWidth: 1060, margin: "0 auto" }}>
          <div data-tilt style={{ position: "relative", borderRadius: 18, border: "1px solid var(--lineStrong)", background: "var(--panelSolid)", boxShadow: "0 40px 90px rgba(56,44,32,.14),var(--rim)", overflow: "hidden", textAlign: "left", transition: "transform .3s var(--ease)" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 9, padding: "15px 20px", borderBottom: "1px dashed var(--lineStrong)", background: "var(--panel)", overflow: "hidden" }}>
              {/* A scan crossing the header, so the panel reads as a report
                  being computed rather than a screenshot of one that was. */}
              <span aria-hidden className="pf-scanline" />
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: mono, fontSize: 10.5, fontWeight: 500, letterSpacing: ".12em", color: "var(--faint)" }}>
                <span className="pf-anim-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--strong)" }} />
                CAREER POSITION REPORT
              </span>
              <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10.5, fontWeight: 600, letterSpacing: ".12em", color: "var(--accentText)" }}>EXAMPLE · SAMPLE DATA</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: 360 }}>
              <div style={{ borderRight: "1px dashed var(--lineStrong)", padding: "22px 18px", background: "var(--panel)" }}>
                <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 16 }}>Your pipeline</div>
                {PIPELINE.map((p) => (
                  <Link key={p.name} href={p.href} className="pf-pipe" style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 9, marginBottom: 2, background: p.railBg, textDecoration: "none" }}>
                    <span data-dot style={{ width: 8, height: 8, borderRadius: "50%", background: p.dot, flexShrink: 0 }} />
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
                    <div key={o.company} className="pf-oppo" style={{ display: "grid", gridTemplateColumns: "1.6fr 54px 1.2fr", gap: 10, alignItems: "center", padding: "12px 15px", borderBottom: "1px solid var(--line2)" }}>
                      <div>
                        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{o.company}</span>
                        <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{o.role}</span>
                      </div>
                      <CountUp value={o.fit} style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: o.tone }} />
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.move}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div data-float-chip style={{ position: "absolute", bottom: -24, right: -14, display: "flex", alignItems: "center", gap: 11, padding: "13px 17px", borderRadius: 14, background: "var(--fg)", color: "var(--bg)", boxShadow: "0 20px 40px rgba(56,44,32,.22)", animation: "pfFloat 5.5s ease-in-out infinite" }}>
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
      <section className="pf-marquee-wrap" style={{ marginTop: "clamp(60px,7vw,90px)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "22px 0", overflow: "hidden", position: "relative", background: "var(--panel)" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "linear-gradient(90deg,var(--panel),transparent 12%,transparent 88%,var(--panel))" }} />
        <div className="pf-marquee" style={{ display: "flex", alignItems: "center", gap: 60, width: "max-content", fontFamily: mono, fontSize: 15, fontWeight: 500, letterSpacing: ".02em", color: "var(--faint)" }}>
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
        <Reveal style={{ textAlign: "center", marginBottom: "clamp(64px,9vw,112px)" }}>
          <span style={kicker}>The Journey</span>
          <h2 style={{ fontSize: "clamp(34px,5vw,52px)", fontWeight: 800, letterSpacing: "-.04em", margin: "16px 0 14px" }}>
            Six phases. Two that get you <span style={serifItalic}>hired.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: "34rem", margin: "0 auto", lineHeight: 1.6 }}>
            Direction, CV and tracking keep you tidy — but referrals and interview readiness are what convert. PathFinder coaches all six, and pushes hardest on the two that decide the offer.
          </p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", columnGap: "clamp(16px,2.6vw,34px)", rowGap: "clamp(68px,9vw,116px)", maxWidth: 1050, margin: "0 auto" }}>
          {PHASES.map((p) => (
            <Reveal key={p.n} style={{}}>
              <Link href={p.href} style={{ display: "block", position: "relative", border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 18, padding: 28, overflow: "hidden", boxShadow: "var(--rim)", textDecoration: "none", color: "var(--fg)", height: "100%" }} className="pf-card">
                <span aria-hidden data-ghost-num style={{ position: "absolute", top: -18, right: 6, fontFamily: "var(--font-serif), 'Instrument Serif', serif", fontSize: 96, lineHeight: 1, color: "var(--fg)", opacity: 0.06, pointerEvents: "none" }}>{p.n}</span>
                <div data-icon style={{ width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accentSoft)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", color: "var(--accent)", marginBottom: 22 }}>{p.icon}</div>
                <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accentText)", marginBottom: 9 }}>{p.label}</div>
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
          <Reveal variant="left" style={{}}>
            <span style={kicker}>The core idea</span>
            <h2 style={{ fontSize: "clamp(32px,4.5vw,46px)", fontWeight: 800, letterSpacing: "-.04em", margin: "16px 0 18px", lineHeight: 1.04 }}>
              One action<br />at a <span style={serifItalic}>time.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--muted)", margin: 0 }}>
              No spreadsheet paralysis. No guessing. PathFinder reads your whole pipeline and surfaces the single highest-impact move — then the next, and the next, until the offer is signed.
            </p>
          </Reveal>
          <Reveal variant="right" style={{ position: "relative", border: "1px solid var(--lineStrong)", borderRadius: 18, overflow: "hidden", background: "var(--panelSolid)", boxShadow: "0 30px 70px rgba(56,44,32,.12),var(--rim)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "17px 20px", borderBottom: "1px dashed var(--lineStrong)", background: "var(--accentSoft)" }}>
              <span style={{ display: "flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, background: "var(--accent)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F7F1E4"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Ship a distributed-systems project</span>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: "var(--accentText)", background: "var(--accentSoft)", padding: "3px 9px", borderRadius: 6 }}>cv</span>
            </div>
            {ACTIONS.map((a) => (
              <div key={a.text} className="pf-task" style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 20px", borderBottom: "1px solid var(--line2)" }}>
                <span data-box style={{ width: 18, height: 18, borderRadius: 6, border: "1.5px solid var(--lineStrong)", flexShrink: 0 }} />
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
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={kicker}>Honest status</span>
          <h2 style={{ fontSize: "clamp(32px,4.5vw,46px)", fontWeight: 800, letterSpacing: "-.04em", margin: "16px 0 14px" }}>
            No numbers we haven&apos;t <span style={serifItalic}>earned.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: "42rem", margin: "0 auto", lineHeight: 1.6 }}>
            PathFinder is new. Rather than borrow university logos or invent testimonials, here is what it measures for you — and what we will publish once there is real data behind it.
          </p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {TRACKED.map((t) => (
            <Reveal key={t.title} className="pf-card" style={{ border: "1px solid var(--line)", borderRadius: 18, padding: 34, background: "var(--panel)", boxShadow: "var(--rim)", overflow: "hidden" }}>
              <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accentText)" }}>Tracked</div>
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
          {/* The one shimmer on the page, and it earns its place: the line
              names a process, so a gradient travelling along it reads as that
              process running. Anywhere else it would be decoration. */}
          <span className="pf-grad" style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: ".16em", textTransform: "uppercase" }}>ASSESS → ANALYSE → REPORT → OFFER</span>
          <h2 style={{ fontSize: "clamp(38px,6vw,66px)", fontWeight: 800, letterSpacing: "-.045em", margin: "20px auto 18px", maxWidth: "16ch", lineHeight: 1.02 }}>
            Stop guessing your career. Start <span style={serifItalic}>measuring</span> it.
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: "32rem", margin: "0 auto 36px", lineHeight: 1.6 }}>
            The assessment takes five minutes and builds your complete career-intelligence profile — readiness, gaps, opportunities, and your highest-leverage next move.
          </p>
          <Link href="/start" className="pf-cta" style={{ display: "inline-flex", alignItems: "center", gap: 9, height: 56, padding: "0 32px", borderRadius: 15, background: "var(--fg)", color: "var(--bg)", fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 12px 34px rgba(56,44,32,.2),var(--rim)" }}>
            Get your baseline →
          </Link>
          {/* --muted, not --faint: this line carries the pricing terms and sits on
              bare terrain with no panel under it, where --faint measured 3.86:1
              even after being darkened to clear the floor on flat paper. */}
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 18 }}>Free during early access · No credit card</p>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      {/* Opaque surface, not the page background: the terrain canvas sits at
          z-index -1 behind all in-flow content, so a transparent footer let
          contour lines and the route run straight through the links.
          --panelSolid rather than --panel because --panel is only 4% alpha in
          dark, which would have fixed light mode and left dark unchanged. */}
      <footer data-wp="6" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "28px clamp(20px,5vw,56px)", borderTop: "1px solid var(--lineStrong)", background: "var(--panelSolid)" }}>
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
