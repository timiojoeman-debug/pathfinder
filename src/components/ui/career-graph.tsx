"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

/*
 * Career Intelligence Network — a live 3D intelligence model, not a hero object.
 * A layered network sphere: a core cluster (you + strongest skills), a middle
 * shell (projects / experience / education), and an outer shell (opportunities /
 * companies / roles), wired into a mesh. Signal colours mark state (green strong,
 * amber opportunity, red blocked, blue active). One path is continuously
 * "analysed" — it traces blue while the rest of the network settles back.
 * Depth comes from perspective + fog; colours read live theme tokens.
 */

const mono = "var(--font-mono)";

type Palette = { bg: string; ink: string; faint: string; line: string; green: string; amber: string; red: string; blue: string };
const FALLBACK: Palette = { bg: "#ffffff", ink: "#111111", faint: "#767676", line: "#d4d4d4", green: "#0f7a3d", amber: "#9a6712", red: "#b5392b", blue: "#1f5fd1" };

type Sig = "neutral" | "strong" | "weak" | "blocked" | "active";
function sigHex(p: Palette, s: Sig): string {
  return s === "strong" ? p.green : s === "weak" ? p.amber : s === "blocked" ? p.red : s === "active" ? p.blue : p.faint;
}

function readPalette(): Palette {
  if (typeof document === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const g = (k: string, fb: string) => s.getPropertyValue(k).trim() || fb;
  return {
    bg: g("--canvas", FALLBACK.bg), ink: g("--ink", FALLBACK.ink), faint: g("--ink-3", FALLBACK.faint), line: g("--line-strong", FALLBACK.line),
    green: g("--signal-strong", FALLBACK.green), amber: g("--signal-opportunity", FALLBACK.amber), red: g("--signal-risk", FALLBACK.red), blue: g("--signal-active", FALLBACK.blue),
  };
}

/* ── deterministic network model ── */
type GNode = { p: THREE.Vector3; layer: "core" | "inner" | "outer"; sig: Sig; size: number };
type GEdge = { a: number; b: number; sig: Sig };
type Model = { nodes: GNode[]; edges: GEdge[]; innerStart: number; outerStart: number };

const R_INNER = 1.32, R_OUTER = 2.35, INNER_N = 18, OUTER_N = 46;

function golden(n: number, radius: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = ga * i;
    out.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r).multiplyScalar(radius));
  }
  return out;
}
function nearestLocal(i: number, pts: THREE.Vector3[], k: number): number[] {
  return pts.map((p, j) => ({ j, d: p.distanceTo(pts[i]) })).filter((x) => x.j !== i).sort((a, b) => a.d - b.d).slice(0, k).map((x) => x.j);
}

function buildModel(): Model {
  const nodes: GNode[] = [];
  nodes.push({ p: new THREE.Vector3(0, 0, 0), layer: "core", sig: "active", size: 0.16 }); // you
  golden(4, 0.42).forEach((p) => nodes.push({ p, layer: "core", sig: "strong", size: 0.07 })); // strongest skills
  const innerStart = nodes.length;
  const inner = golden(INNER_N, R_INNER);
  inner.forEach((p, i) => nodes.push({ p, layer: "inner", sig: i === 3 ? "strong" : i === 9 ? "weak" : "neutral", size: 0.06 }));
  const outerStart = nodes.length;
  const outer = golden(OUTER_N, R_OUTER);
  const strong = new Set([2, 17, 33]), weak = new Set([7, 24, 40]), blocked = new Set([12, 29]);
  outer.forEach((p, i) => {
    const sig: Sig = strong.has(i) ? "strong" : weak.has(i) ? "weak" : blocked.has(i) ? "blocked" : "neutral";
    nodes.push({ p, layer: "outer", sig, size: sig === "neutral" ? 0.045 : 0.08 });
  });

  const edges: GEdge[] = [];
  const seen = new Set<string>();
  const add = (a: number, b: number, sig: Sig) => { const key = a < b ? `${a}-${b}` : `${b}-${a}`; if (seen.has(key)) return; seen.add(key); edges.push({ a, b, sig }); };
  for (let i = 1; i < innerStart; i++) add(0, i, "strong"); // skill cluster → you
  const innerPts = nodes.slice(innerStart, outerStart).map((n) => n.p);
  innerPts.forEach((_, i) => {
    nearestLocal(i, innerPts, 1).forEach((j) => add(innerStart + i, innerStart + j, "neutral"));
    if (i % 3 === 0) add(innerStart + i, 0, "neutral");
  });
  const outerPts = nodes.slice(outerStart).map((n) => n.p);
  outerPts.forEach((p, i) => {
    nearestLocal(i, outerPts, 2).forEach((j) => add(outerStart + i, outerStart + j, "neutral"));
    if (i % 9 !== 0) {
      let best = -1, bd = 1e9;
      innerPts.forEach((ip, k) => { const d = ip.distanceTo(p); if (d < bd) { bd = d; best = k; } });
      if (best >= 0) add(outerStart + i, innerStart + best, nodes[outerStart + i].sig);
    }
  });
  return { nodes, edges, innerStart, outerStart };
}

type Pointer = { x: number; y: number };
type Active = { inner: number; outer: number };

function NetworkSphere({ pal, reduced, pointer, active, model }: { pal: Palette; reduced: boolean; pointer: React.RefObject<Pointer>; active: Active; model: Model }) {
  const group = useRef<THREE.Group>(null!);
  const nodesRef = useRef<THREE.InstancedMesh>(null!);
  const haloRef = useRef<THREE.InstancedMesh>(null!);
  const pathRef = useRef<THREE.Object3D | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const haloIdx = useMemo(() => model.nodes.map((_, i) => i).filter((i) => model.nodes[i].sig !== "neutral"), [model]);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(model.edges.length * 6);
    model.edges.forEach((e, i) => { const a = model.nodes[e.a].p, b = model.nodes[e.b].p; pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [model]);

  // colours depend on the theme palette — recompute on change
  useEffect(() => {
    const col = new Float32Array(model.edges.length * 6);
    const c = new THREE.Color();
    model.edges.forEach((e, i) => { c.set(e.sig === "neutral" ? pal.line : sigHex(pal, e.sig)); for (let k = 0; k < 2; k++) { col[i * 6 + k * 3] = c.r; col[i * 6 + k * 3 + 1] = c.g; col[i * 6 + k * 3 + 2] = c.b; } });
    lineGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    (lineGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }, [lineGeo, model, pal]);

  useEffect(() => {
    const m = nodesRef.current, h = haloRef.current;
    if (!m) return;
    const c = new THREE.Color();
    model.nodes.forEach((n, i) => {
      dummy.position.copy(n.p); dummy.scale.setScalar(n.size); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      c.set(n.sig === "neutral" ? pal.faint : sigHex(pal, n.sig));
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (h) {
      haloIdx.forEach((idx, j) => {
        const n = model.nodes[idx];
        dummy.position.copy(n.p); dummy.scale.setScalar(n.size * 2.7); dummy.updateMatrix();
        h.setMatrixAt(j, dummy.matrix);
        c.set(sigHex(pal, n.sig)); h.setColorAt(j, c);
      });
      h.instanceMatrix.needsUpdate = true;
      if (h.instanceColor) h.instanceColor.needsUpdate = true;
    }
  }, [model, pal, dummy, haloIdx]);

  const pathPts = useMemo(() => {
    const a = model.nodes[0].p, mid = model.nodes[active.inner].p, end = model.nodes[active.outer].p;
    return [[a.x, a.y, a.z], [mid.x, mid.y, mid.z], [end.x, end.y, end.z]] as [number, number, number][];
  }, [model, active]);

  useFrame((state, delta) => {
    const g = group.current;
    if (g) {
      const p = pointer.current;
      const targetX = (p ? p.y : 0) * 0.12;
      g.rotation.x += (targetX - g.rotation.x) * 0.04;
      if (!reduced) g.rotation.y += delta * 0.035;
    }
    if (pathRef.current && !reduced) {
      const mat = (pathRef.current as unknown as { material?: { opacity: number; transparent: boolean } }).material;
      if (mat) { mat.transparent = true; mat.opacity = 0.45 + Math.sin(state.clock.elapsedTime * 2.6) * 0.35; }
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} />
      </lineSegments>

      <instancedMesh ref={nodesRef} args={[undefined, undefined, model.nodes.length]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* signal halos — additive, so they only read as a soft LED glow on dark surfaces */}
      <instancedMesh ref={haloRef} args={[undefined, undefined, haloIdx.length]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>

      {/* the path under active analysis */}
      <Line ref={pathRef as never} points={pathPts} color={pal.blue} lineWidth={2} transparent opacity={0.7} />
    </group>
  );
}

const ANALYSES = [
  { label: "Bloomberg — SWE Intern", gap: "System Design", gain: "+8 Readiness" },
  { label: "Stripe — SWE Intern", gap: "Distributed Systems", gain: "+6 Readiness" },
  { label: "Vercel — Frontend Intern", gap: "None — ready to apply", gain: "+4 Readiness" },
];

export function CareerGraph() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [pal, setPal] = useState<Palette>(FALLBACK);
  const [aIdx, setAIdx] = useState(0);
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const model = useMemo(buildModel, []);

  // active-analysis paths reference real nodes so the blue trace lands on signal nodes
  const paths = useMemo<Active[]>(() => [
    { inner: model.innerStart + 3, outer: model.outerStart + 2 },
    { inner: model.innerStart + 9, outer: model.outerStart + 17 },
    { inner: model.innerStart + 1, outer: model.outerStart + 33 },
  ], [model]);

  useEffect(() => {
    setMounted(true);
    setPal(readPalette());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onReduced = () => setReduced(mq.matches);
    const onTheme = () => setPal(readPalette());
    mq.addEventListener("change", onReduced);
    window.addEventListener("pf:theme", onTheme);
    const onMove = (e: PointerEvent) => { pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 }; };
    window.addEventListener("pointermove", onMove, { passive: true });
    // R3F can capture a 0-size parent if the grid lays out after mount — nudge a re-measure.
    const raf = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    const t = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
    const iv = window.setInterval(() => setAIdx((i) => (i + 1) % ANALYSES.length), 4200);
    return () => {
      mq.removeEventListener("change", onReduced);
      window.removeEventListener("pf:theme", onTheme);
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(iv);
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, []);

  if (!mounted) return null;
  const a = ANALYSES[aIdx];

  let canvas: React.ReactNode = null;
  try {
    canvas = (
      <Canvas dpr={[1, 1.6]} frameloop={reduced ? "demand" : "always"} camera={{ position: [0, 0, 6], fov: 46 }} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}>
        <fog attach="fog" args={[pal.bg, 4.6, 9.2]} />
        <Suspense fallback={null}>
          <NetworkSphere pal={pal} reduced={reduced} pointer={pointer} active={paths[aIdx]} model={model} />
        </Suspense>
      </Canvas>
    );
  } catch {
    canvas = null;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {canvas}
      {/* Active-analysis readout — terminal label, not a tooltip */}
      <div style={{ position: "absolute", top: "16px", right: "18px", textAlign: "right", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end", marginBottom: "7px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--signal-active)", boxShadow: "var(--glow-active)", animation: "livePulse 2s ease-in-out infinite" }} />
          <span style={{ fontFamily: mono, fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--ink-3)" }}>ACTIVE ANALYSIS</span>
        </div>
        <div style={{ fontFamily: mono, fontSize: "12.5px", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.01em" }}>{a.label}</div>
        <div style={{ marginTop: "9px", display: "grid", gap: "4px" }}>
          <span style={{ fontFamily: mono, fontSize: "9.5px", color: "var(--ink-3)", letterSpacing: "0.06em" }}>CRITICAL GAP · <span style={{ color: "var(--signal-risk)" }}>{a.gap}</span></span>
          <span style={{ fontFamily: mono, fontSize: "9.5px", color: "var(--ink-3)", letterSpacing: "0.06em" }}>PROJECTED GAIN · <span style={{ color: "var(--signal-strong)" }}>{a.gain}</span></span>
        </div>
      </div>
    </div>
  );
}
