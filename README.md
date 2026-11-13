# TargetJEE Engine

> An evidence-led JEE Main / JEE Advanced CBT simulator that turns a submitted attempt into a practical repair plan—without turning the learner experience into a psychometrics dashboard.

TargetJEE Engine combines an NTA-style timed drill, verified misconception-path analysis, optional metacognitive signals, source-problem extraction, and a high-engagement review studio. The current application ships with a seeded three-question reference drill so the complete learner flow works without credentials or a database.

## What learners can do

- Take a calm, authentic **NTA Simulation** with a locked option order, timer, question palette, mark-for-review state, clear response, and final response check.
- Switch to **Diagnostic Practice** only when they want optional `Guess`, `Think so`, or `Certain` self-reports. Confidence is never required in NTA Simulation.
- Start at a longer **First exposure** question window and progress automatically through Guided practice, Exam pace, and Pressure practice after steady, timely completed drills.
- Submit a drill and get a focused review rather than raw ability or calibration jargon.
- Start with the highest-value repair: the selected wrong option opens its verified trap path, first wrong pivot, plausibility rationale, corrective rule, clean solution, and a short redemption check.
- Receive an evidence-based answer-change signal after submission—evidence-led, reconsidered, or late response-window—plus an optional learner confirmation. The system never claims to read intent from clicks alone.
- Review at three levels: **Quick scan**, **Coach review**, or **Deep analysis**.
- Open auto-generated **session flashcards** built from selected misconception routes and save a card to the revision queue interaction.
- Use the same review information architecture in paired **dark and light themes**, with an intentional mobile layout.
- Upload a scan/photo/PDF to the extraction reference flow and inspect structured tagging, source evidence, KaTeX-safe mathematics, and coordinate anchors.
- Optionally configure a personal Gemini BYOK key in the browser. The default model is `gemini-flash-latest`.

## Feature principles

| Principle | Implementation |
|---|---|
| Authentic testing first | NTA Simulation avoids a mandatory confidence gate and keeps the testing surface calm. |
| Every wrong answer is meaningful | Each distractor represents a distinct misconception path, never an arbitrary number. |
| Evidence before labels | Review explains the option chosen, the first incorrect pivot, why it looked plausible, when that route would be valid, and the rule that repairs it. |
| Technical models stay in the measurement layer | Learners see stable, practical language such as estimate stability and next move—not routine raw theta or sigma values. |
| One dashboard architecture | Light and dark are themes of one data-display system, not separate dashboards. |
| Responsive by design | Desktop navigation and mobile navigation are intentionally different arrangements of the same workflow. |

---

## Quick start

### Requirements

- Node.js **22.12+**
- npm
- Python 3.12+ only when running the FastAPI backend locally

### Run the Next.js app

```bash
npm ci
npm run dev
```

Open the simulator:

```text
http://localhost:3000/simulator
```

Useful routes:

| Route | Purpose |
|---|---|
| `/` | Four-slide procedural WebGL/Three.js landing experience. |
| `/simulator` | NTA-style CBT drill, submission, review studio, flashcards, and extraction entry point. |
| `/dashboard` | Unified learner dashboard with a light/dark theme switch. |
| `/reference` | Formula atlas, contract notes, and implementation reference. |

### Open the Arena live preview

When this project is running in Arena, use the **Live Preview** card named **TargetJEE Engine**, then choose **Open Preview**. Append `/simulator`, `/dashboard`, or `/reference` in the preview address bar to open a specific experience.

---

## Review Studio

The post-session experience is implemented in `components/diagnostic-review.tsx` and is driven by the submitted session state—not static mock data.

### Review flow

1. **Session verdict** — raw score, repairable mark opportunity, observed response outcome, estimate stability, and next move.
2. **Workflow sidebar** — a simple three-step explanation of what is recorded, the timer-pressure formula used, how it helps flag rushed decisions, and the learner-facing output. It avoids implementation architecture details.
3. **Review depth** — learner chooses a quick scan, guided coaching, or full route analysis.
4. **Priority repair** — the top incorrect or unattempted route receives a clear primary action.
5. **Route replay** — selected answer, time on item, first wrong pivot, why the choice was plausible, counterfactual validity, and correct solution.
6. **Recovery** — a short targeted check verifies whether the learner now understands the decisive cue.
7. **Flashcards** — generated from structured misconception evidence; clean sessions instead preserve a correct decision cue.
8. **Next-session plan** — one concise action rather than generic performance language.

The project intentionally handles all relevant review states:

- selected incorrect answer;
- unattempted question;
- selected correct answer / clean session;
- short, low-information drill;
- dark/light theme toggle;
- desktop and mobile layouts.

### Concept image versus actual page

`images/targetjee-session-review-ui.png` is a visual concept, not a screenshot or a pixel-for-pixel specification. It contains illustrative data and concept-only navigation.

`images/targetjee-actual-session-review-user-friendly.png` is an actual browser capture of the implemented submitted-session page. The real implementation preserves the visual direction while adding functional review depth, evidence-led route replay, redemption checks, flashcards, theme switching, and responsive behavior.

---

## Measurement and diagnostic model

### Ability model

The reference implementation uses a bounded 3PL model:

$$
P_i(\theta)=c_i+\frac{1-c_i}{1+\exp[-1.702a_i(\theta-b_i)]}
$$

The client reference implementation estimates a bounded ability value for the seeded drill. In production, ability estimates should be stored with standard errors and treated as provisional when item information is low.

### Timing model and required pressure rule

The timing model uses a Van der Linden-style log-time fit:

$$
\ln(T_i)\sim\mathcal{N}\left(\beta_i-\tau,\frac{1}{\alpha_i^2}\right)
$$

The required timer-pressure degradation remains exactly:

$$
\theta^*(t)=\theta-\lambda\max\left(0,\frac{\beta_i}{t}-1\right)
$$

In the implementation, the calibrated item time is derived as `exp(question.psychometric.beta)` before applying the rule. A learner who uses a time extension keeps their attempt; every extension is logged as a time-deficit event rather than silently improving a pressure-adjusted result.

### Distractor contract

Every production question must include:

- subject, chapter, topic, and JEE Main/JEE Advanced target-level tagging;
- one keyed answer;
- three distinct, realistic misconception distractors;
- executable/evaluated trap-path values that are not equivalent to the keyed answer;
- first wrong pivot, plausibility rationale, valid-when counterfactual, avoidance rule, and NRM parameters;
- a verified question-level recovery check.

The complete generation contract is in [`docs/LLM_GENERATION_SYSTEM_PROMPT.md`](docs/LLM_GENERATION_SYSTEM_PROMPT.md).

---

## Architecture

```mermaid
flowchart LR
  L[Learner browser] --> N[Next.js App Router]
  N --> B[Same-origin BFF routes]
  B --> F[FastAPI on Railway]
  F --> V[Vision / LLM adapter]
  F --> S[Symbolic validation]
  N --> P[(PostgreSQL via Prisma)]
```

### Stack

| Layer | Technology |
|---|---|
| Web | Next.js App Router, React, TypeScript |
| Visual interaction | Three.js, React Three Fiber, Drei, Framer Motion |
| Mathematics | KaTeX |
| API | FastAPI, Pydantic v2, SymPy |
| Data model | PostgreSQL-ready Prisma schema |
| Deployment | Vercel for Next.js, Railway for FastAPI |

### Repository map

```text
app/                                  Next.js routes, BFF endpoints, global styling
components/target-jee-engine.tsx      CBT simulator, timer, question navigation, submission
components/diagnostic-review.tsx      Review Studio, route replay, recovery, flashcards
components/dashboard/                 Unified learner dashboard
components/canvas/                    Procedural Three.js landing experience
lib/questions.ts                      Seeded tagged questions and misconception trap paths
lib/psychometrics.ts                  3PL, timing, NRM, Brier, and ECE utilities
backend/app/main.py                   FastAPI extraction, validation, health routes
backend/app/extraction.py             Vision-to-structured-evidence adapter
backend/app/symbolic_validation.py    Symbolic and contract validation
prisma/schema.prisma                  PostgreSQL persistence model
docs/DEPLOYMENT.md                    Vercel, Railway, CORS, and environment guide
docs/SYSTEM_ARCHITECTURE.md           Production architecture and boundaries
```

---

## Backend: run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify the service:

```bash
curl http://127.0.0.1:8000/health
```

Important backend endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /health` | Deployment and readiness check. |
| `POST /v1/sources` | Accept a supported source asset and emit an intake receipt. |
| `POST /v1/extractions` | Return structured text, math blocks, tags, classification, and coordinate evidence. |
| `POST /v1/items/validate` | Validate generated item and distractor contracts. |
| `POST /v1/analytics/van-der-linden` | Fit the timing model. |

---

## Environment variables

Copy `.env.example` for local configuration. Never commit a real `.env` file.

### Next.js / Vercel

| Variable | Required when | Value |
|---|---|---|
| `TARGETJEE_API_BASE_URL` | Using Vercel's same-origin extraction proxy | Railway base URL, for example `https://your-api.up.railway.app` |
| `NEXT_PUBLIC_EXTRACTION_API_URL` | Direct browser uploads to Railway are desired | `https://your-api.up.railway.app/v1/extractions` |
| `DATABASE_URL` | Enabling Prisma-backed persistent writes | PostgreSQL connection string |

### Railway / FastAPI

| Variable | Purpose |
|---|---|
| `CORS_ALLOW_ORIGINS` | Comma-separated allowed Vercel/custom-domain origins. |
| `CORS_ALLOW_ORIGIN_REGEX` | Optional narrow matcher for Vercel preview domains. |
| `EXTRACTION_RATE_LIMIT_PER_MINUTE` | Per-client extraction rate limit; default reference value is `8`. |
| `TRUST_PROXY_HEADERS` | Set `true` when Railway proxy headers should be honoured. |
| `VISION_LLM_BASE_URL` | Optional server-owned provider endpoint. |
| `VISION_LLM_API_KEY` | Optional server-owned provider key. Keep server-only. |
| `VISION_LLM_MODEL` | Optional server-owned vision model identifier. |

### Gemini BYOK safety

- The browser key storage key is `targetjee.byok.gemini.v1`.
- The default Gemini model is `gemini-flash-latest`.
- The learner key is sent only in request-scoped allow-listed headers.
- Never expose a learner key through `NEXT_PUBLIC_*` variables, Git, analytics, URLs, database records, or server logs.
- A BYOK-only Railway deployment may leave the `VISION_LLM_*` server-owned-provider values blank.

---

## Deployment

The complete handoff is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Railway

1. Create a Railway project from the GitHub repository.
2. Set the service root directory to `backend`.
3. Railway uses `backend/Dockerfile` and `backend/railway.toml`.
4. Deploy and copy the public Railway base URL.
5. Set `CORS_ALLOW_ORIGINS` to the exact Vercel production/custom-domain origins.
6. Test `https://your-api.up.railway.app/health`.

### Vercel

1. Import or connect the repository.
2. Keep the project root at the repository root.
3. Select Next.js or allow automatic detection.
4. Add `TARGETJEE_API_BASE_URL` as the Railway base URL.
5. Add `NEXT_PUBLIC_EXTRACTION_API_URL` only when direct large-file uploads are required and CORS is configured.
6. Set the production branch to `main` in **Project Settings → Git**.
7. Enable Git deployment creation only when you are ready for approved `main` pushes to publish automatically.

The current Vercel project has a GitHub connection to `soham-laha/TargetJEE` and a production branch of `main`. Review deployment settings before enabling automatic deployment creation.

---

## Quality checks

Run the complete frontend gate:

```bash
npm run check
```

This runs linting, TypeScript checking, Vitest, and a production Next.js build.

Run backend tests:

```bash
cd backend
.venv/bin/python -m pytest tests -q
```

Validate Prisma:

```bash
DATABASE_URL='postgresql://user:pass@localhost:5432/targetjee' npm run prisma:validate
```

Check production dependencies:

```bash
npm audit --omit=dev --audit-level=high
```

The latest local verification passed:

- TypeScript and ESLint with zero warnings;
- 7 frontend psychometric tests;
- production Next.js build;
- 14 FastAPI tests;
- Prisma schema validation;
- production and full dependency audits with zero reported vulnerabilities;
- browser acceptance checks for incorrect, unattempted, fully correct, flashcard, recovery, theme, desktop, and mobile flows.

---

## Current reference scope

The included drill is intentionally seeded and client-side so anyone can explore the product without credentials. The Prisma schema and FastAPI contracts provide the production boundary, but a production account system, durable learner-session writes, object storage, asynchronous job queue, Redis-backed rate limits, reviewer workflow, and empirically calibrated item bank must be connected before collecting real learner data or making high-stakes claims.

## Accuracy roadmap

The next high-value accuracy improvements are:

1. Use provenance-backed official JEE item sources and answer keys.
2. Require subject-matter-expert approval before generated content reaches learners.
3. Run symbolic, numerical-substitution, dimensional, and domain checks for every answer and distractor.
4. Add low-confidence OCR confirmation for ambiguous scans, diagrams, and handwritten notation.
5. Calibrate item, distractor, and timing parameters from adequately sized anonymised response data.
6. Maintain a regression dataset for extraction, answers, explanations, trap paths, and recovery checks.
7. Prefer explicit uncertainty and review escalation over an unverified answer or explanation.

---

## Security and privacy notes

- Do not commit secrets, `.env` files, learner Gemini keys, private source scans, or database URLs.
- Keep CORS origin lists narrow; do not use `*` for the browser upload/BYOK flow.
- Treat client timer values as diagnostic signals, not authoritative high-stakes ranking evidence.
- Preserve source hashes, item/version identifiers, and reviewer/model audit trails in a production deployment.
- Use private object storage and signed URLs for real uploaded source material.

## License and use

This repository is a technical reference implementation. Review generated educational content, psychometric claims, source licensing, privacy obligations, and exam-policy requirements before using it with real learners.
