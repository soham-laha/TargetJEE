"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group, Mesh } from "three";

export type ScholarSlide = 0 | 1 | 2 | 3;

type QuantumScholarProps = {
  activeSlide: ScholarSlide;
  cursor: [number, number];
};

type SurfaceProps = { state: ScholarSlide };

function ScholarSurface({ state }: SurfaceProps) {
  if (state === 1) {
    return <meshPhysicalMaterial color="#d8e5ff" metalness={1} roughness={0.09} iridescence={1} iridescenceIOR={1.45} clearcoat={1} clearcoatRoughness={0.08} />;
  }
  if (state === 2) {
    return <meshStandardMaterial color="#12151b" metalness={0.55} roughness={0.72} emissive="#080a0d" emissiveIntensity={0.3} />;
  }
  return <meshStandardMaterial color="#b8a1ff" roughness={0.62} metalness={0.05} emissive="#26134e" emissiveIntensity={0.25} />;
}

/** Entirely procedural mentor mesh: rounded boxes, capsules, and independent animated parts. */
export function QuantumScholar({ activeSlide, cursor }: QuantumScholarProps) {
  const rig = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftEye = useRef<Mesh>(null);
  const rightEye = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const targetX = cursor[0] * 0.16;
    const targetY = cursor[1] * 0.1;
    if (rig.current) {
      rig.current.position.y += (Math.sin(time * 1.55) * 0.16 - rig.current.position.y) * Math.min(1, delta * 2.8);
      rig.current.rotation.y += ((cursor[0] * 0.22 + (hovered ? 0.1 : 0)) - rig.current.rotation.y) * Math.min(1, delta * 2.2);
      const scale = activeSlide === 3 ? 0.62 : hovered ? 1.05 : 1;
      rig.current.scale.lerp({ x: scale, y: scale, z: scale } as never, Math.min(1, delta * 3));
    }
    if (head.current) {
      head.current.rotation.x += (targetY - head.current.rotation.x) * Math.min(1, delta * 3.3);
      head.current.rotation.y += (targetX - head.current.rotation.y) * Math.min(1, delta * 3.3);
    }
    [leftEye, rightEye].forEach((eye, index) => {
      if (!eye.current) return;
      const baseX = index === 0 ? -0.34 : 0.34;
      eye.current.position.x += ((baseX + cursor[0] * 0.055) - eye.current.position.x) * Math.min(1, delta * 5);
      eye.current.position.y += ((0.07 + cursor[1] * 0.038) - eye.current.position.y) * Math.min(1, delta * 5);
    });
  });

  const eyeColor = activeSlide === 2 ? "#ffb629" : activeSlide === 1 ? "#0a44f3" : "#76f6df";

  return (
    <group ref={rig} position={[0, 0.1, 0]} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <group ref={head} position={[0, 0.55, 0]}>
        <RoundedBox args={[1.7, 1.3, 1.12]} radius={0.35} smoothness={5}>
          <ScholarSurface state={activeSlide} />
        </RoundedBox>
        <RoundedBox ref={leftEye} args={[0.52, 0.25, 0.09]} radius={0.12} smoothness={4} position={[-0.34, 0.07, 0.6]}>
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={activeSlide === 2 ? 4 : 2.1} metalness={0.2} roughness={0.2} />
        </RoundedBox>
        <RoundedBox ref={rightEye} args={[0.52, 0.25, 0.09]} radius={0.12} smoothness={4} position={[0.34, 0.07, 0.6]}>
          <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={activeSlide === 2 ? 4 : 2.1} metalness={0.2} roughness={0.2} />
        </RoundedBox>
        <RoundedBox args={[0.18, 0.5, 0.68]} radius={0.08} smoothness={4} position={[-1.04, 0.42, -0.02]} rotation={[0.1, 0.18, 0.45 + Math.sin(activeSlide) * 0.08]}>
          <ScholarSurface state={activeSlide} />
        </RoundedBox>
        <RoundedBox args={[0.18, 0.5, 0.68]} radius={0.08} smoothness={4} position={[1.04, 0.42, -0.02]} rotation={[0.1, -0.18, -0.45 - Math.sin(activeSlide) * 0.08]}>
          <ScholarSurface state={activeSlide} />
        </RoundedBox>
      </group>
      <RoundedBox args={[1.22, 0.72, 0.8]} radius={0.25} smoothness={5} position={[0, -0.65, -0.02]}>
        <ScholarSurface state={activeSlide} />
      </RoundedBox>
      <mesh position={[0, -0.66, 0.43]}>
        <circleGeometry args={[0.16, 32]} />
        <meshBasicMaterial color={eyeColor} transparent opacity={0.7} />
      </mesh>
      <group position={[-0.53, -1.39, 0]} rotation={[0.16, 0, -0.12]}>
        <RoundedBox args={[0.45, 0.22, 0.58]} radius={0.11} smoothness={4}>
          <ScholarSurface state={activeSlide} />
        </RoundedBox>
      </group>
      <group position={[0.53, -1.32, 0]} rotation={[-0.1, 0, 0.14]}>
        <RoundedBox args={[0.45, 0.22, 0.58]} radius={0.11} smoothness={4}>
          <ScholarSurface state={activeSlide} />
        </RoundedBox>
      </group>
      <pointLight color={eyeColor} intensity={activeSlide === 2 ? 3.6 : 1.3} distance={3.5} position={[0, 0.4, 1.15]} />
    </group>
  );
}
