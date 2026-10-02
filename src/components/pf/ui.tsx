"use client";

/**
 * PathFinder redesign — shared primitives matching the design handoff:
 * scroll reveals, count-up numbers, progress rings, panels, kickers, chips.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

/* ── Scroll reveal ─────────────────────────────────────────────────── */

/**
 * Wrapper that fades/slides its content in when scrolled into view,
 * with a small stagger based on sibling position (matches the design).
 */
export function Reveal({ children, style, className, variant = "up", as: Tag = "div" }: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Direction the content arrives from. Styling lives in pf-theme.css against
   *  the `data-reveal` value, so adding one here is a CSS change, not a prop
   *  that has to grow a style object. */
  variant?: "up" | "left" | "right" | "scale";
  as?: "div" | "section" | "span";
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      el.setAttribute("data-in", "");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const t = e.target as HTMLElement;
          const idx = t.parentNode ? Array.prototype.indexOf.call(t.parentNode.children, t) : 0;
          t.style.transitionDelay = ((idx % 6) * 60) + "ms";
          t.setAttribute("data-in", "");
          io.unobserve(t);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} data-reveal={variant === "up" ? "" : variant} className={className} style={style}>
      {children}
    </Tag>
  );
}

/* ── Count-up number ───────────────────────────────────────────────── */

/**
 * A number that counts up to `value` the first time it scrolls into view.
 *
 * The displayed number is *derived* from an eased 0..1 progress value rather
 * than pushed into state. The reduced-motion branch used to call setDisplay
 * synchronously inside the effect, which is a cascading render (and an eslint
 * error); reading the preference as external state makes it a plain
 * derivation instead.
 */
export function CountUp({ value, style, className }: { value: number; style?: CSSProperties; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduce = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reduced motion: the derived value below already shows the final number.
    if (reduce) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min((t - t0) / 1100, 1);
        setProgress(1 - Math.pow(1 - p, 3));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    // Without IntersectionObserver there is nothing to wait for — just run.
    if (!("IntersectionObserver" in window)) {
      run();
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          run();
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, reduce]);

  const display = reduce ? value : Math.round(value * progress);

  return (
    <span ref={ref} className={className} style={style}>
      {display}
    </span>
  );
}

/* ── Progress ring ─────────────────────────────────────────────────── */

/**
 * Circular progress ring. `size` is outer px; stroke and radius follow the
 * three ring sizes used in the design (46 sidebar, 56 drawer, 150 score).
 */
export function Ring({ size, value, tone, stroke, track = "var(--panel3)", children }: {
  size: number;
  value: number; // 0–100
  tone: string;
  stroke: number;
  track?: string;
  children?: ReactNode;
}) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={tone} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .8s var(--ease)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Layout primitives ─────────────────────────────────────────────── */

export function Panel({ children, style, className = "", reveal = true }: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  reveal?: boolean;
}) {
  if (!reveal) {
    return <div className={`pf-panel ${className}`} style={style}>{children}</div>;
  }
  return <Reveal className={`pf-panel ${className}`} style={style}>{children}</Reveal>;
}

export function Kicker({ children, style, color }: { children: ReactNode; style?: CSSProperties; color?: string }) {
  return <div className="pf-kicker" style={{ ...(color ? { color } : {}), ...style }}>{children}</div>;
}

/** Page heading block: mono phase label + big title + optional lede. */
export function PageHeader({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return (
    <Reveal style={{ marginBottom: 26 }}>
      <span className="pf-mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
        {label}
      </span>
      <h1 className="pf-display" style={{ fontSize: 44, margin: "10px 0 8px" }}>{title}</h1>
      {children}
    </Reveal>
  );
}

/* ── Selectable chip ───────────────────────────────────────────────── */

export function Chip({ label, on, onClick, size = "md", activeBg = "var(--accent)" }: {
  label: string;
  on: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  activeBg?: string;
}) {
  const pad = size === "sm" ? "7px 12px" : "8px 14px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <span
      onClick={onClick}
      role="button"
      className="pf-tap"
      aria-pressed={on}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{
        cursor: "pointer", whiteSpace: "nowrap", fontSize: fs, fontWeight: 600, padding: pad,
        borderRadius: size === "sm" ? 9 : 10,
        border: `1px solid ${on ? activeBg : "var(--line)"}`,
        background: on ? activeBg : "var(--panel2)",
        color: on ? "var(--onAccent)" : "var(--muted)",
        transition: "background-color .2s var(--ease), border-color .2s var(--ease), color .2s var(--ease), transform .16s cubic-bezier(.23,1,.32,1)",
        userSelect: "none",
      }}
    >
      {label}
    </span>
  );
}

/* ── Status dot / bar helpers ──────────────────────────────────────── */

export function MarkDot({ mark, bg }: { mark: string; bg: string }) {
  return (
    <span style={{ width: 18, height: 18, borderRadius: "50%", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>
      {mark}
    </span>
  );
}

export function Bar({ pct, color, height = 5 }: { pct: string; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height / 2 + 1, background: "var(--panel3)", overflow: "hidden" }}>
      <div className="pf-anim-grow" style={{ height: "100%", borderRadius: height / 2 + 1, width: pct, background: color }} />
    </div>
  );
}

/** Spinner block used by every “analyzing…” state. */
export function Scanning({ title, sub, bar = false }: { title: string; sub?: string; bar?: boolean }) {
  return (
    <div className="pf-panel" style={{ padding: "46px 30px", textAlign: "center" }}>
      <div className="pf-anim-spin" style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--panel3)", borderTopColor: "var(--accent)", margin: "0 auto 18px" }} />
      <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>{title}</div>
      {sub ? <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>{sub}</div> : null}
      {bar ? (
        <div style={{ height: 5, width: 220, margin: "0 auto", borderRadius: 3, background: "var(--panel3)", overflow: "hidden" }}>
          <div className="pf-anim-scan" style={{ height: "100%", background: "var(--accent)" }} />
        </div>
      ) : null}
    </div>
  );
}

/* ── Marks shared with the landing (src/app/landing.css) ───────────── */

/** The PathFinder diamond and serif wordmark, as on the landing's nav. */
export function BrandMark({ size = 26, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="pf-brand" style={{ fontSize: size }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M12 2L2 12l10 10 10-10z" fill="var(--accent)" />
      </svg>
      {wordmark && "PathFinder"}
    </span>
  );
}

/* The landing's faint contour lines, from the same seed so the two match. Deterministic,
   so it renders identically on the server and the client. */
const CONTOUR_PATHS = (() => {
  let s = 7;
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  return Array.from({ length: 22 }, (_, i) => {
    const y0 = 40 + i * 44, a1 = 10 + r() * 26, f1 = 0.002 + r() * 0.003, ph = r() * 6.28;
    let d = "";
    for (let x = -40; x <= 1640; x += 40) d += (x === -40 ? "M" : "L") + x + " " + (y0 + Math.sin(x * f1 + ph) * a1 + Math.sin(x * f1 * 2.7 + ph * 1.3) * a1 * 0.35).toFixed(1);
    return { d, w: i % 5 === 0 ? 1.6 : 0.8 };
  });
})();

export function Contours() {
  return (
    <div className="pf-contours" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        {CONTOUR_PATHS.map((p, i) => <path key={i} d={p.d} fill="none" stroke="currentColor" strokeWidth={p.w} />)}
      </svg>
    </div>
  );
}
