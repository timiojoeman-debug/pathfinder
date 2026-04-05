"use client";

import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const count = 80;

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 10,
        ] as [number, number, number],
        speed: [
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.001,
        ] as [number, number, number],
        scale: 0.02 + Math.random() * 0.04,
      });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      p.position[0] += p.speed[0];
      p.position[1] += p.speed[1];
      p.position[2] += p.speed[2];

      // Wrap around boundaries
      if (p.position[0] > 10) p.position[0] = -10;
      if (p.position[0] < -10) p.position[0] = 10;
      if (p.position[1] > 7) p.position[1] = -7;
      if (p.position[1] < -7) p.position[1] = 7;
      if (p.position[2] > 5) p.position[2] = -5;
      if (p.position[2] < -5) p.position[2] = 5;

      // Depth-based scale: further away (larger z) = smaller
      const depthFactor = 1 - (p.position[2] + 5) / 10; // 0 to 1
      const s = p.scale * (0.5 + depthFactor * 0.5);

      dummy.position.set(p.position[0], p.position[1], p.position[2]);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Depth-based opacity via vertex colors
  const colors = useMemo(() => {
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const depthFactor = 1 - (particles[i].position[2] + 5) / 10;
      const intensity = 0.1 + depthFactor * 0.1; // 0.1 to 0.2
      c[i * 3] = intensity;
      c[i * 3 + 1] = intensity;
      c[i * 3 + 2] = intensity;
    }
    return c;
  }, [particles]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#0a0a0a" transparent opacity={0.15} />
    </instancedMesh>
  );
}

export default function ParticleField() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!visible) return null;

  try {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <Suspense fallback={null}>
          <Canvas
            camera={{ position: [0, 0, 8], fov: 50 }}
            style={{ pointerEvents: "none" }}
            gl={{ antialias: false, alpha: true }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <Particles />
          </Canvas>
        </Suspense>
      </div>
    );
  } catch {
    return null;
  }
}
