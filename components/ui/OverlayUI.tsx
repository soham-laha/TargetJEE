"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Command, FileText, GraduationCap, KeyRound, MousePointer2, Sparkles, Upload, X } from "lucide-react";
import { DragEvent, FormEvent, useRef, useState } from "react";

type OverlayUIProps = {
  activeSlide: number;
  onSelect: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onOpenByok: () => void;
};

const slides = [
  { number: "01", title: "Spatial identity" },
  { number: "02", title: "Cognitive pressure" },
  { number: "03", title: "Diagnostic engine" },
  { number: "04", title: "Initialize" }
];

function SlideOne() {
  return <section className="landing-slide-copy hero-copy">
    <div className="landing-kicker"><span /> JEE MAIN / ADVANCED · COGNITIVE SYSTEMS</div>
    <h1>Train where<br /><em>the last mark</em><br />is decided.</h1>
    <p>TargetJEE Engine turns timed questions into measurable decision traces: ability, speed, confidence, and the exact trap path behind every click.</p>
    <div className="landing-hero-actions"><Link href="/simulator" className="landing-round-cta">Initialize drill <ArrowUpRight size={17} /></Link><button className="landing-ghost-button" type="button">Explore the system <ArrowRight size={15} /></button></div>
    <div className="landing-scroll-cue"><MousePointer2 size={13} /> Scroll, swipe, or use arrow keys</div>
  </section>;
}

function SlideTwo() {
  return <section className="landing-slide-copy pressure-copy">
    <div className="landing-marquee marquee-one">COGNITIVE PRESSURE · COGNITIVE PRESSURE ·</div>
    <div className="landing-marquee marquee-two">TRAP DISTRACTORS · 3PL ABILITY · SATO ·</div>
    <div className="landing-marquee marquee-three">VAN DER LINDEN · METACOGNITION ·</div>
    <div className="pressure-copy-content"><span className="light-index">02 / HIGH-KEY MEASUREMENT</span><h2>Pressure is<br />data.</h2><p>Catch the rushed heuristic before it becomes a score. Timers calibrate to the item; time deficits remain visible in the diagnostic trace.</p></div>
    <div className="landing-bottom-badge">Digital pressure simulations that expose last-mile failure modes.</div>
  </section>;
}

function SlideThree() {
  return <section className="landing-slide-copy diagnostic-copy">
    <div className="diagnostic-title"><span>03 / COGNITIVE TRACE</span><h2>See the<br /><em>wrong route.</em></h2><p>Every distractor is a distinct evaluated misconception path—not an arbitrary answer-shaped number.</p></div>
    <div className="hud-card hud-card-equation"><span>3PL / LIVE ABILITY</span><strong>θ*(t) = θ − λ max(0, βᵢ / t − 1)</strong><i>Item-time pressure is committed alongside the response.</i></div>
    <div className="hud-card hud-card-trap"><span>TRAP PATH / OPTION C</span><strong>Pseudo-force counted twice in the non-inertial frame.</strong><i>Symbolically bounded · distinct archetype</i></div>
    <div className="landing-bottom-badge dark-badge">Engineered trap paths. Bounded SymPy symbolic verification.</div>
  </section>;
}

function readSavedInit(): { student: string; stream: "main" | "advanced" } {
  if (typeof window === "undefined") return { student: "", stream: "main" };
  try {
    const saved = window.localStorage.getItem("targetjee-engine-init");
    if (!saved) return { student: "", stream: "main" };
    const data = JSON.parse(saved) as { student?: string; stream?: "main" | "advanced" };
    return { student: data.student ?? "", stream: data.stream ?? "main" };
  } catch { return { student: "", stream: "main" }; }
}

function SlideFour({ onOpenByok }: { onOpenByok: () => void }) {
  const [student, setStudent] = useState(() => readSavedInit().student);
  const [stream, setStream] = useState<"main" | "advanced">(() => readSavedInit().stream);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const setFile = (file?: File) => { if (file) setFileName(file.name); };
  const dropFile = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); setFile(event.dataTransfer.files[0]); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem("targetjee-engine-init", JSON.stringify({ student, stream, intake: fileName, savedAt: new Date().toISOString() }));
    router.push("/simulator");
  };

  return <section className="landing-terminal-wrap">
    <form className="landing-terminal" onSubmit={submit}>
      <div className="terminal-breadcrumb"><span>INITIALIZE</span><span>/</span><b>SIMULATOR</b></div>
      <h2>Master the exam<br />under real <em>cognitive load.</em></h2>
      <p>Set the context, bring your source problem, then enter a measured CBT drill.</p>
      <label className="terminal-field"><span>STUDENT IDENTIFIER</span><input value={student} onChange={(event) => setStudent(event.target.value)} placeholder="eg. Soham or Aspirant #2028" required /></label>
      <div className="terminal-field"><span><KeyRound size={12} /> GEMINI API KEY (BYOK)</span><button className="terminal-key-button" type="button" onClick={onOpenByok}><KeyRound size={14} /> Configure key in secure popup <ArrowUpRight size={13} /></button><small className="terminal-key-note">Your key is stored only in this browser and used only when you request live extraction.</small></div>
      <div className="terminal-field stream-field"><span>TARGET STREAM</span><div className="stream-toggle"><button type="button" className={stream === "main" ? "selected" : ""} onClick={() => setStream("main")}>JEE Main <small>Speed & traps</small></button><button type="button" className={stream === "advanced" ? "selected" : ""} onClick={() => setStream("advanced")}>JEE Advanced <small>Multi-concept & rigor</small></button></div></div>
      <div className={dragging ? "upload-zone is-dragging" : "upload-zone"} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={dropFile} onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileRef.current?.click(); }}>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => setFile(event.target.files?.[0])} />
        {fileName ? <><Check size={17} /><b>{fileName}</b><span>Ready for evidence extraction</span><button type="button" className="upload-clear" onClick={(event) => { event.stopPropagation(); setFileName(""); }}> <X size={14} /></button></> : <><Upload size={17} /><b>QUESTION INTAKE</b><span>Drop a question photo or PDF · KaTeX-safe parse</span></>}
      </div>
      <button className="terminal-submit" type="submit">Launch Exam Simulator <ArrowUpRight size={18} /></button>
    </form>
    <div className="terminal-orb-copy"><span>04 / LIQUID CORE</span><strong>BYOK-ready<br />source ingestion.</strong><small>Organic procedural shader.<br />No model files. No broken assets.</small></div>
  </section>;
}

function ActiveSlide({ activeSlide, onOpenByok }: { activeSlide: number; onOpenByok: () => void }) {
  if (activeSlide === 0) return <SlideOne />;
  if (activeSlide === 1) return <SlideTwo />;
  if (activeSlide === 2) return <SlideThree />;
  return <SlideFour onOpenByok={onOpenByok} />;
}

/** DOM overlay for the canvas—navigation, slide text, and working BYOK intake. */
export function OverlayUI({ activeSlide, onSelect, onNext, onPrevious, onOpenByok }: OverlayUIProps) {
  return <div className={activeSlide === 1 ? "landing-overlay light-mode" : "landing-overlay"}>
    <header className="landing-header">
      <Link className="landing-header-mark" href="/" aria-label="TargetJEE home"><GraduationCap size={17} /><span>TARGETJEE</span></Link>
      <div className="landing-wordmark"><b>TARGETJEE</b><small>ENGINEERED COGNITIVE CBT SIMULATOR</small></div>
      <Link href="/dashboard" className="landing-dashboard-link">Dashboard <ArrowUpRight size={13} /></Link>
    </header>
    <button className="slide-arrow slide-arrow-left" aria-label="Previous landing slide" onClick={onPrevious}><ChevronLeft size={22} /></button>
    <button className="slide-arrow slide-arrow-right" aria-label="Next landing slide" onClick={onNext}><ChevronRight size={22} /></button>
    <AnimatePresence mode="wait"><motion.div key={activeSlide} className="landing-copy-stage" initial={{ opacity: 0, y: 22, filter: "blur(7px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -16, filter: "blur(7px)" }} transition={{ duration: .55, ease: [.22, 1, .36, 1] }}><ActiveSlide activeSlide={activeSlide} onOpenByok={onOpenByok} /></motion.div></AnimatePresence>
    <footer className="landing-footer">
      <div className="landing-pagination" aria-label="Landing page slides">{slides.map((slide, index) => <button key={slide.number} className={index === activeSlide ? "is-active" : ""} onClick={() => onSelect(index)} aria-label={`Go to ${slide.title}`}><span>{index === activeSlide ? "◆" : "•"}</span><em>{slide.number}</em></button>)}</div>
      <div className="landing-shortcuts"><Command size={12} /> ← / → / wheel</div>
      <span className="landing-copyright">© 2026 TARGETJEE ENGINE • BUILT FOR JEE MAIN & ADVANCED</span>
    </footer>
  </div>;
}
