"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import {
  AlarmClock, ArrowLeft, ArrowRight, BarChart3, BookOpenCheck, BrainCircuit,
  Check, ChevronDown, CircleAlert, Clock3, FileText, Flag,
  Gauge, ImageUp, Info, KeyRound, Menu, MoreHorizontal, Play, RotateCcw, ScanLine,
  ShieldCheck, Shuffle, Sparkles, TimerReset, Upload, X, Zap
} from "lucide-react";
import { ByokKeyDialog, getByokExtractionHeaders } from "@/components/byok-key-dialog";
import { DEMO_QUESTIONS } from "@/lib/questions";
import {
  brierScore, calibratedSeconds, estimateTheta, expectedCalibrationError, fitVanDerLindenSpeed,
  formatTheta, nrmProbabilities, pressureAdjustedTheta, satoPenalty, timePressureLabel, timerPressureAbility
} from "@/lib/psychometrics";
import type { Attempt, Question, QuestionStatus } from "@/lib/types";

const initialAttempts = (): Record<string, Attempt> => Object.fromEntries(
  DEMO_QUESTIONS.map((question, index) => [question.id, {
    questionId: question.id,
    confidence: 0.7,
    confidenceReported: false,
    responseSeconds: 0,
    extensionsSeconds: 0,
    timeDeficits: [],
    // The opening question is visited at session creation; later items become visited in moveTo.
    status: (index === 0 ? "unanswered" : "not-visited") as QuestionStatus
  }])
);

type ExtractionPreview = {
  rawText: string;
  normalizedLatex: string;
  mathBlocks: string[];
  tags: string[];
  classification: {
    subject: "Physics" | "Chemistry" | "Mathematics";
    chapter: string;
    topic: string;
    targetLevel: "JEE Main" | "JEE Advanced";
    confidence: number;
    evidence: string;
  };
  coordinateDiagram: {
    description: string;
    xLabel: string;
    yLabel: string;
    points: Array<{ label: string; x: number; y: number }>;
  };
  source: "vision" | "local-preview";
};

const optionLetter = (displayIndex: number) => String.fromCharCode(65 + displayIndex);

/** A session owns this permutation; it is never regenerated while an attempt is active. */
function createOptionOrder(): Record<string, string[]> {
  return Object.fromEntries(DEMO_QUESTIONS.map((question) => {
    const ids = question.options.map((option) => option.id);
    for (let index = ids.length - 1; index > 0; index--) {
      const random = typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
        : Math.random();
      const swapIndex = Math.floor(random * (index + 1));
      [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    }
    return [question.id, ids];
  }));
}

function localExtractionPreview(file: File): ExtractionPreview {
  return {
    rawText: "A small block of mass m is held at rest at radius r on a smooth horizontal turntable rotating with constant angular speed omega. It is moved slowly outward to radius 2r by an agent, remaining at rest relative to the turntable. Find the work done by the agent in the inertial frame.",
    normalizedLatex: "\\text{A small block of mass }m\\text{ moves from }r\\text{ to }2r\\text{ on a turntable with angular speed }\\omega.\\; W_{\\mathrm{agent}} = ?",
    mathBlocks: ["v(x)=\\omega x", "K(x)=\\frac{1}{2}m\\omega^2x^2", "W_{\\mathrm{agent}}=\\int_r^{2r}m\\omega^2x\\,dx"],
    tags: ["Physics", "Rotational Motion", "JEE Advanced"],
    classification: {
      subject: "Physics",
      chapter: "Rotational Motion",
      topic: "Work-energy in a rotating frame",
      targetLevel: "JEE Advanced",
      confidence: 0.92,
      evidence: "Turntable, angular-speed, radius, and inertial-frame evidence detected."
    },
    coordinateDiagram: {
      description: `Coordinate anchors inferred from ${file.name}: radial displacement on a horizontal plane.`,
      xLabel: "radial x", yLabel: "tangential y",
      points: [{ label: "r", x: 28, y: 68 }, { label: "2r", x: 76, y: 68 }]
    },
    source: "local-preview"
  };
}

function InlineMath({ text }: { text: string }) {
  const parts = text.split(/(\\\([\s\S]*?\\\))/g);
  return <>{parts.map((part, index) => {
    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      const expression = part.slice(2, -2);
      const html = katex.renderToString(expression, { throwOnError: false, displayMode: false });
      return <span className="inline-katex" key={index} dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <span key={index}>{part}</span>;
  })}</>;
}

function Latex({ expression, display = false }: { expression: string; display?: boolean }) {
  const html = katex.renderToString(expression, { throwOnError: false, displayMode: display });
  return <span className={display ? "display-katex" : "inline-katex"} dangerouslySetInnerHTML={{ __html: html }} />;
}

function secondsToClock(value: number) {
  const safe = Math.max(0, Math.ceil(value));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function StatusDot({ status }: { status: QuestionStatus }) {
  if (status === "answered" || status === "answered-marked") return <Check size={12} strokeWidth={3} />;
  if (status === "marked") return <Flag size={11} fill="currentColor" />;
  return null;
}

function statusName(status: QuestionStatus) {
  return ({
    "not-visited": "Not visited",
    unanswered: "Not answered",
    answered: "Answered",
    marked: "Marked for review",
    "answered-marked": "Answered & marked"
  })[status];
}

function subjectColor(subject: Question["subject"]) {
  return subject === "Physics" ? "blue" : subject === "Chemistry" ? "orange" : "violet";
}

export function TargetJeeEngine() {
  const [view, setView] = useState<"simulator" | "ingest" | "method">("simulator");
  const [activeIndex, setActiveIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>(initialAttempts);
  const [remaining, setRemaining] = useState<Record<string, number>>(() => Object.fromEntries(DEMO_QUESTIONS.map((q) => [q.id, calibratedSeconds(q)])));
  // Start deterministically for hydration, then lock a cryptographically shuffled order after mount.
  const [optionOrder, setOptionOrder] = useState<Record<string, string[]>>(() => Object.fromEntries(DEMO_QUESTIONS.map((q) => [q.id, q.options.map((option) => option.id)])));
  const [running, setRunning] = useState(true);
  const [graceOpen, setGraceOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parserState, setParserState] = useState<"idle" | "reading" | "complete">("idle");
  const [extraction, setExtraction] = useState<ExtractionPreview | null>(null);
  const [parserError, setParserError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [byokOpen, setByokOpen] = useState(false);
  const [byokEnabled, setByokEnabled] = useState(false);
  const lastTickRef = useRef<number>(0);

  const activeQuestion = DEMO_QUESTIONS[activeIndex];
  const activeBudgetSeconds = calibratedSeconds(activeQuestion);
  const activeAttempt = attempts[activeQuestion.id];
  const activeRemaining = remaining[activeQuestion.id];
  const timerAccent = activeRemaining <= 15 ? "critical" : activeRemaining <= 45 ? "warning" : "";
  const currentConfidence = Math.round(activeAttempt.confidence * 100);
  const displayedOptions = (optionOrder[activeQuestion.id] ?? []).map((id) => activeQuestion.options.find((option) => option.id === id)!).filter(Boolean);

  useEffect(() => {
    // This is the session-start shuffle. The resulting permutation remains locked in state
    // and must be persisted in UserItemAttempt.optionOrderJson in production. Defer it one
    // frame so hydration completes against the deterministic opening order first.
    const frame = window.requestAnimationFrame(() => setOptionOrder(createOptionOrder()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    lastTickRef.current = Date.now();
  }, [activeQuestion.id]);

  useEffect(() => {
    if (!running || graceOpen || reviewOpen || activeRemaining <= 0) return;
    const tick = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(1, Math.round((now - lastTickRef.current) / 1000));
      lastTickRef.current = now;
      setRemaining((previous) => {
        const value = Math.max(0, previous[activeQuestion.id] - elapsed);
        if (value === 0) setGraceOpen(true);
        return { ...previous, [activeQuestion.id]: value };
      });
      setAttempts((previous) => ({
        ...previous,
        [activeQuestion.id]: { ...previous[activeQuestion.id], responseSeconds: previous[activeQuestion.id].responseSeconds + elapsed }
      }));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [activeQuestion.id, activeRemaining, graceOpen, reviewOpen, running]);

  const metrics = useMemo(() => {
    const values = Object.values(attempts);
    const answered = values.filter((attempt) => attempt.selectedOptionId);
    const correct = answered.filter((attempt) => DEMO_QUESTIONS.find((q) => q.id === attempt.questionId)?.correctOptionId === attempt.selectedOptionId);
    const theta = estimateTheta(DEMO_QUESTIONS, values);
    const speedFit = fitVanDerLindenSpeed(DEMO_QUESTIONS, values);
    const brier = brierScore(values, DEMO_QUESTIONS);
    const ece = expectedCalibrationError(values, DEMO_QUESTIONS);
    const confidenceCaptured = values.filter((attempt) => attempt.confidenceReported).length;
    return { answered: answered.length, correct: correct.length, theta, speed: speedFit.tau, speedFit, brier, ece, confidenceCaptured };
  }, [attempts]);

  const liveTimerTheta = activeAttempt.responseSeconds > 0
    ? timerPressureAbility(metrics.theta, activeQuestion, activeAttempt.responseSeconds)
    : metrics.theta;

  const chooseOption = (optionId: string) => {
    setAttempts((previous) => {
      const attempt = previous[activeQuestion.id];
      return {
        ...previous,
        [activeQuestion.id]: {
          ...attempt,
          selectedOptionId: optionId,
          status: attempt.status === "marked" || attempt.status === "answered-marked" ? "answered-marked" : "answered"
        }
      };
    });
  };

  const changeConfidence = (value: number) => {
    setAttempts((previous) => ({
      ...previous,
      [activeQuestion.id]: {
        ...previous[activeQuestion.id],
        confidence: value / 100,
        confidenceReported: true
      }
    }));
  };

  const requestSubmit = () => {
    // A confidence judgment is required for every delivered item. For a skipped item,
    // the learner can explicitly report 0% confidence rather than silently inheriting a default.
    const missing = DEMO_QUESTIONS.filter((question) => !attempts[question.id].confidenceReported);
    if (missing.length) {
      setConfidenceOpen(true);
      return;
    }
    setSubmitOpen(true);
  };

  const moveTo = (index: number) => {
    const target = DEMO_QUESTIONS[index];
    setAttempts((previous) => {
      const attempt = previous[target.id];
      if (attempt.status !== "not-visited") return previous;
      return { ...previous, [target.id]: { ...attempt, status: "unanswered" } };
    });
    setActiveIndex(index);
    setGraceOpen(false);
    setRunning(true);
  };

  const toggleMark = () => {
    setAttempts((previous) => {
      const attempt = previous[activeQuestion.id];
      const marked = attempt.status === "marked" || attempt.status === "answered-marked";
      return {
        ...previous,
        [activeQuestion.id]: {
          ...attempt,
          status: marked ? (attempt.selectedOptionId ? "answered" : "unanswered") : (attempt.selectedOptionId ? "answered-marked" : "marked")
        }
      };
    });
  };

  const clearResponse = () => {
    setAttempts((previous) => {
      const attempt = previous[activeQuestion.id];
      return {
        ...previous,
        [activeQuestion.id]: {
          ...attempt,
          selectedOptionId: undefined,
          status: attempt.status === "answered-marked" ? "marked" : "unanswered"
        }
      };
    });
  };

  const grantGrace = (seconds: number) => {
    setRemaining((previous) => ({ ...previous, [activeQuestion.id]: seconds }));
    setAttempts((previous) => {
      const attempt = previous[activeQuestion.id];
      const deficitEvent = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `deficit-${Date.now()}`,
        addedSeconds: seconds,
        budgetExhaustedAtSeconds: attempt.responseSeconds,
        grantedAt: new Date().toISOString()
      };
      return {
        ...previous,
        [activeQuestion.id]: {
          ...attempt,
          extensionsSeconds: attempt.extensionsSeconds + seconds,
          timeDeficits: [...attempt.timeDeficits, deficitEvent]
        }
      };
    });
    setGraceOpen(false);
    setRunning(true);
  };

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setParserState("reading");
    setParserError(null);
    setExtraction(null);
    try {
      const form = new FormData();
      form.append("file", file);
      // Railway direct upload is recommended in production for source files larger than
      // Vercel's serverless request limit. The same-origin route remains the secure default.
      const extractionEndpoint = process.env.NEXT_PUBLIC_EXTRACTION_API_URL ?? "/api/extractions";
      const response = await fetch(extractionEndpoint, { method: "POST", body: form, headers: getByokExtractionHeaders() });
      if (!response.ok) throw new Error(`Extraction service returned ${response.status}`);
      const payload = await response.json();
      setExtraction({
        rawText: payload.raw_text,
        normalizedLatex: payload.normalized_latex,
        mathBlocks: payload.math_blocks,
        tags: payload.tags,
        classification: {
          subject: payload.classification.subject,
          chapter: payload.classification.chapter,
          topic: payload.classification.topic,
          targetLevel: payload.classification.target_level,
          confidence: payload.classification.confidence,
          evidence: payload.classification.evidence
        },
        coordinateDiagram: payload.coordinate_diagram,
        source: "vision"
      });
    } catch {
      // The interactive reference remains usable without a configured Vision provider.
      // This sample is visibly labelled local-preview rather than being passed off as OCR.
      setExtraction(localExtractionPreview(file));
      setParserError("Vision extraction is not connected in this preview; showing a clearly labelled local contract preview.");
    } finally {
      setParserState("complete");
    }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) processFile(file);
  };
  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const resetDemo = () => {
    setAttempts(initialAttempts());
    setRemaining(Object.fromEntries(DEMO_QUESTIONS.map((q) => [q.id, calibratedSeconds(q)])));
    // A restart is a new delivery session, therefore it receives a new locked option order.
    setOptionOrder(createOptionOrder());
    setActiveIndex(0);
    setReviewOpen(false);
    setGraceOpen(false);
    setSubmitOpen(false);
    setConfidenceOpen(false);
    setRunning(true);
  };

  const copyPrompt = async () => {
    await navigator.clipboard?.writeText("See docs/LLM_GENERATION_SYSTEM_PROMPT.md for the strict production system prompt and JSON contract.");
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 1400);
  };

  if (reviewOpen) {
    return <DiagnosticReview attempts={attempts} optionOrder={optionOrder} metrics={metrics} onRestart={resetDemo} onBack={() => setReviewOpen(false)} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark"><BrainCircuit size={23} /></div>
          <div>
            <div className="brand-name">Target<span>JEE</span> <em>ENGINE</em></div>
            <div className="brand-sub">COGNITIVE CBT SIMULATOR</div>
          </div>
        </div>
        <nav className="main-nav" aria-label="Application navigation">
          <button className={view === "simulator" ? "nav-item active" : "nav-item"} onClick={() => setView("simulator")}><Gauge size={15} /> Simulator</button>
          <button className={view === "ingest" ? "nav-item active" : "nav-item"} onClick={() => setView("ingest")}><ScanLine size={15} /> Ingest</button>
          <button className={view === "method" ? "nav-item active" : "nav-item"} onClick={() => setView("method")}><BookOpenCheck size={15} /> Method</button>
          <a className="nav-item reference-nav" href="/reference"><FileText size={15} /> Reference</a>
        </nav>
        <div className="top-actions">
          <span className="secure-status"><span className="pulse-dot" /> CBT secure mode</span>
          <button className={byokEnabled ? "byok-trigger configured" : "byok-trigger"} onClick={() => setByokOpen(true)}><KeyRound size={14} /> {byokEnabled ? "AI key set" : "AI key"}</button>
          <button className="avatar" aria-label="Account">AS</button>
          <button className="icon-btn" aria-label="Menu"><Menu size={20} /></button>
        </div>
      </header>

      {view === "ingest" ? (
        <IngestionView file={uploadedFile} parserState={parserState} extraction={extraction} parserError={parserError} dragging={dragging} onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onFileInput={onFileInput} />
      ) : view === "method" ? (
        <MethodView onCopy={copyPrompt} copied={promptCopied} />
      ) : (
        <section className="simulator-shell">
          <aside className="rail" aria-label="Candidate context">
            <div className="candidate-card">
              <div className="candidate-label">CANDIDATE</div>
              <div className="candidate-name">Aarav Singh</div>
              <div className="candidate-id">TJ-26-04281</div>
              <div className="candidate-ability"><span>LIVE θ</span><strong>{metrics.answered ? formatTheta(metrics.theta) : "0.00σ"}</strong></div>
            </div>
            <div className="rail-block">
              <div className="rail-title"><BarChart3 size={15} /> SESSION PULSE</div>
              <div className="pulse-metric"><span>Accuracy</span><strong>{metrics.answered ? Math.round((metrics.correct / metrics.answered) * 100) : "—"}%</strong></div>
              <div className="pulse-track"><i style={{ width: `${metrics.answered ? (metrics.correct / metrics.answered) * 100 : 6}%` }} /></div>
              <div className="pulse-metric"><span>Items attempted</span><strong>{metrics.answered}/3</strong></div>
              <div className="pulse-track blue"><i style={{ width: `${metrics.answered / 3 * 100}%` }} /></div>
            </div>
            <div className="rail-tip">
              <Sparkles size={15} />
              <p>Distractors are misconception paths, not random decoys.</p>
            </div>
            <div className="rail-bottom"><ShieldCheck size={15} /> Psychometric logging enabled</div>
          </aside>

          <section className="exam-panel">
            <div className="exam-head">
              <div>
                <div className="eyebrow">TARGETJEE / ADAPTIVE DRILL 07</div>
                <h1>High-pressure concept check</h1>
              </div>
              <div className={`clock-card ${timerAccent}`}>
                <div className="clock-label"><TimerReset size={14} /> ITEM BUDGET · e<sup>βᵢ</sup></div>
                <strong>{secondsToClock(activeRemaining)}</strong>
                <span>{activeAttempt.extensionsSeconds > 0 ? `${activeAttempt.timeDeficits.length} Time Deficit log${activeAttempt.timeDeficits.length === 1 ? "" : "s"} · +${Math.round(activeAttempt.extensionsSeconds / 60)}m` : `${Math.floor(activeBudgetSeconds / 60)}m ${activeBudgetSeconds % 60}s from βᵢ=${activeQuestion.psychometric.beta.toFixed(2)}`}</span>
              </div>
            </div>
            <div className={`timer-line ${timerAccent}`}><i style={{ width: `${Math.max(0, Math.min(100, (activeRemaining / activeBudgetSeconds) * 100))}%` }} /></div>

            <div className="question-topline">
              <div className="question-number">QUESTION <b>{String(activeQuestion.serial).padStart(2, "0")}</b><span> / 03</span></div>
              <div className={`subject-pill ${subjectColor(activeQuestion.subject)}`}>{activeQuestion.subject}</div>
              <div className="topic-text">{activeQuestion.chapter} <span>·</span> {activeQuestion.topic}</div>
              <div className="level-tag">{activeQuestion.level}</div>
            </div>

            <article className="question-card">
              <div className="question-meta"><span><Info size={14} /> Single correct · +4 / −1</span><span>{activeQuestion.context}</span><span className="shuffle-status"><Shuffle size={12} /> Session-shuffled & locked</span></div>
              <p className="stem"><InlineMath text={activeQuestion.stem} /></p>
              <div className="option-list" role="radiogroup" aria-label="Answer options">
                {displayedOptions.map((option, displayIndex) => {
                  const selected = activeAttempt.selectedOptionId === option.id;
                  return <button key={option.id} className={`option ${selected ? "selected" : ""}`} onClick={() => chooseOption(option.id)} role="radio" aria-checked={selected}>
                    <span className="option-letter">{optionLetter(displayIndex)}</span>
                    <Latex expression={option.latex} />
                    {selected && <Check className="option-check" size={17} />}
                  </button>;
                })}
              </div>
              <div className={`confidence-row ${activeAttempt.confidenceReported ? "reported" : "required"}`}>
                <div className="confidence-copy"><BrainCircuit size={16} /><span><b>Required:</b> report subjective confidence fₙ ∈ [0, 1] before final submission.</span></div>
                <div className="confidence-control"><span>Confidence</span><input aria-label="Subjective confidence from zero to one hundred percent" type="range" min="0" max="100" step="5" value={currentConfidence} onChange={(event) => changeConfidence(Number(event.target.value))} /><b>{currentConfidence}%</b><button type="button" className={activeAttempt.confidenceReported ? "confidence-confirm confirmed" : "confidence-confirm"} onClick={() => changeConfidence(currentConfidence)}>{activeAttempt.confidenceReported ? <><Check size={13} /> Reported</> : "Confirm"}</button></div>
              </div>
            </article>

            <footer className="exam-controls">
              <div className="control-left">
                <button className="text-button" onClick={clearResponse}><X size={15} /> Clear response</button>
                <button className={activeAttempt.status === "marked" || activeAttempt.status === "answered-marked" ? "mark-button marked" : "mark-button"} onClick={toggleMark}><Flag size={15} /> {activeAttempt.status === "marked" || activeAttempt.status === "answered-marked" ? "Marked for review" : "Mark for review"}</button>
              </div>
              <div className="control-right">
                <button className="outline-button" disabled={activeIndex === 0} onClick={() => moveTo(activeIndex - 1)}><ArrowLeft size={16} /> Previous</button>
                {activeIndex === DEMO_QUESTIONS.length - 1 ? <button className="primary-button" onClick={requestSubmit}>Submit test <Check size={16} /></button> : <button className="primary-button" onClick={() => moveTo(activeIndex + 1)}>Save & next <ArrowRight size={16} /></button>}
              </div>
            </footer>
          </section>

          <aside className="navigator">
            <div className="nav-head"><div><span>QUESTION PALETTE</span><strong>Adaptive drill 07</strong></div><button className="icon-btn small"><MoreHorizontal size={18} /></button></div>
            <div className="palette-key">
              {(["answered", "marked", "not-visited", "unanswered"] as QuestionStatus[]).map((status) => <div key={status}><i className={`key-dot ${status}`}><StatusDot status={status} /></i>{statusName(status)}</div>)}
            </div>
            <div className="question-grid">
              {DEMO_QUESTIONS.map((question, index) => {
                const status = attempts[question.id].status;
                return <button key={question.id} onClick={() => moveTo(index)} className={`grid-item ${status} ${index === activeIndex ? "current" : ""}`}><span>{question.serial}</span><StatusDot status={status} /></button>;
              })}
            </div>
            <div className="navigator-divider" />
            <div className="pressure-card">
              <div className="pressure-top"><AlarmClock size={16} /><span>PRESSURE INDEX</span><strong>LIVE</strong></div>
              <div className="pressure-number">{Math.max(12, Math.round(100 - (activeRemaining / activeBudgetSeconds) * 62))}<small>/100</small></div>
              <p>Timer model: θ*(t) = θ − λ max(0, βᵢ/t − 1).</p>
              <div className="pressure-theta"><span>IF COMMITTED NOW · θ*</span><b>{formatTheta(liveTimerTheta)}</b></div>
              <div className="pressure-scale"><i /></div>
            </div>
            <button className="submit-side" onClick={requestSubmit}><Check size={16} /> Finish & diagnose</button>
          </aside>
        </section>
      )}

      {graceOpen && <GraceModal question={activeQuestion} responseSeconds={activeAttempt.responseSeconds} priorExtensionSeconds={activeAttempt.extensionsSeconds} onExtend={grantGrace} onSubmit={() => { setGraceOpen(false); requestSubmit(); }} />}
      {confidenceOpen && <ConfidenceRequiredModal attempts={attempts} onGoTo={(index) => { setConfidenceOpen(false); moveTo(index); }} onCancel={() => setConfidenceOpen(false)} />}
      {submitOpen && <SubmitModal attempted={metrics.answered} confidenceCaptured={metrics.confidenceCaptured} marked={Object.values(attempts).filter((item) => item.status === "marked" || item.status === "answered-marked").length} onCancel={() => setSubmitOpen(false)} onConfirm={() => { setSubmitOpen(false); setRunning(false); setReviewOpen(true); }} />}
      {byokOpen && <ByokKeyDialog onClose={() => setByokOpen(false)} onSaved={() => setByokEnabled(true)} />}
    </main>
  );
}

function GraceModal({ question, responseSeconds, priorExtensionSeconds, onExtend, onSubmit }: { question: Question; responseSeconds: number; priorExtensionSeconds: number; onExtend: (seconds: number) => void; onSubmit: () => void }) {
  const oneMinutePenalty = satoPenalty(question, responseSeconds, priorExtensionSeconds + 60).timeDeficit;
  const twoMinutePenalty = satoPenalty(question, responseSeconds, priorExtensionSeconds + 120).timeDeficit;
  return <div className="modal-backdrop"><section className="modal grace-modal" role="dialog" aria-modal="true">
    <div className="modal-icon amber"><Clock3 size={27} /></div>
    <div className="eyebrow amber-text">CALIBRATED TIME BUDGET EXHAUSTED</div>
    <h2>Maintain the decision, log the deficit.</h2>
    <p><b>{question.topic}</b> has a calibrated intensity of {Math.round(Math.exp(question.psychometric.beta))} seconds. A buffer preserves the attempt; every choice creates an immutable <b>Time Deficit</b> event and a visible SATO penalty.</p>
    <div className="grace-options"><button onClick={() => onExtend(60)}><strong>+1 min</strong><span>Time Deficit · θ* impact −{oneMinutePenalty.toFixed(2)}</span></button><button onClick={() => onExtend(120)}><strong>+2 min</strong><span>Time Deficit · θ* impact −{twoMinutePenalty.toFixed(2)}</span></button></div>
    <button className="modal-text-button" onClick={onSubmit}>Submit what I have <ArrowRight size={15} /></button>
  </section></div>;
}

function ConfidenceRequiredModal({ attempts, onGoTo, onCancel }: { attempts: Record<string, Attempt>; onGoTo: (index: number) => void; onCancel: () => void }) {
  const missing = DEMO_QUESTIONS.map((question, index) => ({ question, index })).filter(({ question }) => !attempts[question.id].confidenceReported);
  return <div className="modal-backdrop"><section className="modal confidence-modal" role="dialog" aria-modal="true">
    <div className="modal-icon amber"><BrainCircuit size={27} /></div>
    <div className="eyebrow amber-text">METACOGNITIVE CHECK REQUIRED</div>
    <h2>Report confidence before locking.</h2>
    <p>Each delivered item needs an explicit subjective confidence value <b>fₙ between 0 and 1</b>. This is required for Brier and calibration analysis—even for a skipped item.</p>
    <div className="missing-confidence-list">{missing.map(({ question, index }) => <button key={question.id} onClick={() => onGoTo(index)}><span>Q{String(question.serial).padStart(2, "0")}</span><div><b>{question.topic}</b><small>Confidence not reported</small></div><ArrowRight size={15} /></button>)}</div>
    <div className="modal-actions"><button className="outline-button" onClick={onCancel}>Return to test</button><button className="primary-button" onClick={() => onGoTo(missing[0].index)}>Report Q{String(missing[0].question.serial).padStart(2, "0")} <ArrowRight size={16} /></button></div>
  </section></div>;
}

function SubmitModal({ attempted, confidenceCaptured, marked, onCancel, onConfirm }: { attempted: number; confidenceCaptured: number; marked: number; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><section className="modal submit-modal" role="dialog" aria-modal="true">
    <div className="modal-icon blue"><ShieldCheck size={27} /></div>
    <div className="eyebrow">FINAL RESPONSE CHECK</div>
    <h2>Lock this diagnostic attempt?</h2>
    <div className="submit-stat-row"><div><strong>{attempted}</strong><span>answered</span></div><div><strong>{confidenceCaptured}/3</strong><span>confidence captured</span></div><div><strong>{marked}</strong><span>marked</span></div></div>
    <p>All fₙ confidence reports are present. Your selections, response times, confidence, and buffer use will now update the cognitive breakdown.</p>
    <div className="modal-actions"><button className="outline-button" onClick={onCancel}>Return to test</button><button className="primary-button" onClick={onConfirm}>Lock & diagnose <ArrowRight size={16} /></button></div>
  </section></div>;
}

function IngestionView({ file, parserState, extraction, parserError, dragging, onDrop, onDragOver, onDragLeave, onFileInput }: {
  file: File | null;
  parserState: "idle" | "reading" | "complete";
  extraction: ExtractionPreview | null;
  parserError: string | null;
  dragging: boolean;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onFileInput: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return <section className="workbench-page">
    <div className="workbench-header"><div><div className="eyebrow">MULTI-MODAL ITEM INTAKE</div><h1>Turn a raw problem into a measured CBT item.</h1><p>Vision extraction preserves raw source text, converts recognized notation into KaTeX-safe LaTeX, and retains coordinate anchors as structured diagram evidence.</p></div><div className="pipeline-stamp"><Sparkles size={17} /> VISION-LLM PIPELINE READY</div></div>
    <div className="ingest-grid">
      <div className="ingest-card upload-card">
        <div className="card-heading"><div><ImageUp size={18} /><span>SOURCE PROBLEM</span></div><span>PNG · JPG · PDF</span></div>
        <div className={`dropzone ${dragging ? "dragging" : ""}`} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
          <input id="upload-file" type="file" accept="image/png,image/jpeg,application/pdf" onChange={onFileInput} />
          <label htmlFor="upload-file"><div className="upload-orb"><Upload size={25} /></div><strong>Drop a scan, photo, or PDF here</strong><span>Vision extraction reads prose, symbols, and coordinate diagrams</span></label>
        </div>
        <div className="privacy-note"><ShieldCheck size={15} /> Source files are hash-tracked for the item audit trail.</div>
      </div>
      <div className="ingest-card extraction-card">
        <div className="card-heading"><div><ScanLine size={18} /><span>EXTRACTION STATUS</span></div><span className={parserState === "complete" ? "state-ok" : ""}>{parserState === "complete" ? "KATEX READY" : "WAITING"}</span></div>
        {parserState === "idle" ? <div className="empty-extraction"><FileText size={34} /><p>Upload a source to extract raw text, formula regions, and coordinate anchors into an inspectable item record.</p></div> : <div className="extraction-content">
          <div className="file-row"><div className="file-icon"><FileText size={18} /></div><div><b>{file?.name}</b><span>{file ? `${(file.size / 1024).toFixed(1)} KB · ${file.type || "source image"}` : ""}</span></div>{parserState === "reading" ? <span className="reading">Reading symbols…</span> : <Check className="check-green" size={19} />}</div>
          {parserState === "reading" && <div className="extraction-lines"><i style={{ width: "68%" }} /><i style={{ width: "79%" }} /><i style={{ width: "91%" }} /><i style={{ width: "62%" }} /></div>}
          {parserState === "complete" && extraction && <div className="extraction-output">
            <div className="extraction-source"><span>RAW PROBLEM TEXT</span><p>{extraction.rawText}</p></div>
            <div className="tag-row"><span>{extraction.classification.subject}</span><span>{extraction.classification.chapter}</span><span>{extraction.classification.targetLevel}</span><span className={extraction.source === "vision" ? "vision-tag" : "preview-tag"}>{extraction.source === "vision" ? "Vision verified" : "Local preview"}</span></div>
            <div className="classification-panel"><div><span>AUTO TAGGED</span><strong>{extraction.classification.topic}</strong><small>{extraction.classification.evidence}</small></div><b>{Math.round(extraction.classification.confidence * 100)}%<small>classification confidence</small></b></div>
            <div className="clean-latex"><span>NORMALIZED KA TEX / LATEX</span><Latex expression={extraction.normalizedLatex} display /></div>
          </div>}
        </div>}
      </div>
    </div>
    {parserState === "complete" && extraction && <section className="extraction-evidence-grid">
      <article className="evidence-card">
        <div className="card-heading"><div><FileText size={17} /><span>MATHEMATICAL SYMBOLS</span></div><span>STRUCTURED</span></div>
        <p>Every detected mathematical region is emitted as a standalone KaTeX-safe expression for downstream validation.</p>
        <div className="math-blocks">{extraction.mathBlocks.map((block) => <div key={block}><Latex expression={block} display /></div>)}</div>
      </article>
      <article className="evidence-card coordinate-card">
        <div className="card-heading"><div><ScanLine size={17} /><span>COORDINATE DIAGRAM</span></div><span>ANCHORS RETAINED</span></div>
        <div className="diagram-layout"><svg viewBox="0 0 120 100" role="img" aria-label={extraction.coordinateDiagram.description}><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#6682ad" /></marker></defs><line x1="12" y1="80" x2="108" y2="80" stroke="#6682ad" strokeWidth="1.5" markerEnd="url(#arrow)" /><line x1="16" y1="89" x2="16" y2="10" stroke="#6682ad" strokeWidth="1.5" markerEnd="url(#arrow)" />{extraction.coordinateDiagram.points.map((point) => <g key={point.label}><circle cx={point.x} cy={point.y} r="4" fill="#2f6fe7" /><text x={point.x + 5} y={point.y - 6} fill="#3f587b" fontSize="9">{point.label}</text></g>)}<text x="85" y="94" fill="#7185a1" fontSize="8">{extraction.coordinateDiagram.xLabel}</text><text x="2" y="15" fill="#7185a1" fontSize="8">{extraction.coordinateDiagram.yLabel}</text></svg><p>{extraction.coordinateDiagram.description}</p></div>
      </article>
    </section>}
    {parserError && <div className="preview-notice"><Info size={15} /> {parserError}</div>}
    <div className="ingest-bottom-grid">
      <div className="process-lane"><div className="lane-head"><span>ITEM PRODUCTION GATE</span><b>Four auditable stages</b></div>{[["01", "Visual parse", "Raw OCR, formula regions, coordinate anchors"], ["02", "Normalize", "KaTeX-safe LaTeX + source provenance"], ["03", "Trap synthesis", "Misconception paths, no random numbers"], ["04", "Calibrate", "3PL / NRM / SATO parameters"]].map(([id, name, desc], index) => <div className={`lane-step ${parserState === "complete" || index === 0 ? "available" : ""}`} key={id}><span>{id}</span><div><b>{name}</b><small>{desc}</small></div>{index === 0 && parserState === "complete" ? <Check size={16} /> : <ChevronDown size={15} />}</div>)}</div>
      <div className="contract-card"><div className="lane-head"><span>GUARDRAIL</span><b>Evidence-to-item contract</b></div><p>The source text, each symbolic region, and every diagram anchor travel with the generated item. No option may be created from unverified evidence.</p><code>{'{ "raw_text": "...", "latex": "...", "coordinate_diagram": { "points": [] } }'}</code><div className="contract-check"><Check size={16} /> Reject ambiguous OCR, broken LaTeX, and ungrounded diagram facts</div></div>
    </div>
  </section>;
}

function MethodView({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  return <section className="workbench-page method-page">
    <div className="workbench-header"><div><div className="eyebrow">MEASUREMENT BLUEPRINT</div><h1>Psychometrics that stay inspectable.</h1><p>The implementation ships with typed calculation utilities, a strict LLM contract, and a normalized relational model.</p></div><button className="primary-button" onClick={onCopy}>{copied ? <Check size={16} /> : <FileText size={16} />}{copied ? "Reference copied" : "Copy prompt reference"}</button></div>
    <div className="method-metrics">
      <MetricCard tag="3PL · BIRNBAUM" title="Ability estimate" formula="P_i(θ)=c_i + (1-c_i)/(1+e^{-1.702a_i(θ-b_i)})" body="Bounded Newton–Raphson MLE after each locked attempt." color="blue" />
      <MetricCard tag="NRM · BOCK" title="Distractor fingerprint" formula="P_{ik}(θ)=e^{a_{ik}θ+c_{ik}} / Σe^{a_{ih}θ+c_{ih}}" body="Options diagnose the path that produced an error, not merely its letter." color="orange" />
      <MetricCard tag="SATO · VAN DER LINDEN" title="Hierarchical log-time speed" formula="\\ln(T_i)\\sim\\mathcal{N}(\\beta_i-\\tau,1/\\alpha_i^2)" body="Precision-weighted τ is fitted from log time; hasty response and each grace buffer then reduce pressure-adjusted ability." color="violet" />
    </div>
    <div className="method-doc-grid">
      <div className="doc-card"><div className="card-heading"><div><BrainCircuit size={18} /><span>IMPLEMENTED CORE</span></div></div><ul><li><Check size={15} /> Bounded 3PL MLE and item characteristic curve</li><li><Check size={15} /> Distractor-level NRM likelihoods</li><li><Check size={15} /> Log-time speed estimate τ and time deficit log</li><li><Check size={15} /> Brier score and five-bin ECE calibration</li></ul><p className="doc-foot">See <code>lib/psychometrics.ts</code></p></div>
      <div className="doc-card"><div className="card-heading"><div><FileText size={18} /><span>PRODUCTION HANDOFF</span></div></div><ul><li><Check size={15} /> <code>docs/SYSTEM_ARCHITECTURE.md</code></li><li><Check size={15} /> <code>docs/LLM_GENERATION_SYSTEM_PROMPT.md</code></li><li><Check size={15} /> <code>prisma/schema.prisma</code></li><li><Check size={15} /> <code>backend/app/main.py</code></li></ul><p className="doc-foot">Stack blueprint · strict JSON contract · FastAPI boundary · PostgreSQL schema</p></div>
    </div>
  </section>;
}

function MetricCard({ tag, title, formula, body, color }: { tag: string; title: string; formula: string; body: string; color: string }) {
  return <article className={`method-card ${color}`}><span>{tag}</span><h3>{title}</h3><div className="formula"><Latex expression={formula} display /></div><p>{body}</p></article>;
}

function DiagnosticReview({ attempts, optionOrder, metrics, onRestart, onBack }: { attempts: Record<string, Attempt>; optionOrder: Record<string, string[]>; metrics: { answered: number; correct: number; theta: number; speed: number; speedFit: { standardError: number; logLikelihood: number; observations: number }; brier: number; ece: number; confidenceCaptured: number }; onRestart: () => void; onBack: () => void }) {
  const answered = DEMO_QUESTIONS.filter((q) => attempts[q.id].selectedOptionId);
  const thetaBefore = 0;
  return <main className="review-page">
    <header className="review-topbar"><div className="brand-wrap"><div className="brand-mark"><BrainCircuit size={23} /></div><div><div className="brand-name">Target<span>JEE</span> <em>ENGINE</em></div><div className="brand-sub">COGNITIVE DIAGNOSTIC REPORT</div></div></div><div className="review-actions"><button className="text-button" onClick={onBack}><ArrowLeft size={15} /> Back to responses</button><button className="primary-button" onClick={onRestart}><RotateCcw size={15} /> Restart drill</button></div></header>
    <section className="review-hero"><div><div className="eyebrow">ATTEMPT LOCKED · ADAPTIVE DRILL 07</div><h1>Decision quality under pressure.</h1><p>Results separate what you knew from how time, confidence, and trap paths changed the final click.</p></div><div className="hero-score"><span>RAW SCORE</span><strong>{metrics.correct * 4 - (metrics.answered - metrics.correct)}</strong><small>/ 12</small></div></section>
    <section className="analytics-grid">
      <article className="analytic-card theta-card"><div className="analytic-label"><BrainCircuit size={16} /> ABILITY MOVEMENT</div><div className="theta-move"><span>{formatTheta(thetaBefore)}</span><ArrowRight size={18} /><strong>{formatTheta(metrics.theta)}</strong></div><div className="theta-scale"><i style={{ left: `${((metrics.theta + 3) / 6) * 100}%` }} /></div><p>3PL MLE from {metrics.answered} scored response{metrics.answered === 1 ? "" : "s"}; bounded to the JEE calibration scale.</p></article>
      <article className="analytic-card"><div className="analytic-label"><Zap size={16} /> LATENT SPEED τ</div><strong className="big-stat">{metrics.speedFit.observations ? `${metrics.speed.toFixed(2)}` : "—"}</strong><span className="stat-caption">ln(Tᵢ) ∼ N(βᵢ−τ, 1/αᵢ²)</span><p>{metrics.speedFit.observations ? `Precision-weighted MLE · SE ${metrics.speedFit.standardError.toFixed(2)} · ${metrics.speedFit.observations} timed item${metrics.speedFit.observations === 1 ? "" : "s"}.` : "Record a timed response to fit the hierarchical log-time model."}</p></article>
      <article className="analytic-card"><div className="analytic-label"><Gauge size={16} /> CALIBRATION</div><strong className="big-stat">{metrics.brier.toFixed(2)}</strong><span className="stat-caption">Brier score · ECE {metrics.ece.toFixed(2)}</span><p>{metrics.answered === 0 ? "No confidence judgments were locked." : metrics.ece > 0.2 ? "Confidence is drifting away from evidence—slow down before committing." : "Confidence is reasonably aligned with observed outcomes."}</p></article>
      <article className="analytic-card accuracy-card"><div className="analytic-label"><Check size={16} /> EXECUTION</div><strong className="big-stat">{metrics.correct}/{metrics.answered || 0}</strong><span className="stat-caption">correct selections</span><div className="tiny-bars"><i /><i /><i /></div><p>{metrics.answered ? "Each response is mapped to its selected misconception path." : "Submit responses to activate option-level diagnostics."}</p></article>
    </section>
    <section className="review-section-head"><div><div className="eyebrow">ITEM-LEVEL COGNITIVE TRACE</div><h2>Where the answer path diverged</h2></div><span>{answered.length} response{answered.length === 1 ? "" : "s"} analyzed</span></section>
    <section className="review-list">
      {DEMO_QUESTIONS.map((question) => <DiagnosticCard key={question.id} question={question} attempt={attempts[question.id]} optionOrder={optionOrder[question.id] ?? question.options.map((option) => option.id)} theta={metrics.theta} />)}
    </section>
    <section className="logbook-banner"><div className="logbook-icon"><BookOpenCheck size={24} /></div><div><span>MISTAKE LOGBOOK PROTOCOL</span><h3>Convert diagnostic language into a repeatable rule.</h3><p>Copy the imperative avoidance rule from every trap you select; test it again under a calibrated item timer.</p></div><button onClick={onRestart}><Play size={16} /> New timed drill</button></section>
  </main>;
}

function DiagnosticCard({ question, attempt, optionOrder, theta }: { question: Question; attempt: Attempt; optionOrder: string[]; theta: number }) {
  const selected = question.options.find((option) => option.id === attempt.selectedOptionId);
  const correct = selected?.isCorrect;
  const optionProbabilities = nrmProbabilities(theta, question);
  const selectedDisplayIndex = attempt.selectedOptionId ? optionOrder.indexOf(attempt.selectedOptionId) : -1;
  const pressureTheta = pressureAdjustedTheta(theta, question, attempt.responseSeconds || 1, attempt.extensionsSeconds);
  const penalty = satoPenalty(question, attempt.responseSeconds || 1, attempt.extensionsSeconds);
  const label = attempt.selectedOptionId ? timePressureLabel(question, attempt, Boolean(correct)) : "No response recorded";
  return <article className={`diagnostic-card ${correct ? "correct" : "incorrect"}`}>
    <div className="diagnostic-status"><span className={correct ? "good" : "bad"}>{correct ? <Check size={16} /> : <CircleAlert size={16} />}{correct ? "Correct route" : attempt.selectedOptionId ? "Trap route" : "Unattempted"}</span><span>Q{String(question.serial).padStart(2, "0")} · {question.subject}</span></div>
    <div className="diagnostic-main"><div className="diagnostic-question"><h3>{question.topic}</h3><p><InlineMath text={question.stem} /></p><div className="response-chips"><span className="selected-chip">Your click: {selected ? `${optionLetter(selectedDisplayIndex)} · ${selected.plain}` : "—"}</span><span>Confidence: {attempt.selectedOptionId ? `${Math.round(attempt.confidence * 100)}%` : "—"}</span><span>Time: {attempt.responseSeconds ? secondsToClock(attempt.responseSeconds) : "—"}</span></div></div>
      <div className="route-box"><span className="route-title">{label}</span>{selected?.trap ? <><h4>{selected.trap.archetype}</h4><p>{selected.trap.description}</p></> : <><h4>{correct ? "Verified solution path" : "No option chosen"}</h4><p>{correct ? "Your selected response follows the keyed derivation. Preserve this decision pattern under time pressure." : "No trap inference is possible without a selection."}</p></>}<div className="nrm-line">NRM selection tendency @ θ: <b>{attempt.selectedOptionId ? `${Math.round((optionProbabilities[attempt.selectedOptionId] ?? 0) * 100)}%` : "—"}</b></div></div>
    </div>
    {attempt.timeDeficits.length > 0 && <div className="time-deficit-ledger"><Clock3 size={15} /><div><span>TIME DEFICIT LEDGER · SATO INCLUDED</span><strong>{attempt.timeDeficits.map((event) => `+${Math.round(event.addedSeconds / 60)}m at ${secondsToClock(event.budgetExhaustedAtSeconds)}`).join(" · ")}</strong></div><div className="deficit-penalty"><span>θ* deficit</span><b>−{penalty.timeDeficit.toFixed(2)}</b></div></div>}
    <div className="solution-grid"><div><div className="solution-label"><span>A</span> FIRST PRINCIPLES</div><ol>{question.derivation.map((step) => <li key={step}>{step}</li>)}</ol></div><div><div className="solution-label shortcut"><span>B</span> COMPETITIVE SHORTCUT</div><ol>{question.shortcut.map((step) => <li key={step}>{step}</li>)}</ol></div></div>
    <div className="avoidance-row"><Flag size={16} /><div><span>LOGBOOK IMPERATIVE</span><strong>{selected?.trap?.avoidanceRule ?? question.avoidanceRule}</strong></div><div className="micro-metric"><span>PRESSURE θ*</span><b>{formatTheta(pressureTheta)}</b></div></div>
  </article>;
}
