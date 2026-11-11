# TargetJEE Engine — Public deployment guide

This repository is configured for the requested split deployment:

- **Vercel:** Next.js App Router web experience and same-origin BFF routes.
- **Railway:** FastAPI extraction, item validation, symbolic verification, and timing-model API.
- **Neon or Supabase Postgres:** production database when persistent user/session storage is enabled.

> The current web drill is a public, seeded reference simulator. It can be deployed now.
> Before collecting real learner accounts, uploaded material, or paid Vision usage at scale,
> add your chosen authentication provider, private object storage, durable Redis rate limits,
> and Prisma-backed session routes described in `docs/SYSTEM_ARCHITECTURE.md`.

---

## 1. Prerequisites

- A GitHub repository containing this project.
- A Vercel account connected to that repository.
- A Railway account connected to the same repository.
- Either a server-owned Vision-LLM provider endpoint/key/model **or** the built-in Google Gemini BYOK flow for real scan/PDF extraction.
- Optional but recommended: Neon/Supabase Postgres and a custom domain.

The required Node version is **22.12+**. Railway uses the supplied Python 3.12 Docker image.

---

## 2. Deploy the FastAPI service to Railway

1. Create **New Project → Deploy from GitHub Repo** in Railway.
2. Set the service **Root Directory** to `backend`.
3. Railway automatically uses `backend/Dockerfile` and `backend/railway.toml`.
4. Set these Railway variables:

```bash
# Optional server-owned provider fallback. Leave these blank for a Gemini-BYOK-only launch.
VISION_LLM_BASE_URL=https://api.openai.com/v1
VISION_LLM_API_KEY=server-only-provider-key
VISION_LLM_MODEL=your-vision-model-id

# Set this after Vercel has created the production URL.
CORS_ALLOW_ORIGINS=https://your-project.vercel.app,https://app.yourdomain.com
# Optional only for Vercel preview URLs; adjust the project slug.
CORS_ALLOW_ORIGIN_REGEX=^https://your-project-.*\.vercel\.app$

EXTRACTION_RATE_LIMIT_PER_MINUTE=8
TRUST_PROXY_HEADERS=true
```

5. Deploy and copy the Railway public URL, for example:

```text
https://targetjee-api-production.up.railway.app
```

6. Verify readiness:

```bash
curl https://targetjee-api-production.up.railway.app/health
```

Expected response:

```json
{ "status": "ok", "service": "targetjee-api" }
```

### Gemini BYOK flow

The frontend includes a **Configure key in secure popup** control on the landing-page
initializer and an **AI key** control inside the simulator. It accepts a learner-owned
Google AI Studio key and model ID (default `gemini-flash-latest`). The key is stored only in
that learner's browser `localStorage`; the frontend sends it over HTTPS as a request-scoped
header for the next source extraction. Railway forwards it to Gemini and never writes it to
the TargetJEE database, logs, or deployment environment.

- A BYOK-only deployment may leave every `VISION_LLM_*` Railway variable blank.
- Never put a learner key into Vercel, Railway, `NEXT_PUBLIC_*` variables, analytics, or
  application logs.
- The supplied CORS policy explicitly permits the three `X-TargetJee-*` BYOK headers for
  allowed origins. Keep the origin allow-list narrow.
- Explain to learners that localStorage is appropriate only for a personal browser; the
  popup offers **Remove local key** for shared computers.

### Railway guardrails included

- `backend/Dockerfile` runs the API as a non-root user.
- `/health` is configured as Railway's health check.
- Extraction requests have a per-client in-memory sliding-window limit (default: 8/minute).
- Uploads are constrained to PNG, JPEG, PDF and a 20 MB backend limit.

For multi-instance or high-traffic use, replace the in-memory limiter with an API gateway
or Redis-backed quota keyed by authenticated user and source checksum.

---

## 3. Deploy the Next.js app to Vercel

1. Import the repository in Vercel.
2. Leave the project root as the repository root.
3. Vercel detects Next.js automatically; `vercel.json` defines the build and extraction
   proxy function settings.
4. Set Vercel environment variables:

```bash
# For the default same-origin /api/extractions proxy:
TARGETJEE_API_BASE_URL=https://targetjee-api-production.up.railway.app

# Recommended for source files larger than Vercel's serverless multipart limit:
NEXT_PUBLIC_EXTRACTION_API_URL=https://targetjee-api-production.up.railway.app/v1/extractions

# Add when Prisma-backed web/session writes are enabled:
DATABASE_URL=postgresql://...
```

5. Deploy. Confirm:

```bash
curl -I https://your-project.vercel.app
curl -I https://your-project.vercel.app/reference
```

### Upload-routing choice

| Setting | When to use it | Behavior |
|---|---|---|
| Omit `NEXT_PUBLIC_EXTRACTION_API_URL` | Small demo uploads | Browser sends multipart data to Vercel's same-origin `/api/extractions` proxy, which forwards privately to Railway. |
| Set `NEXT_PUBLIC_EXTRACTION_API_URL` | Real PNG/JPG/PDF uploads, especially larger files | Browser posts directly to Railway FastAPI. Configure `CORS_ALLOW_ORIGINS` precisely; no provider secret is exposed. |

For truly large PDFs or production-scale source retention, introduce the private-object-storage
presigned upload flow in the architecture document instead of routing binary files through
Vercel or Railway application memory.

---

## 4. Database provisioning

The included Prisma schema is validated and ready for PostgreSQL.

1. Create a Neon or Supabase PostgreSQL project.
2. Store its pooled production connection string as `DATABASE_URL` in the service that
   will own Prisma writes (normally the Next.js BFF).
3. Apply the initial schema from CI/deployment after reviewing migration files:

```bash
npx prisma migrate deploy
npx prisma generate
```

The current public reference drill is intentionally client-seeded. The production data model
already contains `TestSession`, `UserItemAttempt`, `TimeDeficitEvent`, calibration, source,
and audit entities; connect the BFF session routes before claiming persistent learner history.

---

## 5. Custom domain and CORS finalization

1. Add `app.yourdomain.com` to Vercel.
2. Add `api.yourdomain.com` to Railway if desired.
3. Update Railway:

```bash
CORS_ALLOW_ORIGINS=https://app.yourdomain.com,https://your-project.vercel.app
NEXT_PUBLIC_EXTRACTION_API_URL=https://api.yourdomain.com/v1/extractions
```

4. Redeploy both services. Never use `*` for CORS when browser credentials or user data are
   present.

---

## 6. Pre-launch gate

Run locally and require the same checks in CI:

```bash
npm run check
DATABASE_URL='postgresql://targetjee:localpassword@localhost:5432/targetjee' npm run prisma:validate
PYTHONPATH=backend pytest -q backend/tests
npm audit --omit=dev --audit-level=high
```

Confirm all of the following before announcing a public URL:

- [ ] `/`, `/reference`, `/api/health`, and Railway `/health` return successful responses.
- [ ] Vision extraction has real provider credentials and is tested with a PNG, JPG, and PDF.
- [ ] Railway CORS allows only Vercel production/preview and custom-domain origins needed.
- [ ] No `VISION_LLM_*` value appears in Vercel `NEXT_PUBLIC_*` variables or browser bundle.
- [ ] Extraction rate limit is set to a value appropriate for provider spend.
- [ ] Public source uploads have privacy policy, retention policy, malware scanning, and
      durable object-storage handling before collecting student material.
- [ ] Custom visual references have been applied and approved at desktop and mobile widths.

---

## 7. Deployment handoff files

```text
vercel.json                        Vercel build/proxy configuration
backend/Dockerfile                 Railway API image
backend/railway.toml               Railway health/restart configuration
.env.example                       complete environment-variable template
.github/workflows/quality.yml      build, test, schema, and backend CI gates
docs/SYSTEM_ARCHITECTURE.md        full production architecture
docs/LLM_GENERATION_SYSTEM_PROMPT.md  generation contract
docs/DEPLOYMENT.md                 this public deployment guide
```
