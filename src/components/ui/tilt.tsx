"use client";

import { ReactNode, useCallback, useRef, useState } from "react";

interface TiltProps {
  children: ReactNode;
  max?: number; // max degrees
  className?: string;
  style?: React.CSSProperties;
}

/* Cursor-driven 3D perspective tilt. Pure transform/opacity — compositor-friendly. */
export function Tilt({ children, max = 9, className = "", style = {} }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setT({ rx: -py * max, ry: px * max });
    },
    [max]
  );

  const onLeave = useCallback(() => setT({ rx: 0, ry: 0 }), []);

  return (
    <div style={{ perspective: "900px" }} className={className}>
      <div
        ref={ref}
        className="tilt"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
          height: "100%",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
