"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { Color, Vector3 } from "three";
import { MorphingBlob } from "./MorphingBlob";
import { QuantumScholar } from "./QuantumScholar";
import { SceneEnvironment } from "./SceneEnvironment";

type SceneProps = { activeSlide: number; cursor: [number, number]; compact?: boolean };

function CameraRig({ activeSlide }: { activeSlide: number }) {
  const { camera } = useThree();
  const desired = useMemo(() => [
    new Vector3(0, 0.18, 8.5), new Vector3(.2, .32, 8.1), new Vector3(-.15, .05, 8.7), new Vector3(.35, -.1, 8.3)
  ], []);
  const target = useMemo(() => [new Vector3(0, 0, 0), new Vector3(.1, .15, 0), new Vector3(0, .15, 0), new Vector3(.75, -.05, 0)], []);
  useFrame((state, delta) => {
    camera.position.lerp(desired[activeSlide], Math.min(1, delta * 2.1));
    camera.lookAt(target[activeSlide]);
    const background = ["#080811", "#f8f7f4", "#08090c", "#050506"][activeSlide];
    state.scene.background = new Color(background);
  });
  return null;
}

/** Primary R3F stage. Every object is procedural and runs without model URLs or texture downloads. */
export default function Scene({ activeSlide, cursor, compact = false }: SceneProps) {
  // Small/touch screens use the same procedural scene at a deliberately lower pixel ratio.
  // This keeps the landing recognisable without turning a phone into a GPU benchmark.
  return <Canvas className="landing-webgl-canvas" dpr={compact ? [1, 1.2] : [1, 1.75]} camera={{ position: [0, .18, 8.5], fov: 42 }} gl={{ antialias: !compact, alpha: false, powerPreference: "high-performance" }}>
    <Suspense fallback={null}>
      <CameraRig activeSlide={activeSlide} />
      <ambientLight intensity={activeSlide === 1 ? 1.8 : .44} color={activeSlide === 1 ? "#ffffff" : "#b8a6ff"} />
      <directionalLight position={[3.5, 4.5, 4]} intensity={activeSlide === 1 ? 3.3 : 1.7} color={activeSlide === 2 ? "#ffa83d" : "#d9e5ff"} />
      <pointLight position={[-4, 1, 2]} intensity={activeSlide === 0 ? 15 : 2} color="#6836ff" distance={9} />
      <pointLight position={[3, -1, 1]} intensity={activeSlide === 0 ? 9 : 1.2} color="#26d9e9" distance={7} />
      <QuantumScholar activeSlide={activeSlide as 0 | 1 | 2 | 3} cursor={cursor} />
      <SceneEnvironment activeSlide={activeSlide} cursor={cursor} />
      <MorphingBlob active={activeSlide === 3} cursor={cursor} />
    </Suspense>
  </Canvas>;
}
