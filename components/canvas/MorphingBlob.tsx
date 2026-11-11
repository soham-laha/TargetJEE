"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, ShaderMaterial, Vector2 } from "three";
import type { Mesh } from "three";

type MorphingBlobProps = {
  active: boolean;
  cursor: [number, number];
};

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
float hash(vec3 p) { p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0.,0.,0.)), hash(i + vec3(1.,0.,0.)), f.x), mix(hash(i + vec3(0.,1.,0.)), hash(i + vec3(1.,1.,0.)), f.x), f.y), mix(mix(hash(i + vec3(0.,0.,1.)), hash(i + vec3(1.,0.,1.)), f.x), mix(hash(i + vec3(0.,1.,1.)), hash(i + vec3(1.,1.,1.)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float value = 0.0; float amplitude = .5; for (int i = 0; i < 4; i++) { value += amplitude * noise(p); p *= 2.02; amplitude *= .52; } return value; }
void main() {
  float n = fbm(normal * 2.2 + vec3(0., uTime * .35, uTime * .18));
  vec3 displaced = position + normal * (n - .45) * .5;
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec2 uCursor;
uniform vec3 uGold;
uniform vec3 uViolet;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
void main() {
  vec3 normal = normalize(vNormalW);
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.7);
  float ripple = sin(vWorldPosition.y * 3.4 + uTime * 1.5 + uCursor.x * 2.0) * .5 + .5;
  vec3 color = mix(uGold, uViolet, clamp(fresnel * .74 + ripple * .22, 0., 1.));
  color += vec3(.25, .16, .48) * fresnel;
  gl_FragColor = vec4(color, .96);
}`;

/** Custom vertex/fragment shader liquid core; no downloaded geometry or textures. */
export function MorphingBlob({ active, cursor }: MorphingBlobProps) {
  const material = useRef<ShaderMaterial>(null);
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCursor: { value: new Vector2() },
    uGold: { value: new Color("#ffa646") },
    uViolet: { value: new Color("#804cff") }
  }), []);

  useFrame(({ clock }, delta) => {
    if (material.current) {
      material.current.uniforms.uTime.value = clock.getElapsedTime();
      material.current.uniforms.uCursor.value.lerp(new Vector2(cursor[0], cursor[1]), Math.min(1, delta * 3.5));
    }
    if (mesh.current) {
      mesh.current.rotation.y += delta * (active ? 0.28 : 0.08);
      mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.38) * 0.14;
      const scale = active ? 1 : 0.72;
      mesh.current.scale.lerp({ x: scale, y: scale, z: scale } as never, Math.min(1, delta * 3));
    }
  });

  return (
    <group position={[2.6, -0.05, 0]}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.48, 5]} />
        <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent />
      </mesh>
      <pointLight color="#a959ff" intensity={active ? 4 : 0.5} distance={5} />
    </group>
  );
}
