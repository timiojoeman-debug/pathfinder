"use client";

import { useEffect, useRef } from "react";

export function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W: number, H: number, cols: number, rows: number;
    const spacing = 28;
    const baseR = 0.8;
    const maxR = 4;
    const influence = 160;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      cols = Math.ceil(W / spacing) + 1;
      rows = Math.ceil(H / spacing) + 1;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => {
      mouse.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    canvas.addEventListener("mouseleave", onLeave);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const isDark = document.documentElement.classList.contains('dark');
      const dotColor = isDark ? '255,255,255' : '0,0,0';
      const mx = mouse.current.x,
        my = mouse.current.y;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing,
            y = j * spacing;
          const dx = x - mx,
            dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = Math.max(0, 1 - dist / influence);
          const r = baseR + (maxR - baseR) * t * t;
          const alpha = 0.06 + t * 0.4;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${dotColor},${alpha})`;
          ctx.fill();
        }
      }
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
