import Link from "next/link";
import katex from "katex";
import {
  ArrowLeft, BadgeCheck, BarChart3, BrainCircuit, CheckCircle2, Clock3,
  Code2, Database, FileCheck2, GitBranch, ImageUp, LockKeyhole, ShieldCheck,
  Sparkles, TimerReset
} from "lucide-react";

function Formula({ title, expression, note }: { title: string; expression: string; note: string }) {
  const html = katex.renderToString(expression, { throwOnError: false, displayMode: true });
  return <article className="reference-formula-card">
    <h3>{title}</h3>
    <div className="reference-formula" dangerouslySetInnerHTML={{ __html: html }} />
    <p>{note}</p>
  </article>;
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return <li><CheckCircle2 size={15} />{children}</li>;
}

export default function ProjectReferencePage() {
  return <main className="reference-page">
    <header className="reference-topbar">
      <Link className="reference-back" href="/"><ArrowLeft size={16} /> Back to simulator</Link>
      <div className="reference-brand"><BrainCircuit size={19} /> TARGET<span>JEE</span> ENGINE <em>COMPLETE REFERENCE</em></div>
      <div className="reference-verified"><BadgeCheck size={15} /> Verified quality gates</div>
    </header>

    <section className="reference-hero">
      <div>
        <div className="eyebrow">ONE-PAGE DELIVERY REFERENCE</div>
        <h1>TargetJEE Engine — complete model, CBT, and validation map.</h1>
        <p>Everything implemented in the project: source ingestion, deterministic distractors, timed CBT delivery, psychometric models, calibration rules, data persistence, accuracy guards, and the verification suite.</p>
      </div>
      <div className="reference-hero-stamp"><ShieldCheck size={22} /><span>ASSESSMENT INTEGRITY</span><strong>Guarded by schema, symbolic, timing, and calibration checks</strong></div>
    </section>

    <nav className="reference-jump" aria-label="Reference sections">
      <a href="#flow">Delivery flow</a><a href="#formulas">Formula atlas</a><a href="#cbt">CBT behavior</a><a href="#accuracy">Accuracy guards</a><a href="#checks">Verification</a>
    </nav>

    <section className="reference-status-grid" aria-label="Implemented system status">
      <article><ImageUp size={20} /><span>Source intake</span><strong>PNG · JPG · PDF</strong><small>Raw text, formula regions, and coordinate anchors</small></article>
      <article><Sparkles size={20} /><span>Item forge</span><strong>Structured JSON</strong><small>Exact solution, trap paths, NRM, 3PL, and timing fields</small></article>
      <article><TimerReset size={20} /><span>CBT pressure</span><strong>e<sup>βᵢ</sup> budget</strong><small>Locked option order, countdown, and Time Deficit buffers</small></article>
      <article><BarChart3 size={20} /><span>Diagnostics</span><strong>θ · τ · Brier · ECE</strong><small>Ability, speed, confidence, and misconception trace</small></article>
    </section>

    <section id="flow" className="reference-section">
      <div className="reference-section-title"><div className="section-icon"><GitBranch size={19} /></div><div><span>01 · END-TO-END FLOW</span><h2>From raw problem to cognitive diagnostic</h2></div></div>
      <div className="reference-flow">
        <article><b>01</b><h3>Ingest</h3><p>Browser sends a scan/photo/PDF through the same-origin Next.js broker. FastAPI checks type and size; private storage and source checksum support auditability.</p><code>SourceAsset · SHA-256 · private upload</code></article>
        <article><b>02</b><h3>Extract & auto-tag</h3><p>Vision-LLM structured output returns raw prose, KaTeX-safe LaTeX, math blocks, coordinate anchors, ambiguity flags, and evidence-grounded subject, chapter, topic, and JEE level.</p><code>ExtractionResult · classification</code></article>
        <article><b>03</b><h3>Forge & verify</h3><p>The item prompt creates one correct route plus exactly three evaluated misconception paths. Each trap must calculate the displayed wrong value; schema and SymPy guards reject malformed or equivalent options.</p><code>3PL · NRM · trap evaluation</code></article>
        <article><b>04</b><h3>Deliver & diagnose</h3><p>The CBT locks option permutations, captures confidence and timing, records buffers, then estimates ability, speed, calibration, and selected trap path.</p><code>TestSession · UserItemAttempt</code></article>
      </div>
    </section>

    <section id="formulas" className="reference-section">
      <div className="reference-section-title"><div className="section-icon blue"><Code2 size={19} /></div><div><span>02 · FORMULA ATLAS</span><h2>Every measurement equation implemented in this project</h2></div></div>
      <div className="reference-formula-grid">
        <Formula title="Birnbaum 3PL item characteristic curve" expression={String.raw`P_i(\theta)=c_i+\frac{1-c_i}{1+\exp[-1.702a_i(\theta-b_i)]}`} note="Models the probability of a correct response from latent ability θ, discrimination aᵢ, difficulty bᵢ, and pseudo-guessing cᵢ." />
        <Formula title="Bock nominal-response distractor model" expression={String.raw`P_{ik}(\theta)=\frac{\exp(a_{ik}\theta+c_{ik})}{\sum_{h=1}^{4}\exp(a_{ih}\theta+c_{ih})}`} note="Maps each wrong option to an ability-sensitive misconception path rather than an arbitrary decoy." />
        <Formula title="Van der Linden hierarchical log-time model" expression={String.raw`\ln(T_i)\sim\mathcal{N}\!\left(\beta_i-\tau,\frac{1}{\alpha_i^2}\right)`} note="βᵢ is intrinsic log-time intensity, τ is candidate speed, and αᵢ controls timing precision." />
        <Formula title="Precision-weighted speed estimate" expression={String.raw`\widehat{\tau}=\frac{\sum_i\alpha_i^2\left(\beta_i-\ln T_i\right)}{\sum_i\alpha_i^2}\qquad SE(\widehat{\tau})=\frac{1}{\sqrt{\sum_i\alpha_i^2}}`} note="The implementation uses the closed-form MLE and reports timing-model standard error and log-likelihood." />
        <Formula title="Hasty-response SATO penalty" expression={String.raw`\theta^*(t)=\theta-\lambda\max\!\left(0,\frac{\beta_{\mathrm{sec}}}{t}-1\right)`} note="Flags premature closure when a wrong response is produced substantially faster than calibrated item intensity." />
        <Formula title="Time Deficit extension adjustment" expression={String.raw`\theta^*(t,g)=\theta-\lambda\max\!\left(0,\frac{\beta_{\mathrm{sec}}}{t}-1\right)-\delta\ln\!\left(1+\frac{g}{\beta_{\mathrm{sec}}}\right)`} note="A +1/+2 minute buffer preserves the answer while explicitly reducing pressure-adjusted ability by accumulated grace seconds g." />
        <Formula title="β-derived CBT timer budget" expression={String.raw`\mathrm{budgetSeconds}=\max\!\left(30,\operatorname{round}(e^{\beta_i})\right)`} note="The countdown is calculated from βᵢ; no active timer is hand-authored independently of the item timing parameter." />
        <Formula title="Brier confidence score" expression={String.raw`BS=\frac{1}{N}\sum_{n=1}^{N}(f_n-o_n)^2`} note="Confidence fₙ is recorded in [0,1] only after the learner explicitly reports it; oₙ is the scored outcome." />
        <Formula title="Expected calibration error" expression={String.raw`ECE=\sum_{m=1}^{M}\frac{|B_m|}{N}\left|\operatorname{acc}(B_m)-\operatorname{conf}(B_m)\right|`} note="Uses confidence bins to detect systematic overconfidence or underconfidence over multiple items." />
      </div>
    </section>

    <section className="reference-section">
      <div className="reference-section-title"><div className="section-icon orange"><BrainCircuit size={19} /></div><div><span>03 · SEEDED DRILL EQUATIONS</span><h2>Subject-matter expressions used by the interactive reference drill</h2></div></div>
      <div className="reference-example-grid">
        <article><span>PHYSICS · ROTATIONAL MOTION</span><div dangerouslySetInnerHTML={{ __html: katex.renderToString(String.raw`v(x)=\omega x,\qquad K(x)=\frac12m\omega^2x^2`, { displayMode: true, throwOnError: false }) }} /><div dangerouslySetInnerHTML={{ __html: katex.renderToString(String.raw`W_{\mathrm{agent}}=\int_r^{2r}m\omega^2x\,dx=\frac32m\omega^2r^2`, { displayMode: true, throwOnError: false }) }} /><p>Correct route: inertial-frame kinetic-energy change. Trap paths include endpoint substitution, frame mixing, and pseudo-force double counting.</p></article>
        <article><span>CHEMISTRY · EQUILIBRIUM</span><div dangerouslySetInnerHTML={{ __html: katex.renderToString(String.raw`Q_c=\frac{[NO_2]^2}{[N_2O_4]}`, { displayMode: true, throwOnError: false }) }} /><div dangerouslySetInnerHTML={{ __html: katex.renderToString(String.raw`Q'_c=2^{\Delta\nu}Q_c=2Q_c`, { displayMode: true, throwOnError: false }) }} /><p>Correct route: recompute Q after uniform compression. Traps include K-versus-Q confusion, exponent-only scaling, and quotient inversion.</p></article>
        <article><span>MATHEMATICS · DEFINITE INTEGRAL</span><div dangerouslySetInnerHTML={{ __html: katex.renderToString(String.raw`I=\int_0^\pi\frac{x\sin x}{1+\cos^2x}\,dx`, { displayMode: true, throwOnError: false }) }} /><div dangerouslySetInnerHTML={{ __html: katex.renderToString(String.raw`2I=\pi\int_0^\pi\frac{\sin x}{1+\cos^2x}\,dx=\frac{\pi^2}{2},\qquad I=\frac{\pi^2}{4}`, { displayMode: true, throwOnError: false }) }} /><p>Correct route: pair x with π−x. Traps include false odd symmetry, lost pairing factor, and unsuitable substitution.</p></article>
      </div>
    </section>

    <section id="cbt" className="reference-section reference-two-column">
      <article className="reference-detail-card"><div className="reference-section-title"><div className="section-icon violet"><Clock3 size={19} /></div><div><span>04 · CBT DELIVERY RULES</span><h2>What the learner experiences</h2></div></div><ul className="reference-check-list"><CheckRow>Answer options are shuffled once per session with a secure random source, then locked and persisted as session order.</CheckRow><CheckRow>Timer budget is derived from e<sup>βᵢ</sup>; its accent is amber during the final-45-second pressure window and red in the final 15 seconds.</CheckRow><CheckRow>At 00:00, +1 and +2 minute choices keep the attempt alive while creating individual immutable Time Deficit events.</CheckRow><CheckRow>Every delivered item requires an explicit confidence report f<sub>n</sub> ∈ [0,1] before final submission. A skipped item may be reported as 0.</CheckRow><CheckRow>Question status, selected canonical option, confidence, response duration, option order, and extension events feed the review.</CheckRow></ul></article>
      <article className="reference-detail-card"><div className="reference-section-title"><div className="section-icon green"><Database size={19} /></div><div><span>05 · DATA & AUDIT TRAIL</span><h2>What is persisted</h2></div></div><ul className="reference-check-list"><CheckRow><code>SourceAsset</code> stores hash, private object key, extraction output, and source confidence.</CheckRow><CheckRow><code>Question</code>, <code>QuestionOption</code>, and <code>DistractorArchetype</code> keep rigorous solution, shortcut, trap, and NRM data.</CheckRow><CheckRow><code>PsychometricParameter</code> keeps 3PL a/b/c plus β and α timing values.</CheckRow><CheckRow><code>UserItemAttempt</code> stores locked option order, explicit confidence, duration, pressure θ*, and submission state.</CheckRow><CheckRow><code>TimeDeficitEvent</code>, <code>CalibrationLog</code>, <code>AbilitySnapshot</code>, and <code>GenerationAuditEvent</code> preserve reviewability.</CheckRow></ul></article>
    </section>

    <section id="accuracy" className="reference-section">
      <div className="reference-section-title"><div className="section-icon green"><LockKeyhole size={19} /></div><div><span>06 · ACCURACY & SAFETY GUARDS</span><h2>How the project prevents misleading items and measurements</h2></div></div>
      <div className="reference-guard-grid">
        <article><FileCheck2 size={19} /><h3>Strict structured generation</h3><p>Pydantic rejects unknown fields, missing trap paths, multiple correct answers, invalid 3PL ranges, and inconsistent β/time budgets.</p></article>
        <article><Code2 size={19} /><h3>Evaluated trap guard</h3><p>Exactly three distinct misconception archetypes are required; each trap&apos;s evaluated canonical output must equal its displayed wrong option, and SymPy rejects algebraic duplicates.</p></article>
        <article><ImageUp size={19} /><h3>Evidence-first extraction</h3><p>OCR ambiguity, uncertain labels, and unsupported coordinate facts are retained as flags rather than converted into invented question content.</p></article>
        <article><ShieldCheck size={19} /><h3>Human review gate</h3><p>Generated content stays DRAFT/PENDING_REVIEW until symbolic checks, KaTeX rendering, evidence audit, and subject-matter review pass.</p></article>
        <article><BrainCircuit size={19} /><h3>Confidence integrity</h3><p>Default slider values never count as calibration data. Only deliberately confirmed fₙ reports contribute to Brier Score and ECE.</p></article>
        <article><TimerReset size={19} /><h3>Timing integrity</h3><p>The browser renders a responsive timer, while production architecture records checkpointed elapsed time and locks final scoring server-side.</p></article>
      </div>
    </section>

    <section id="checks" className="reference-section reference-checks">
      <div className="reference-section-title"><div className="section-icon blue"><BadgeCheck size={19} /></div><div><span>07 · VERIFIED QUALITY GATES</span><h2>Checks included and successfully run</h2></div></div>
      <div className="reference-check-grid">
        <article><strong>Web quality</strong><p><code>npm run lint</code> · ESLint with Next.js Core Web Vitals rules</p><p><code>npm run typecheck</code> · strict TypeScript validation</p><p><code>npm run test</code> · 6 Vitest psychometric tests</p><p><code>npm run build</code> · Next.js production build</p></article>
        <article><strong>Backend quality</strong><p><code>pytest -q backend/tests</code> · 7 FastAPI, timing, and symbolic-validation tests</p><p><code>py_compile</code> · FastAPI and model-module compilation</p><p><code>prisma validate</code> · PostgreSQL schema validation</p><p><code>npm audit --omit=dev</code> · production dependency audit</p></article>
        <article><strong>Automation & references</strong><p><code>.github/workflows/quality.yml</code> · CI on push and pull request</p><p><code>docs/SYSTEM_ARCHITECTURE.md</code> · deployment architecture</p><p><code>docs/LLM_GENERATION_SYSTEM_PROMPT.md</code> · item-forge contract</p><p><code>README.md</code> · local setup and commands</p></article>
      </div>
    </section>

    <footer className="reference-footer"><div><strong>TargetJEE Engine</strong><span>AI-driven CBT simulation with measurable cognitive diagnostics.</span></div><Link href="/">Open the simulator <ArrowLeft size={15} className="reference-return-icon" /></Link></footer>
  </main>;
}
