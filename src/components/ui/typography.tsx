"use client";

import { useState, useEffect, ReactNode } from "react";
import { useReveal } from "./hooks";

/* ═══════════════════════════════════════════════════════════════
   WORD-BY-WORD REVEAL
   ═══════════════════════════════════════════════════════════════ */
export function WordReveal({ text, delay = 0, className = "", style = {} }: { text: string; delay?: number; className?: string; style?: React.CSSProperties }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const words = text.split(" ");
  return (
    <span className={className} style={{ display: "inline", ...style }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0)" : "translateY(14px)",
            transition: `all 0.5s cubic-bezier(0.25,1,0.5,1) ${i * 50}ms`,
            marginRight: "0.3em",
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATED LINE (progress bar that fills on reveal)
   ═══════════════════════════════════════════════════════════════ */
export function AnimBar({ width, delay = 0 }: { width: number; delay?: number }) {
  const [ref, vis] = useReveal(0.5);
  return (
    <div
      ref={(el) => {
        // @ts-ignore
        if (ref) ref.current = el;
      }}
      style={{ height: "2px", borderRadius: "1px", background: "var(--c-100)", overflow: "hidden" }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: "1px",
          background: "var(--c-900)",
          width: vis ? `${width}%` : "0%",
          transition: `width 0.8s cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRIMITIVES 
   ═══════════════════════════════════════════════════════════════ */
export function Mono({ children, style = {}, className = "" }: { children: ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--c-400)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Tag({ children, className="" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`tag-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        borderRadius: "8px",
        border: "1px solid var(--c-150)",
        background: "var(--c-white)",
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--c-500)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.03em",
      }}
    >
      {children}
    </span>
  );
}

export function Section({ children, id, style = {}, className="" }: { children: ReactNode; id?: string; style?: React.CSSProperties; className?: string }) {
  return (
    <section
      id={id}
      className={className}
      style={{
        maxWidth: "1060px",
        margin: "0 auto",
        padding: "clamp(80px, 11vw, 148px) 24px",
        position: "relative",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function Heading({ children, sub, center = false }: { children: ReactNode; sub?: string; center?: boolean }) {
  const [ref, vis] = useReveal();
  return (
    <div
      ref={(el) => {
        // @ts-ignore
        if (ref) ref.current = el;
      }}
      style={{
        textAlign: center ? "center" : "left",
        marginBottom: "clamp(48px, 5vw, 64px)",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(18px)",
        transition: "all 0.6s cubic-bezier(0.25,1,0.5,1)",
      }}
    >
      <h2
        style={{
          fontSize: "clamp(28px, 3.8vw, 44px)",
          fontWeight: 500,
          color: "var(--c-900)",
          lineHeight: 1.15,
          letterSpacing: "-0.03em",
          marginBottom: sub ? "14px" : 0,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: "clamp(15px, 1.5vw, 16.5px)",
            color: "var(--c-400)",
            lineHeight: 1.65,
            maxWidth: "460px",
            margin: center ? "0 auto" : undefined,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
