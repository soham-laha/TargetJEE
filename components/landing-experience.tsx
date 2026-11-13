"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ByokKeyDialog } from "./byok-key-dialog";
import { OverlayUI } from "./ui/OverlayUI";

const Scene = dynamic(() => import("./canvas/Scene"), { ssr: false });
const SLIDE_COUNT = 4;

export function LandingExperience() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [byokOpen, setByokOpen] = useState(false);
  const [compactScene, setCompactScene] = useState(false);
  const wheelLock = useRef(false);
  const touchStart = useRef<number | null>(null);
  const next = useCallback(() => setActiveSlide((current) => Math.min(SLIDE_COUNT - 1, current + 1)), []);
  const previous = useCallback(() => setActiveSlide((current) => Math.max(0, current - 1)), []);

  useEffect(() => {
    const compactQuery = window.matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)");
    const syncSceneQuality = () => setCompactScene(compactQuery.matches);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "ArrowRight") next(); if (event.key === "ArrowLeft") previous(); };
    const onMouseMove = (event: MouseEvent) => setCursor([(event.clientX / window.innerWidth - .5) * 2, -((event.clientY / window.innerHeight - .5) * 2)]);
    syncSceneQuality();
    compactQuery.addEventListener("change", syncSceneQuality);
    window.addEventListener("keydown", onKeyDown); window.addEventListener("mousemove", onMouseMove);
    return () => { compactQuery.removeEventListener("change", syncSceneQuality); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("mousemove", onMouseMove); };
  }, [next, previous]);

  const wheel = (event: React.WheelEvent<HTMLElement>) => {
    if (wheelLock.current || Math.abs(event.deltaY) < 12) return;
    wheelLock.current = true;
    if (event.deltaY > 0) next(); else previous();
    window.setTimeout(() => { wheelLock.current = false; }, 650);
  };

  return <main className="landing-shell" onWheel={wheel} onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const start = touchStart.current; const end = event.changedTouches[0]?.clientX; if (start !== null && end !== undefined && Math.abs(end - start) > 40) { if (end < start) next(); else previous(); } touchStart.current = null; }}>
    <Scene activeSlide={activeSlide} cursor={cursor} compact={compactScene} />
    <OverlayUI activeSlide={activeSlide} onSelect={setActiveSlide} onNext={next} onPrevious={previous} onOpenByok={() => setByokOpen(true)} />
    {byokOpen && <ByokKeyDialog onClose={() => setByokOpen(false)} />}
  </main>;
}
