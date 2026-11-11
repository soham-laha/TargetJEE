"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CanvasTexture, CatmullRomCurve3, Color, QuadraticBezierCurve3, Vector3 } from "three";
import type { Group, Mesh } from "three";

function Ribbon({ color, offset }: { color: string; offset: number }) {
  const group = useRef<Group>(null);
  const curve = useMemo(() => new CatmullRomCurve3([
    new Vector3(-3.3, -0.9 + offset, -1.1), new Vector3(-1.3, 1.7 - offset * 0.4, 0.35),
    new Vector3(0.4, -0.7 - offset, 0.9), new Vector3(2.8, 1.12 + offset, -0.45), new Vector3(3.6, -0.7 + offset, -0.85)
  ], false, "centripetal"), [offset]);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.28 + offset) * 0.18; });
  return <group ref={group}><mesh><tubeGeometry args={[curve, 160, 0.038, 12, false]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.55} metalness={0.35} roughness={0.22} /></mesh></group>;
}

function LetterTexture({ letter }: { letter: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, 256, 256);
      context.font = "800 190px Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#f3edff";
      context.shadowColor = "#6a39ff";
      context.shadowBlur = 18;
      context.fillText(letter, 128, 142);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = "srgb";
    return result;
  }, [letter]);
  return <meshStandardMaterial map={texture} color="#4c2b89" emissive="#3b1571" emissiveIntensity={0.82} metalness={0.38} roughness={0.26} />;
}

function FloatingLetter({ letter, position, speed }: { letter: string; position: [number, number, number]; speed: number }) {
  const mesh = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();
    mesh.current.rotation.x = time * speed * 0.22;
    mesh.current.rotation.y = time * speed * 0.35;
    mesh.current.position.y = position[1] + Math.sin(time * speed + position[0]) * 0.16;
  });
  return <mesh ref={mesh} position={position}><boxGeometry args={[0.6, 0.76, 0.13]} /><LetterTexture letter={letter} /></mesh>;
}

function PerspectiveGrid() {
  const material = useMemo(() => ({
    uniforms: { uColor: { value: new Color("#7258ff") } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "uniform vec3 uColor; varying vec2 vUv; void main(){ vec2 g=abs(fract(vUv*vec2(18.,26.))-.5); float line=1.-smoothstep(.44,.5,max(g.x,g.y)); float fade=(1.-vUv.y)*.8+.1; gl_FragColor=vec4(uColor,line*fade*.72); }"
  }), []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, -1.7]}><planeGeometry args={[15, 14, 1, 1]} /><shaderMaterial transparent depthWrite={false} {...material} /></mesh>;
}

function AbstractGeometry() {
  const cube = useRef<Mesh>(null);
  const knot = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (cube.current) cube.current.rotation.set(time * .23, time * .3, time * .1);
    if (knot.current) knot.current.rotation.set(time * .2, -time * .25, time * .14);
  });
  return <group>
    <mesh ref={cube} position={[-3.25, 1.55, -1.1]}><boxGeometry args={[.65, .65, .65]} /><meshPhysicalMaterial color="#151625" metalness={.8} roughness={.16} clearcoat={1} /></mesh>
    <mesh position={[3.2, .85, -.9]}><sphereGeometry args={[.44, 32, 32]} /><meshStandardMaterial color="#8ee0c4" roughness={.55} /></mesh>
    <mesh ref={knot} position={[-2.85, -1.05, -.35]}><torusKnotGeometry args={[.38, .12, 100, 12]} /><meshPhysicalMaterial color="#cdc3ff" metalness={1} roughness={.12} /></mesh>
  </group>;
}

function Refractors() {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * .15; });
  return <group ref={ref}>
    <mesh position={[-2.9, 1.25, -1]} rotation={[.8, 0.3, 0]}><torusGeometry args={[.55, .12, 22, 64]} /><meshPhysicalMaterial color="#b7d5ff" transmission={.75} transparent opacity={.8} roughness={.04} metalness={.15} iridescence={1} /></mesh>
    <mesh position={[2.65, -.85, -.4]} rotation={[.25, .55, .2]}><octahedronGeometry args={[.65, 1]} /><meshPhysicalMaterial color="#ffe4f7" transmission={.58} transparent opacity={.75} roughness={.08} iridescence={1} /></mesh>
    <mesh position={[2.8, 1.75, -1.5]}><torusGeometry args={[.3, .08, 16, 48]} /><meshPhysicalMaterial color="#8187ff" transmission={.7} transparent opacity={.78} roughness={.06} /></mesh>
  </group>;
}

function Cable({ index, cursor }: { index: number; cursor: [number, number] }) {
  const cable = useRef<Group>(null);
  const curve = useMemo(() => {
    const x = -3.4 + index * 1.08;
    return new QuadraticBezierCurve3(new Vector3(x, 3.5, -1.0), new Vector3(x + (index % 2 ? .35 : -.35), .65, -.15), new Vector3(x + .2, 1.05 + (index % 3) * .24, .5));
  }, [index]);
  useFrame(({ clock }) => { if (cable.current) cable.current.rotation.z = Math.sin(clock.getElapsedTime() * .68 + index) * .035 + cursor[0] * .03; });
  return <group ref={cable}><mesh><tubeGeometry args={[curve, 36, .026, 7, false]} /><meshStandardMaterial color="#3a4049" metalness={.5} roughness={.38} /></mesh><mesh position={[curve.v2.x, curve.v2.y, curve.v2.z]}><sphereGeometry args={[.075, 12, 12]} /><meshStandardMaterial color="#ffad33" emissive="#f08b20" emissiveIntensity={.9} /></mesh></group>;
}

/** Procedural world: custom grid shader, mathematical curves, cable curves, canvas-letter solids. */
export function SceneEnvironment({ activeSlide, cursor }: { activeSlide: number; cursor: [number, number] }) {
  const letterData: Array<[string, [number, number, number], number]> = [
    ["T", [-3.3, .55, -1.25], .5], ["A", [-2.25, 1.55, -.4], .4], ["R", [-1.75, -1.2, -.7], .6], ["G", [1.75, 1.55, -.5], .45], ["E", [2.95, .5, -1.1], .55], ["T", [2.3, -1.32, -.65], .5], ["J", [-.95, 1.95, -1], .6], ["E", [.78, 1.75, -1.15], .55], ["E", [3.45, -1.15, -1.4], .4]
  ];
  return <>
    <group visible={activeSlide === 0}><PerspectiveGrid /><AbstractGeometry /><Ribbon color="#25d7ff" offset={0.05} /><Ribbon color="#ff38bb" offset={-.22} />{letterData.map(([letter, position, speed], index) => <FloatingLetter key={`${letter}-${index}`} letter={letter} position={position} speed={speed} />)}</group>
    <group visible={activeSlide === 1}><Refractors /></group>
    <group visible={activeSlide === 2}>{Array.from({ length: 7 }, (_, index) => <Cable key={index} index={index} cursor={cursor} />)}</group>
  </>;
}
