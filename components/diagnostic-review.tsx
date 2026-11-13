"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Home,
  Layers3,
  Lightbulb,
  LogOut,
  Moon,
  NotebookPen,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  Target,
  Workflow,
  X,
} from "lucide-react";
import { DEMO_QUESTIONS } from "@/lib/questions";
import { classifyOptionSwitch } from "@/lib/psychometrics";
import type { Attempt, Question } from "@/lib/types";

type ReviewDepth = "quick" | "coach" | "deep";
type ExplanationTab = "pivot" | "option" | "solution";
type Theme = "dark" | "light";

type ReviewMetrics = {
  answered: number;
  correct: number;
  confidenceCaptured: number;
};

type Props = {
  attempts: Record<string, Attempt>;
  optionOrder: Record<string, string[]>;
  metrics: ReviewMetrics;
  onRestart: () => void;
  onBack: () => void;
};

type ReviewEntry = {
  question: Question;
  attempt: Attempt;
  selectedId?: string;
  selectedLetter: string;
  isCorrect: boolean;
  timeOverrun: boolean;
};

const optionLetter = (index: number) => String.fromCharCode(65 + index);
const secondsToClock = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

function SwitchSignal({ attempt }: { attempt: Attempt }) {
  const signal = classifyOptionSwitch(attempt);
  const [reflection, setReflection] = useState<"condition" | "recalculated" | "guess" | null>(null);
  if (!signal) return null;

  return <section className={`switch-signal switch-${signal.kind}`}>
    <div><span>ANSWER-CHANGE SIGNAL · INFERRED</span><h3>{signal.title}</h3><p>{signal.detail} This label reads the selection trace, not the learner’s private intent.</p></div>
    <div className="switch-confirmation"><span>OPTIONAL · WHAT DROVE THE CHANGE?</span><div><button className={reflection === "condition" ? "selected" : ""} onClick={() => setReflection("condition")}>I noticed a condition</button><button className={reflection === "recalculated" ? "selected" : ""} onClick={() => setReflection("recalculated")}>I recalculated</button><button className={reflection === "guess" ? "selected" : ""} onClick={() => setReflection("guess")}>I was guessing</button></div>{reflection && <small>Saved locally for this review. This makes later coaching more precise.</small>}</div>
  </section>;
}

function RouteDetail({ entry, onClose }: { entry: ReviewEntry; onClose: () => void }) {
  const [tab, setTab] = useState<ExplanationTab>("pivot");
  const [feedback, setFeedback] = useState<"confirmed" | "partly" | "guess" | null>(null);
  const [working, setWorking] = useState("");
  const [recoveryChoice, setRecoveryChoice] = useState<number | null>(null);
  const selected = entry.question.options.find((option) => option.id === entry.selectedId);
  const trap = selected?.trap;
  const recovery = entry.question.recoveryCheck;
  const recovered = recoveryChoice === recovery?.answerIndex;

  if (!selected || !trap) {
    const isSecure = Boolean(selected);
    const routeTitle = isSecure ? "A route you secured" : "An item left open";
    const routeDescription = isSecure
      ? `You selected the keyed answer. Keep the check that made ${entry.question.topic} feel deliberate rather than lucky.`
      : "There is no selected option to diagnose, so this review starts with the first condition that unlocks the solution.";

    return <section className="review-route-detail" id={`route-${entry.question.id}`}>
      <div className="route-detail-head">
        <div><span>{isSecure ? "SECURE ROUTE" : "OPEN ITEM REVIEW"} · Q{String(entry.question.serial).padStart(2, "0")} · {entry.question.subject.toUpperCase()}</span><h2>{routeTitle}</h2></div>
        <button onClick={onClose} aria-label="Close route review"><X size={17} /></button>
      </div>
      <div className="route-evidence-row">
        <div><span>YOUR DECISION</span><b>{isSecure ? `${entry.selectedLetter} · ${selected?.plain}` : "No option selected"}</b></div>
        <div><span>TIME ON ITEM</span><b>{entry.attempt.responseSeconds ? secondsToClock(entry.attempt.responseSeconds) : "—"}</b></div>
        <div><span>STATUS</span><b>{isSecure ? "Secure route" : "Unattempted"}</b></div>
        <div><span>NEXT STEP</span><b>{isSecure ? "Reinforce the cue" : "Learn the first move"}</b></div>
      </div>
      <div className="route-explanation">
        <span>{isSecure ? "WHAT TO KEEP" : "START WITH THIS"}</span>
        <h3>{isSecure ? "Name the check that protected this answer." : entry.question.topic}</h3>
        <p>{routeDescription}</p>
        <div className="route-rule"><Lightbulb size={17} /><div><b>{isSecure ? "REPEATABLE CUE" : "THE FIRST USEFUL RULE"}</b><strong>{entry.question.avoidanceRule}</strong></div></div>
        <div className="route-shortcut"><b>THE CLEAN ROUTE</b><ol>{entry.question.derivation.map((step) => <li key={step}>{step}</li>)}</ol></div>
      </div>
      <SwitchSignal attempt={entry.attempt} />
      {recovery && <section className="route-recovery">
        <div><span>45-SECOND REDEMPTION CHECK</span><h3>{recovery.prompt}</h3></div>
        <div className="recovery-choice-grid">{recovery.choices.map((choice, index) => <button key={choice} className={recoveryChoice === index ? (recovered ? "correct" : "wrong") : ""} onClick={() => setRecoveryChoice(index)}><i>{optionLetter(index)}</i>{choice}</button>)}</div>
        {recoveryChoice !== null && <p className={recovered ? "recovery-feedback correct" : "recovery-feedback wrong"}>{recovered ? <Check size={15} /> : <ArrowRight size={15} />}{recovered ? `Recovered: ${recovery.explanation}` : `Not yet: ${recovery.explanation}`}</p>}
      </section>}
    </section>;
  }

  return <section className="review-route-detail" id={`route-${entry.question.id}`}>
    <div className="route-detail-head">
      <div><span>COACH REVIEW · Q{String(entry.question.serial).padStart(2, "0")} · {entry.question.subject.toUpperCase()}</span><h2>{trap.archetype}</h2></div>
      <button onClick={onClose} aria-label="Close route review"><X size={17} /></button>
    </div>
    <div className="route-evidence-row">
      <div><span>YOUR DECISION</span><b>{entry.selectedLetter} · {selected.plain}</b></div>
      <div><span>TIME ON ITEM</span><b>{entry.attempt.responseSeconds ? secondsToClock(entry.attempt.responseSeconds) : "—"}</b></div>
      <div><span>STATUS</span><b>{entry.attempt.status.includes("marked") ? "Marked for review" : "Needs repair"}</b></div>
      <div><span>DIAGNOSIS SIGNAL</span><b>Strong option match</b></div>
    </div>
    <div className="route-tabs" role="tablist" aria-label="Review explanation depth">
      <button role="tab" aria-selected={tab === "pivot"} className={tab === "pivot" ? "active" : ""} onClick={() => setTab("pivot")}>Find the pivot</button>
      <button role="tab" aria-selected={tab === "option"} className={tab === "option" ? "active" : ""} onClick={() => setTab("option")}>Why {entry.selectedLetter} looked right</button>
      <button role="tab" aria-selected={tab === "solution"} className={tab === "solution" ? "active" : ""} onClick={() => setTab("solution")}>Show the route</button>
    </div>
    <div className="route-explanation">
      {tab === "pivot" && <>
        <span>THE FIRST WRONG PIVOT</span>
        <h3>{trap.firstWrongPivot}</h3>
        <p>{feedback === "guess" ? "You marked this as a guess. Learn the cue that selects the correct principle before calculating." : feedback === "partly" ? "This path is only partly consistent with your reasoning. Compare the decisive condition with the step you actually used." : trap.description}</p>
        <div className="route-rule"><Lightbulb size={17} /><div><b>THE RULE THAT FIXES THIS</b><strong>{trap.avoidanceRule}</strong></div></div>
      </>}
      {tab === "option" && <>
        <span>WHY THIS FELT PLAUSIBLE</span>
        <h3>{trap.whyPlausible}</h3>
        <p><b>When this route would be valid:</b> {trap.validWhen}</p>
      </>}
      {tab === "solution" && <>
        <span>THE CORRECT ROUTE</span>
        <ol>{entry.question.derivation.map((step) => <li key={step}>{step}</li>)}</ol>
        <div className="route-shortcut"><b>FAST CHECK</b><p>{entry.question.shortcut.join(" ")}</p></div>
      </>}
    </div>
    <SwitchSignal attempt={entry.attempt} />
    <div className="route-confirmation">
      <div><span>WAS THIS CLOSE TO YOUR REASONING?</span><p>Correcting the route makes later explanations more accurate.</p></div>
      <div>{(["confirmed", "partly", "guess"] as const).map((value) => <button key={value} className={feedback === value ? "selected" : ""} onClick={() => setFeedback(value)}>{value === "confirmed" ? "Yes, exactly" : value === "partly" ? "Partly" : "I guessed"}</button>)}</div>
    </div>
    <label className="route-working"><span>OPTIONAL · SHOW THE STEP WHERE YOU GOT STUCK</span><textarea rows={2} value={working} onChange={(event) => setWorking(event.target.value)} placeholder="For example: I used Qc = [N₂O₄]/[NO₂]² …" /><small>{working ? "Saved locally for this review." : "One equation is enough to make the next diagnosis more exact."}</small></label>
    {recovery && <section className="route-recovery">
      <div><span>45-SECOND REDEMPTION CHECK</span><h3>{recovery.prompt}</h3></div>
      <div className="recovery-choice-grid">{recovery.choices.map((choice, index) => <button key={choice} className={recoveryChoice === index ? (recovered ? "correct" : "wrong") : ""} onClick={() => setRecoveryChoice(index)}><i>{optionLetter(index)}</i>{choice}</button>)}</div>
      {recoveryChoice !== null && <p className={recovered ? "recovery-feedback correct" : "recovery-feedback wrong"}>{recovered ? <Check size={15} /> : <ArrowRight size={15} />}{recovered ? `Recovered: ${recovery.explanation}` : `Not yet: ${recovery.explanation}`}</p>}
    </section>}
  </section>;
}

function FlashcardDrawer({ entries, onClose }: { entries: ReviewEntry[]; onClose: () => void }) {
  const cards = entries.filter((entry) => entry.selectedId && !entry.isCorrect).map((entry) => {
    const trap = entry.question.options.find((option) => option.id === entry.selectedId)?.trap;
    return {
      question: entry.question,
      trap,
      front: `Before solving ${entry.question.topic}, what condition must you check?`,
      back: trap?.avoidanceRule ?? entry.question.avoidanceRule,
    };
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(false);
  const anchor = entries.find((entry) => entry.selectedId) ?? entries[0];
  const hasTrapCards = cards.length > 0;
  const card = cards[index] ?? { question: anchor.question, trap: undefined, front: `Which cue made ${anchor.question.topic} reliable in this session?`, back: anchor.question.avoidanceRule };
  const previous = () => { setIndex((current) => (current - 1 + cards.length) % cards.length); setFlipped(false); };
  const next = () => { setIndex((current) => (current + 1) % cards.length); setFlipped(false); };

  return <aside className="flashcard-drawer" role="dialog" aria-modal="true" aria-label="Session flashcards">
    <div className="flashcard-head"><div><span>SESSION FLASHCARDS</span><h2>Auto-generated from this attempt</h2></div><button onClick={onClose} aria-label="Close flashcards"><X size={18} /></button></div>
    <p className="flashcard-subtitle">{hasTrapCards ? "Each card turns a verified trap path into one fast recall rule." : "No trap routes were selected, so this card preserves the strongest decision cue from the session."}</p>
    <button className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((current) => !current)}>
      <span>{flipped ? "THE RULE" : "RECALL PROMPT"}</span>
      <strong>{flipped ? card.back : card.front}</strong>
      <small>{flipped ? "Tap to see the prompt" : "Tap to reveal the rule"}</small>
    </button>
    <div className="flashcard-meta"><span>{cards.length ? `${index + 1} / ${cards.length}` : "1 / 1"}</span><b>{card.question.subject} · {card.question.topic}</b></div>
    <div className="flashcard-controls"><button onClick={previous} disabled={cards.length < 2}><ChevronLeft size={17} /> Previous</button><button className={saved ? "saved" : ""} onClick={() => setSaved((current) => !current)}>{saved ? <><Check size={16} /> Added to revision</> : <><NotebookPen size={16} /> Save card</>}</button><button onClick={next} disabled={cards.length < 2}>Next <ChevronRight size={17} /></button></div>
    <div className="flashcard-note"><Sparkles size={15} /><p>{hasTrapCards ? "Built from the structured misconception route, not a generic summary." : "Built from the decision evidence in this attempt, so a strong route is worth repeating."} Saved cards can enter the learner’s revision queue.</p></div>
  </aside>;
}

export function DiagnosticReview({ attempts, optionOrder, metrics, onRestart, onBack }: Props) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [depth, setDepth] = useState<ReviewDepth>("coach");
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);

  const entries = useMemo<ReviewEntry[]>(() => DEMO_QUESTIONS.map((question) => {
    const attempt = attempts[question.id];
    const selectedId = attempt.selectedOptionId;
    const order = optionOrder[question.id] ?? question.options.map((option) => option.id);
    return {
      question,
      attempt,
      selectedId,
      selectedLetter: selectedId ? optionLetter(order.indexOf(selectedId)) : "—",
      isCorrect: selectedId === question.correctOptionId,
      timeOverrun: attempt.responseSeconds > Math.exp(question.psychometric.beta) * 1.25,
    };
  }), [attempts, optionOrder]);

  const incorrect = entries.filter((entry) => entry.selectedId && !entry.isCorrect);
  const unanswered = entries.filter((entry) => !entry.selectedId);
  const priority = incorrect[0] ?? unanswered[0] ?? entries[0];
  const activeEntry = entries.find((entry) => entry.question.id === activeRoute) ?? null;
  const rawScore = metrics.correct * 4 - incorrect.length;
  const target = 12;
  const gap = Math.max(0, target - rawScore);
  const repairCount = incorrect.length + unanswered.length;
  const hasRepairRoute = repairCount > 0;
  const stability = metrics.answered < 2 ? "Early" : metrics.answered < 8 ? "Settling" : "Reliable";
  const priorityTrap = priority?.question.options.find((option) => option.id === priority.selectedId)?.trap;
  const priorityTitle = priorityTrap?.archetype ?? (priority?.selectedId ? "Secure route" : "Unattempted item");
  const scoreProgress = Math.max(0, Math.min(100, (rawScore / target) * 100));

  const startRoute = () => {
    if (!priority) return;
    setActiveRoute(priority.question.id);
    window.setTimeout(() => document.getElementById(`route-${priority.question.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return <main className={`review-page review-studio theme-${theme}`}>
    <aside className="review-sidebar">
      <div className="review-sidebar-brand"><div>TJ</div><b>Target<span>JEE</span></b></div>
      <nav aria-label="Review navigation">
        <button className="active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Home size={20} /><span>Home</span></button>
        <button onClick={() => document.getElementById("marks-leaked")?.scrollIntoView({ behavior: "smooth" })}><BarChart3 size={20} /><span>Analytics</span></button>
        <button onClick={() => document.getElementById("session-workflow")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Workflow size={20} /><span>Workflow</span></button>
        <button onClick={() => setFlashcardsOpen(true)}><NotebookPen size={20} /><span>Flashcards</span></button>
        <button onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}><Settings2 size={20} /><span>Theme</span></button>
      </nav>
      <div className="review-sidebar-quote">“Dream it.<br />Prepare for it.<br />Achieve it.”</div>
      <button className="review-sidebar-exit" onClick={onBack} aria-label="Return to responses"><LogOut size={20} /></button>
    </aside>

    <section className="review-stage">
      <header className="review-studio-toolbar">
        <button className="studio-mobile-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><BookOpenCheck size={18} /> TargetJEE</button>
        <div className="studio-toolbar-actions"><button className="studio-back" onClick={onBack}><ArrowLeft size={15} /> Back to responses</button><button className="studio-theme" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button><button className="studio-new-drill" onClick={onRestart}><Play size={16} fill="currentColor" /> New timed drill</button></div>
      </header>

      <section className="review-spotlight">
        <div className="spotlight-copy"><span>SESSION VERDICT <i /> ADAPTIVE DRILL #7</span><h1>Your next marks<br />are <em>visible.</em></h1><p>{hasRepairRoute ? "This session did not lose marks randomly. Start with one clear repair, then decide whether you need a longer review." : "You held every selected route. Lock the same calm decision pattern into your next timed set."}</p><div><button className="spotlight-start" onClick={hasRepairRoute ? startRoute : onRestart}>{hasRepairRoute ? <>Review top mistake <ArrowRight size={18} /></> : <><Play size={16} fill="currentColor" /> Start next drill</>}</button><button className="spotlight-flashcards" onClick={() => setFlashcardsOpen(true)}><Layers3 size={16} /> Open flashcards</button></div></div>
        <div className="spotlight-cards">
          <article className="studio-card score-card"><div className="card-label"><BarChart3 size={17} /> Raw Score</div><div className="score-card-body"><div className="score-ring" style={{ "--score-progress": `${scoreProgress * 3.6}deg` } as CSSProperties}><b>{rawScore}</b><span>/ {target}</span></div><div><strong>{gap ? `↑ +${gap}` : "At ceiling"}</strong><p>{gap ? `${gap} marks available in this drill` : "No marks are left on this set."}</p></div></div></article>
          <article className="studio-card happened-card"><div className="card-label"><Check size={17} /> What Happened</div><strong>{metrics.correct}/{metrics.answered || 0} Correct</strong><p>{repairCount ? `${repairCount} route${repairCount === 1 ? "" : "s"} to repair.` : "Every selected route held."}{unanswered.length ? ` ${unanswered.length} question${unanswered.length === 1 ? "" : "s"} left open.` : ""}</p></article>
          <article className="studio-card next-move-card"><div className="card-label"><Sparkles size={17} /> Best Next Move</div><strong>{hasRepairRoute ? priority?.question.topic : "Start a focused drill"}</strong><p>{hasRepairRoute ? (priorityTrap?.avoidanceRule ?? "Build the first useful step before calculating.") : "Turn this stable decision pattern into your next calm timed attempt."}</p></article>
          <article className="studio-card stability-card"><div className="card-label"><BarChart3 size={17} /> Estimate Stability</div><strong>{stability}</strong><p>{metrics.answered < 8 ? "This is a short signal. More responses will make it steadier." : "Enough response evidence is available for a steadier pattern review."}</p><i /></article>
        </div>
      </section>

      <section className="review-depth-studio"><div><Target size={23} /><div><h2>Choose Your Review Depth</h2><p>Start small if you need momentum, expand when you need more practice.</p></div></div><div className="studio-depth-buttons" role="group" aria-label="Review depth">{(["quick", "coach", "deep"] as ReviewDepth[]).map((value) => <button key={value} className={depth === value ? "active" : ""} aria-pressed={depth === value} onClick={() => setDepth(value)}>{value === "quick" ? <Sparkles size={18} /> : value === "coach" ? <BookOpen size={18} /> : <Layers3 size={18} />}<span>{value === "quick" ? "Quick scan" : value === "coach" ? "Coach review" : "Deep analysis"}<small>{value === "quick" ? "2 min" : value === "coach" ? "6 min" : "Full trace"}</small></span></button>)}</div></section>

      <section className="session-workflow-card" id="session-workflow" aria-labelledby="workflow-title"><div className="workflow-heading"><Workflow size={22} /><div><span>HOW YOUR SESSION BECOMES A PLAN</span><h2 id="workflow-title">Simple inputs. Clear next steps.</h2></div></div><div className="workflow-steps"><article><b>1</b><div><strong>You answer normally</strong><p>Your selected option and time on the question are recorded quietly. Practice certainty is optional.</p></div></article><article><b>2</b><div><strong>We check the decision pattern</strong><p><code>θ*(t) = θ − λ max(0, βᵢ/t − 1)</code> helps notice when a very fast answer may need a second look.</p></div></article><article><b>3</b><div><strong>You get an actionable output</strong><p>After submission, you see the score, the top mark leak, the reason behind it, and one recovery action.</p></div></article></div></section>

      <section className="review-lower-grid" id="marks-leaked">
        <article className="marks-leaked-card"><div className="section-card-head"><div><span>{hasRepairRoute ? "WHERE MARKS LEAKED" : "WHAT HELD STEADY"}</span><h2>{hasRepairRoute ? "Pick the highest-value repair first." : "No mark leaks in this short drill."}</h2></div><b><RotateCcw size={15} /> {hasRepairRoute ? `${repairCount} route${repairCount === 1 ? "" : "s"} to repair` : "All routes secure"}</b></div>
          {priority && <button className="priority-route" onClick={startRoute}><div className="priority-route-icon"><Target size={24} /></div><div><span>{hasRepairRoute ? "START HERE" : "REINFORCE THIS"}</span><strong>{hasRepairRoute ? priorityTitle : priority.question.topic}</strong><p>{hasRepairRoute ? (priorityTrap ? "A recoverable route is ready for a focused review." : "Build the missing first step without guessing.") : "Open the clean route and name the cue you will repeat."}</p></div><i><ArrowRight size={22} /></i></button>}
          {depth === "deep" && <div className="deep-route-list">{entries.map((entry) => <button key={entry.question.id} onClick={() => setActiveRoute(entry.question.id)}><span className={entry.isCorrect ? "good" : entry.selectedId ? "risk" : "open"}>{entry.isCorrect ? <Check size={14} /> : <CircleAlert size={14} />}</span><div><b>{entry.question.topic}</b><small>{entry.isCorrect ? "Secure route" : entry.selectedId ? "Needs review" : "Unattempted"}</small></div><em>{entry.isCorrect ? "+4" : entry.selectedId ? "−1" : "0"}</em></button>)}</div>}
        </article>
        <article className="recent-activity-card"><div className="section-card-head"><div><Clock3 size={22} /><h2>Recent Activity</h2></div><button onClick={() => setFlashcardsOpen(true)}>Open cards <ArrowRight size={15} /></button></div><div className="activity-line"><Check size={18} /><span>Session locked: {metrics.correct}/{metrics.answered || 0} answers correct</span><small>Now</small></div><div className="activity-line muted"><CircleAlert size={18} /><span>{hasRepairRoute ? (priorityTrap ? `Top repair: ${priorityTrap.archetype}` : "Top repair: unattempted item") : "No repair route detected"}</span><small>Now</small></div><button className="activity-flashcard" onClick={() => setFlashcardsOpen(true)}><NotebookPen size={16} /> Open {Math.max(1, incorrect.length)} revision flashcard{incorrect.length === 1 ? "" : "s"}</button></article>
      </section>

      {activeEntry && <RouteDetail entry={activeEntry} onClose={() => setActiveRoute(null)} />}
      {depth === "quick" && !activeEntry && <section className="quick-review-note"><Check size={19} /><div><b>Quick scan complete.</b><span>{hasRepairRoute ? "The most useful repair is ready when you have six focused minutes." : "Your selected routes held. Use the next drill to check whether the pattern stays stable under pressure."}</span></div><button onClick={hasRepairRoute ? startRoute : onRestart}>{hasRepairRoute ? <>Open coach review <ArrowRight size={15} /></> : <>Start next drill <Play size={14} fill="currentColor" /></>}</button></section>}
      <footer className="review-studio-footer"><div><span>NEXT-SESSION PLAN</span><h2>{hasRepairRoute ? "Recover one route before opening another full drill." : "Keep this calm decision pattern in the next drill."}</h2><p>{hasRepairRoute ? "Use the route review and flashcards to turn this session into the next score gain." : "A short new drill is the clearest way to test whether this stable pattern holds."}</p></div><button onClick={onRestart}><Play size={16} /> Start next drill</button></footer>
    </section>
    {flashcardsOpen && <><button className="flashcard-backdrop" aria-label="Close flashcards" onClick={() => setFlashcardsOpen(false)} /><FlashcardDrawer entries={entries} onClose={() => setFlashcardsOpen(false)} /></>}
  </main>;
}
