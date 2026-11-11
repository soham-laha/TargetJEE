# TargetJEE Engine

**TargetJEE Engine** is a JEE Main / Advanced CBT simulator designed to expose the
last-mile failure mode of high-achieving aspirants: selecting mathematically engineered
distractors under time pressure. It couples raw-problem ingestion with auditable trap
paths, a high-pressure NTA-style surface, and item-level psychometric diagnostics.

The included Next.js application is an interactive, seeded **Adaptive Drill 07**:
answer items, calibrate confidence, use the timed grace buffer, and lock the attempt to
see 3PL ability, log-time speed, Brier/ECE and misconception-path review.

## Run the interactive reference app

```bash
npm install
npm run dev
# open http://localhost:3000
```

Build verification:

```bash
npm run build
```

The UI is deliberately front-end seeded so it works without credentials. The FastAPI
service and Prisma model below are the production integration boundary.

## Frontend routes

- **`/`** — four-slide procedural WebGL landing experience: keyboard, wheel, touch, edge
  controls and pagination drive the carousel; the Quantum Scholar, ribbons, cables,
  floating lettering and liquid core are generated entirely from Three.js geometry/curves
  and shaders (no model assets).
- **`/dashboard`** — the screenshot-led TargetJEE operations dashboard. It starts in the
  light admin-matrix theme and its header toggle opens the compact dark operations theme.
- **`/simulator`** — the original working NTA-style adaptive CBT, kept intact behind the
  landing and dashboard calls to action.
- **`/reference`** — the implementation, equations, contracts and calibration atlas.

The slide-four initializer opens a dedicated Gemini BYOK popup. It persists the learner’s
student context and selected stream separately, while the learner-controlled key remains only
in that browser’s `localStorage` and is sent only with a requested extraction. The same popup
is available from the simulator’s **AI key** control and includes a local-key removal action.

## Complete one-page project reference

When the web app is running, open **`/reference`** for the full formula atlas, seeded-drill
equations, source-to-diagnostic flow, CBT rules, persistence map, accuracy safeguards, and
all verification commands in one page.

## Public deployment

The Vercel + Railway production handoff is in **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.
It includes Docker/Railway setup, Vercel environment variables, direct-upload/CORS guidance,
public-demo safeguards, database provisioning, and the pre-launch checklist.

---

## Recommended production architecture

The complete deployment blueprint, component boundaries, FastAPI Vision-LLM contract,
Next.js BFF routes, Prisma responsibilities, security controls, scoring flow, and scaling
strategy are in **[`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md)**.

```mermaid
flowchart LR
  U[Student browser] --> N[Next.js App Router + BFF]
  N --> P[(PostgreSQL / Prisma)]
  N --> F[FastAPI extraction + validation]
  F --> Q[Queue / worker]
  Q --> V[Vision LLM]
  Q --> S[Symbolic verifier]
  N --> O[(Private object storage)]
```

### Stack decisions

| Layer | Recommended technology | Reason |
|---|---|---|
| Web client | **Next.js 15 App Router**, TypeScript, React 19 | Server/client boundaries, route handlers, streaming and a strong deployment model. |
| Design system | **Tailwind CSS** + CSS variables + Radix primitives | Tokenized, accessible components; this reference uses portable CSS so it previews without a Tailwind build step. |
| Formula rendering | **KaTeX** | Fast deterministic rendering; sanitize and render server-side for review snapshots. |
| API / AI workflow | **Python FastAPI**, Pydantic v2, background worker (Celery/Arq or Temporal) | Excellent typed contracts and symbolic/OCR ecosystem. Do not run Vision-LLM work in a request thread. |
| Verification | SymPy + unit-aware checker + diagram/OCR confidence policy | Re-evaluate correct answer and each trap output; reject equivalent/undefined options. |
| Persistence | **PostgreSQL 16**, **Prisma** for Next.js transactional reads/writes | Relational auditability for items, option order, events and calibration. |
| Assets | Private S3/R2/GCS bucket + short-lived signed URLs | Source scans are sensitive educational content; store original plus SHA-256. |
| Queues | SQS/Redis + idempotent worker records | Vision/OCR is latency-variable; source hash makes retries safe. |
| Observability | OpenTelemetry, structured logs, Sentry, prompt/model/version audit | Required for calibration drift and generated-content incident response. |

### Service boundaries

1. **Ingest:** browser asks the BFF for a short-lived upload URL; object storage scan and
   checksum happen before a `SourceAsset` is accepted. FastAPI queues OCR/Vision work.
2. **Item forge:** OCR spans and diagram anchors are provided to the LLM via the strict
   prompt in `docs/LLM_GENERATION_SYSTEM_PROMPT.md`. It may only return the contract.
3. **Verification:** Pydantic rejects structural errors; a symbolic verifier recomputes
   the correct answer and each `trap_path`. An item is rejected if any option is duplicate,
   equivalent, unsupported by source evidence, or inconsistent with its displayed value.
4. **Human review:** `DRAFT → PENDING_REVIEW → APPROVED` is a mandatory editorial state
   transition for generated content. Item parameters can be seeded by experts and then
   recalibrated from anonymized response data.
5. **Delivery:** the server shuffles once at session creation and locks that permutation
   in `UserItemAttempt.optionOrderJson`; it is never reshuffled while an attempt is live.
   The browser sends monotonic timing events / checkpointed elapsed milliseconds—not a
   trusted final duration. Each +1/+2 minute grace decision creates an immutable
   `TimeDeficitEvent` as well as updating the aggregate `extensionMs`.
6. **Scoring:** on submission, a transaction scores selections, runs bounded 3PL MLE,
   estimates `tau = mean(beta_i - ln(T_i))`, calculates Brier/ECE, records a snapshot,
   and writes immutable calibration contributions.

> **Security:** server-owned model keys must never enter the browser. The optional Google
> Gemini BYOK flow deliberately uses a learner-controlled local browser key and forwards it
> only with the individual extraction request; it is not persisted by TargetJEE. Tell users
> to use it only on personal devices and provide a clear local-key removal control. Retain
> request authentication, rate limits, content-type/size verification, malware scanning,
> encrypted source storage, audit-log retention, and strict CSP. Do not treat client timer
> values as authoritative in high-stakes rankings.

---

## Psychometric implementation notes

### 3PL ability / Birnbaum

For item $i$, the implementation uses the Birnbaum three-parameter logistic model:

$$
P_i(\theta) = c_i + \frac{1-c_i}{1+\exp\left[-1.702\,a_i(\theta-b_i)\right]}
$$

`lib/psychometrics.ts` clamps the exponent and obtains a bounded
$\theta \in [-3,3]$ MLE using finite-difference Newton–Raphson iterations over completed
item likelihood. In production, store standard errors and use test information or a
regularized MAP estimate for short drills; label low-information estimates as provisional.

### NRM distractor diagnosis

Each wrong `QuestionOption` owns exactly one `DistractorArchetype` and an NRM slope /
intercept pair. At review, the selected option leads directly to its error description and
avoidance rule. The option-level selection tendency is:

$$
P_{ik}(\theta) =
\frac{\exp\left(a_{ik}\theta+c_{ik}\right)}
{\sum_h \exp\left(a_{ih}\theta+c_{ih}\right)}
$$

These are **diagnostic parameters**, not a substitute for empirical calibration.

### SATO / timing

The response-time model is:

$$
\ln(T_i) \sim \mathcal{N}\!\left(\beta_i-\tau,\;\frac{1}{\alpha_i^2}\right)
$$

The reference implementation fits the precision-weighted estimate:

$$
\hat{\tau} =
\frac{\sum_i \alpha_i^2\left(\beta_i-\ln(T_i)\right)}
{\sum_i \alpha_i^2},
\qquad
\operatorname{SE}(\hat{\tau}) = \frac{1}{\sqrt{\sum_i \alpha_i^2}}
$$

It then applies the requested hasty-response adjustment, where
$\beta_{\mathrm{seconds}} = \exp(\beta_i)$:

$$
\theta^*(t)=\theta-\lambda\max\!\left(0,\frac{\beta_{\mathrm{seconds}}}{t}-1\right)
$$

A buffer does not void an attempt. Each extension is recorded as a `TimeDeficitEvent` and is
included in the conservative extension term below, where $g$ is accumulated grace seconds
and $\delta=0.22$:

$$
\theta^*(t,g)=
\theta-\lambda\max\!\left(0,\frac{\beta_{\mathrm{seconds}}}{t}-1\right)
-\delta\ln\!\left(1+\frac{g}{\beta_{\mathrm{seconds}}}\right)
$$

This prevents grace time from silently improving a pressure-adjusted estimate while
preserving the learner’s response for diagnosis.

### Metacognition

Every delivered item requires an explicit learner confidence report
$f_n \in [0,1]$ before final submission; skipped items may be reported as $0$. The submission
gate refuses to lock a drill with missing confidence reports. The submission worker calculates
the Brier score $\operatorname{mean}[(\mathrm{confidence}-\mathrm{outcome})^2]$ and five-bin
Expected Calibration Error. Never infer psychological diagnosis from one drill; present
calibration as a behavior signal over a sufficient response window.

---

## Repository map

```text
app/                         Next.js App Router and styles
components/target-jee-engine.tsx  NTA-style CBT, timer/buffer, review UI
lib/questions.ts             Seeded items and trap mappings
lib/psychometrics.ts         3PL, Newton MLE, NRM, SATO, Brier/ECE utilities
backend/app/main.py          Typed FastAPI ingress, extraction, and item-contract validator
backend/app/extraction.py    Vision-to-raw-text/KaTeX/coordinate-evidence adapter
backend/app/psychometrics.py Server-authoritative Van der Linden log-time fit
prisma/schema.prisma         PostgreSQL Prisma schema
docs/SYSTEM_ARCHITECTURE.md  Deployment and stack architecture blueprint
docs/LLM_GENERATION_SYSTEM_PROMPT.md  Locked prompt + output contract
```

## Database and migration

The complete normalized Prisma model is in `prisma/schema.prisma` and covers:

- source images/PDFs and OCR evidence;
- questions, versioned generation contracts and 3PL time parameters;
- four delivery options and one-to-one distractor archetypes / NRM coefficients;
- locked session option permutations, answer events, response time, aggregate grace debt,
  and one immutable event for every individual time-buffer decision;
- user ability snapshots and Brier/ECE calibration contributions;
- model/prompt/reviewer audit events.

For a live database, add `@prisma/client`, initialize a Postgres database, set
`DATABASE_URL`, then run:

```bash
npx prisma migrate dev --name initial_targetjee
npx prisma generate
```

## FastAPI contract boundary

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- `POST /v1/sources` accepts only PNG/JPEG/PDF (reference limit: 20 MB) and emits a queued
  source receipt. Replace its in-memory reference path with scanned object storage and a
  job queue.
- `POST /v1/extractions` sends a scan/photo/PDF to the server-side Vision adapter and
  returns raw text, KaTeX-safe LaTeX, discrete formula regions, diagram coordinates, OCR
  ambiguity flags and confidence. Configure `VISION_LLM_BASE_URL`, `VISION_LLM_API_KEY`,
  and `VISION_LLM_MODEL`; the Next.js same-origin broker at `/api/extractions` forwards
  the browser upload privately via `TARGETJEE_API_BASE_URL`, so no model credential is
  exposed to the browser.
- `POST /v1/items/validate` validates a completed LLM object. The model rejects unknown
  keys, missing trap paths, duplicate canonical values, invalid psychometric ranges, and
  beta/time inconsistency.
- `POST /v1/analytics/van-der-linden` fits the precision-weighted candidate speed `τ`,
  standard error, and normal log-likelihood for `ln(T_i) ~ N(β_i−τ, 1/α_i²)`.
- `GET /health` is readiness-friendly.

## Acceptance criteria before an item reaches a learner

- [ ] Source evidence is sufficient for a unique exact answer.
- [ ] Correct derivation passes a symbolic/numerical verifier.
- [ ] Three wrong options are all distinct, solve to their displayed values, and derive
      from their declared error mechanism.
- [ ] KaTeX renders and scientific notation/units are unambiguous.
- [ ] Psychometric values are in range and receive an expert calibration label.
- [ ] Human review changes state to `APPROVED`.
- [ ] Delivered option ordering, timer events, confidence and extension time are immutable
      after submission.

## Quality gates and verification

```bash
# Web: ESLint, TypeScript, Vitest and production build
npm run check

# Prisma schema
DATABASE_URL='postgresql://targetjee:localpassword@localhost:5432/targetjee' npm run prisma:validate

# Backend: isolated test dependencies and API/symbolic checks
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements-dev.txt
PYTHONPATH=backend pytest -q backend/tests
```

The project includes a GitHub Actions workflow at `.github/workflows/quality.yml` that
runs these web, Prisma and FastAPI gates on pushes and pull requests. The generated-item
validator also applies a bounded SymPy equivalence guard to reject visually different but
mathematically identical answer options before they reach review.
