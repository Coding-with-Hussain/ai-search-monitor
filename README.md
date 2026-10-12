# AI Search Visibility Monitor

> **Google tells you where you rank. AI Search Visibility Monitor tells you whether AI recommends you.**

AI Search Visibility Monitor ("AI Visibility") is a SaaS application that checks whether AI assistants — ChatGPT, Gemini and Perplexity — mention and recommend a business when customers ask buying questions ("What is the best dental clinic in Lahore?"). It generates buyer‑intent questions, asks the AI providers, analyzes every answer, compares competitors, calculates an AI Visibility score, and turns the gaps into specific recommendations — tracked over time.

The core loop:

```
CREATE BUSINESS → GENERATE BUYER QUESTIONS → RUN AI ANALYSIS → DETECT MENTIONS
→ DETECT RECOMMENDATIONS → COMPARE COMPETITORS → CALCULATE SCORE → SHOW FIXES → TRACK OVER TIME
```

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start (simulation mode)](#quick-start-simulation-mode)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Stripe setup](#stripe-setup)
- [AI provider setup](#ai-provider-setup)
- [Simulation (mock) mode](#simulation-mock-mode)
- [Architecture](#architecture)
- [Database](#database)
- [Scoring model](#scoring-model)
- [Background jobs & scheduling](#background-jobs--scheduling)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Production considerations](#production-considerations)
- [Project structure](#project-structure)

---

## Features

**Public site**
- Landing page, features, pricing (monthly/annual), about, privacy, terms — SEO metadata, Open Graph images, JSON‑LD, sitemap and robots.
- `/demo` — a public demo dashboard computed by the real analysis engine over simulated answers (clearly labeled).
- `/free-ai-visibility-check` — lead‑generation checker (simulated by default; strictly rate‑limited when live).

**Product**
- Email/password and magic‑link authentication (Supabase Auth), password reset, protected routes.
- 4‑step onboarding: business info → services → competitors → monitoring preferences → "Analyze My Business".
- Project dashboard: AI Visibility score with explanation, recommendation/mention/citation rates, average position, share of voice, competitor gap with "See why", platform cards (ChatGPT/Gemini/Perplexity), visibility trend (7/30/90 days/all), competitor comparison, top questions, cited sources, recommendation preview, first‑run product tour.
- Question management: generated + manual buyer questions, 8 categories, search/filter/provider/status filters, pause/resume, priorities, bulk actions, regeneration with de‑duplication.
- Query detail: per‑provider status, position, recommendation, sentiment, citation, evidence, full answer, competitors' positions, score breakdown and "what this means".
- Competitors: tracking, comparison, "Why are they winning?" observed signals.
- Recommendations: evidence‑based actions with priority, category, impact and difficulty; complete/dismiss/reopen.
- History of scans and print‑friendly reports (PDF via the browser on Pro/Agency, white‑label on Agency).
- Live scan progress ("Analyzing 23 / 50 questions…", current provider and question).
- Billing with Stripe Checkout + Customer Portal + webhooks; central plan entitlements and usage metering.
- Settings: profile, password, notification preferences, monitoring defaults, account deletion.
- Alerts (score drops, visibility lost, competitor overtakes), in‑app notifications, weekly email reports.
- Development tools (`/admin`) for triggering scans, inspecting provider output, running the analyzer, recalculating scores and switching plans (development only).

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Route Handlers, `proxy.ts`) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4, Radix UI primitives (shadcn‑style components), Lucide icons, Recharts, Sonner, next-themes |
| Forms & validation | React Hook Form + Zod 4 (validated again on the server) |
| Auth | Supabase Auth via `@supabase/ssr` (cookie sessions) |
| Database | Supabase Postgres, SQL migrations, Drizzle ORM (server‑side data access layer) + Row Level Security |
| Payments | Stripe (Checkout, Billing Portal, webhooks) |
| Jobs | Database‑backed resumable scan queue; Inngest (optional) or in‑process `after()` + cron fallback |
| Email | Resend REST API (optional) |
| Testing | Vitest (unit + integration), Playwright (E2E) |

## Quick start (simulation mode)

Simulation mode runs the entire product without any AI or Stripe keys: AI answers come from a deterministic simulator and are clearly labeled.

```bash
# 1. Install
npm install

# 2. Start Supabase locally (requires Docker + Supabase CLI)
supabase start          # prints the API URL, anon key, service_role key and DB URL

# 3. Configure
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
#   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
#   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
#   AI_VISIBILITY_MOCK_MODE=true

# 4. Migrate + seed a demo account (demo@aivisibility.dev / demo-password-123)
npm run setup -- --seed

# 5. Run
npm run dev             # http://localhost:3000
```

Use the hosted Supabase project instead of `supabase start` by pointing the variables at it (see [Supabase setup](#supabase-setup)).

### Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests |
| `npm run test:integration` | Integration tests (needs `DATABASE_URL`) |
| `npm run test:e2e` | Playwright end‑to‑end tests (needs Supabase) |
| `npm run setup [-- --seed] [-- --remote]` | Validate env, apply migrations, optionally seed |
| `npm run db:migrate [-- --dry]` | Apply pending SQL migrations |
| `npm run seed [-- --reset]` | Create/reset the demo account and project |
| `npm run stripe:setup` | Create Stripe test products/prices (lookup keys) |

## Environment variables

All variables are documented in [`.env.example`](.env.example). Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | yes | Public URL (emails, redirects, sitemap, OG) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase Auth (browser‑safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | recommended | Account deletion, seeding (server‑only) |
| `DATABASE_URL` | yes | Postgres connection for the server (use the pooler URL in production) |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | for billing | Stripe |
| `STRIPE_PRICE_<PLAN>_<MONTHLY\|YEARLY>` | optional | Explicit price IDs (otherwise lookup keys) |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_WEB_SEARCH` | for live ChatGPT | OpenAI Responses API |
| `GOOGLE_AI_API_KEY`, `GEMINI_MODEL` | for live Gemini | Gemini API with Google Search grounding |
| `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL` | for live Perplexity | Perplexity Sonar API |
| `ANALYSIS_MODE`, `ANALYSIS_MODEL` | optional | `auto` = LLM analyzer for live answers when OpenAI is configured |
| `AI_VISIBILITY_MOCK_MODE` | yes | `true` = simulation mode (default) |
| `MOCK_LATENCY_MS`, `MAX_PROVIDER_CALLS_PER_SCAN`, `SCAN_CONCURRENCY` | optional | Simulation latency, cost guard, parallelism |
| `FREE_CHECK_LIVE`, `FREE_CHECK_DAILY_LIMIT` | optional | Free checker live mode + global daily cap |
| `CRON_SECRET` | production | Protects `/api/cron/*` |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_DEV` | optional | Durable background jobs |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | Weekly reports and alerts |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | optional | Product analytics |
| `ENABLE_DEV_TOOLS`, `LOG_LEVEL` | optional | Dev tools in production (admins only), log level |

Server configuration is validated with Zod on first use (`lib/env.ts`). Secrets are only read on the server; nothing secret uses the `NEXT_PUBLIC_` prefix.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **API keys** — Project Settings → API: copy the URL and anon (publishable) key into `NEXT_PUBLIC_SUPABASE_*`, and the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
3. **Database URL** — Connect → *Transaction pooler* (port 6543) into `DATABASE_URL` for production. The client uses `prepare: false`, which the pooler requires.
4. **Migrations** — `npm run setup -- --remote` (or `supabase link && supabase db push`). Both tools share the `supabase_migrations.schema_migrations` table, so they can be mixed.
5. **Auth settings** — Authentication → URL configuration: set *Site URL* to your app URL and add `https://<your-domain>/auth/callback` to the redirect allow list. Enable *Confirm email* in production. Optionally customize email templates; the token‑hash flow is handled at `/auth/confirm`.
6. **Seed (optional, non‑production)** — `npm run seed` creates `demo@aivisibility.dev`.

New users automatically get a profile and a 14‑day Starter trial via the `on_auth_user_created` trigger.

## Stripe setup

1. Use test mode keys: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. `npm run stripe:setup` creates four products with monthly and yearly prices (lookup keys `aivm_<plan>_monthly|yearly`). Prices come from `lib/billing/plans.ts` (annual discount configurable via `ANNUAL_DISCOUNT`).
3. Add a webhook endpoint `https://<your-domain>/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Enable the Customer Portal (Settings → Billing → Customer portal) so users can switch plans, update cards and cancel.

Without Stripe keys the billing page still shows plans and usage, with checkout disabled and explained. Subscription state is only ever changed by verified webhooks — never by the browser.

## AI provider setup

| Provider | Key | Default model | Notes |
| --- | --- | --- | --- |
| ChatGPT | `OPENAI_API_KEY` | `gpt-5-mini` | Responses API with the `web_search` tool (citations from `url_citation` annotations). |
| Gemini | `GOOGLE_AI_API_KEY` | `gemini-2.5-flash` | `generateContent` with Google Search grounding (citations from grounding chunks). |
| Perplexity | `PERPLEXITY_API_KEY` | `sonar` | Chat completions; citations/search results returned natively. |

Set `AI_VISIBILITY_MOCK_MODE=false` to use them. Providers are independent: if one is missing or failing it is marked **unavailable** for that scan and the rest of the scan continues. Every call stores provider, model, latency, tokens and an **estimated cost** (`services/ai/pricing.ts`) in `ai_runs`, and scans aggregate cost into `usage_records`.

Answers are analyzed by a deterministic analyzer; with `OPENAI_API_KEY` (and `ANALYSIS_MODE=auto|llm`) live answers are additionally analyzed by an LLM using a strict JSON schema. LLM output is **never trusted blindly**: it is validated with Zod, retried once when invalid, reconciled with exact text matching (the model cannot invent mentions), citations are computed from real URLs, and any failure falls back to the deterministic analyzer.

## Simulation (mock) mode

`AI_VISIBILITY_MOCK_MODE=true` (the default) replaces provider calls with `MockProvider` (`services/ai/providers/mock.ts`), which builds realistic, **deterministic** answers (ranked lists, rationales, citations) from the business, competitors and a seed. Everything downstream — analysis, scoring, competitor metrics, recommendations, alerts — is the real production code.

Simulated data is always labeled: scans store `mode = 'mock'`, runs store `is_mock = true`, the UI shows **Simulation** / **Demo data** badges, and reports and emails say so. The demo project created by `npm run seed` is flagged `is_demo`.

## Architecture

```
Browser ──► Next.js (App Router)
             ├─ proxy.ts                 session refresh + optimistic route protection
             ├─ Server Components         read via data-access layer (db/repositories)
             ├─ Server Actions            mutations (Zod-validated, runAction → ActionResult)
             └─ Route Handlers            scan progress, Stripe, cron, Inngest, billing redirects
                    │
                    ▼
             services/  (pure business logic)
               ai/providers   ChatGPT · Gemini · Perplexity · Mock  (AIProvider interface)
               ai/analyzer    heuristic + LLM (Zod-validated, reconciled)
               scoring        the only place the score formula lives
               metrics        scan aggregation, share of voice, competitor insights
               queries        buyer-question generator
               recommendations rules engine
               scans          resumable pipeline (create → process → finalize)
               scheduler      due scans, stalled-scan recovery, weekly reports
               alerts         score drops, visibility lost, competitor overtakes
                    │
                    ▼
             Postgres (Supabase)  ◄── Supabase Auth (auth.users → profiles trigger)
```

**Scan pipeline** (`services/scans/pipeline.ts`):

1. Load project · 2. Load active questions (priority order) · 3. Verify usage limits (truncates to the remaining monthly quota, hard cost cap) · 4–5. Execute provider queries and store raw results (`ai_runs`) · 6–7. Analyze and store (`ai_analysis`, `sources`) · 8–9. Calculate metrics and compare competitors · 10. Upsert recommendations · 11–12. Store the scan summary (`scans.metrics`) and update the project · 13. Alerts, notifications and emails.

Each `(question × provider)` pair is an `ai_runs` row. Workers claim pending rows with `FOR UPDATE SKIP LOCKED`, so processing is resumable, parallel‑safe and never blocks a browser request. The browser polls `GET /api/scans/:id` for progress (queued → running → completed / failed).

**Authorization.** Every project read goes through `getProjectForUser(userId, projectId)`, which returns a branded `AuthorizedProject` type. Project‑scoped repository functions only accept that type, so a browser‑supplied id cannot be used without an ownership check (IDOR protection by construction). Row Level Security policies mirror these rules for any access through the Supabase Data API.

**Entitlements.** `lib/billing/plans.ts` is the single source of truth for prices and limits; `lib/billing/entitlements.ts` enforces them on the server (projects, competitors per project, monthly queries, monitoring frequency, history, features).

## Database

Schema: [`supabase/migrations/20261007000000_initial_schema.sql`](supabase/migrations/20261007000000_initial_schema.sql); typed access in [`db/schema.ts`](db/schema.ts).

| Table | Purpose |
| --- | --- |
| `profiles` | 1:1 with `auth.users`; preferences, onboarding/tour state |
| `organizations`, `organization_members` | Future agency workspaces (projects already support `organization_id`) |
| `subscriptions` | Plan, status, Stripe ids, billing period, trial |
| `projects` | Monitored businesses, monitoring schedule, latest/previous score |
| `competitors`, `queries` | Tracked competitors and buyer questions |
| `scans` | One monitoring run; status/progress; `metrics` snapshot (JSON) |
| `ai_runs` | Raw provider results: response, citations, model, tokens, latency, estimated cost |
| `ai_analysis` | Structured analysis per run (mentioned, recommended, position, sentiment, citation, evidence, competitors) |
| `sources` | Citations (URL, domain, title, own/competitor flags) |
| `recommendations` | Actionable recommendations with status |
| `reports` | Point‑in‑time report snapshots |
| `usage_records` | Queries, provider calls, reports — usage limits and cost accounting |
| `notifications` | Alerts and weekly report markers |
| `free_checks` | Anonymous checker results (hashed IPs only) |
| `rate_limits`, `stripe_events` | Fixed‑window rate limiting; webhook idempotency |

Indexes cover `user_id`, `project_id`, `query_id`, `scan_id`, `provider` and `created_at` lookups. RLS is enabled on every table. Dashboards read the precomputed `scans.metrics` snapshot rather than aggregating raw rows on every page load; raw rows are kept so scores can be recalculated (`recalculateScan`) when the scoring model changes.

## Scoring model

Defined only in [`services/scoring/index.ts`](services/scoring/index.ts). Per answer (question × provider), max 100:

| Signal | Points |
| --- | --- |
| Mentioned | 25 |
| Recommended | 30 |
| Position (when recommended) | #1 = 20, #2 = 18, #3 = 16, #4 = 10, #5 = 8, #6 = 6, #7–10 = 4, below = 2 |
| Own website cited | 15 |
| Sentiment | positive 10 · neutral 5 · negative 0 |

Not mentioned = 0. Project, provider and competitor scores are averages of answer scores. Share of voice is the share of all detected recommendations. This is a proprietary monitoring metric based on the monitored questions and providers — **not** a search‑engine ranking, and AI answers vary between runs.

## Background jobs & scheduling

- **Default (no extra infrastructure):** a scan created from the UI is processed in‑process after the response with `after()`. `GET /api/cron/process-scans` resumes anything that stopped early (deploys, timeouts).
- **Scheduled monitoring:** `GET /api/cron/scheduled-scans` creates scans for projects whose `next_scan_at` is due (daily/weekly/monthly) and starts processing; `GET /api/cron/weekly-reports` sends weekly emails. `vercel.json` schedules these with Vercel Cron; any scheduler can call them with `Authorization: Bearer $CRON_SECRET`.
- **Inngest (optional):** set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` and scans are sent as `scan/requested` events to durable step functions (`lib/jobs/inngest.ts`, served at `/api/inngest`), with Inngest crons for scheduling and weekly reports.

## Security

- Supabase sessions are verified with `auth.getUser()`; every page, action and route re‑checks the user (the proxy redirect is only a convenience).
- Ownership checks on every project‑scoped read and write (branded `AuthorizedProject`), UUID validation for child ids, RLS as defense‑in‑depth.
- Zod validation for all inputs; Drizzle parameterized queries (no string SQL from user input); provider output rendered as text (never as HTML).
- Server Actions have built‑in CSRF protection; billing POST routes check the `Origin` header; Stripe webhooks verify signatures and are idempotent; cron routes require a bearer secret (constant‑time comparison).
- Database‑backed rate limits on scans, query generation, reports, auth attempts and the free checker; per‑scan cost cap; free checker simulated by default and capped daily.
- Secrets are server‑only; logs redact sensitive keys; error messages shown to users never include internals.
- Security headers (HSTS, frame denial, nosniff, referrer and permissions policies); private pages are `noindex` and excluded in `robots.txt`.

## Testing

```bash
npm test                    # unit: scoring, analyzer (+LLM validation), generator, metrics,
                            # recommendations, entitlements, alerts, simulator, domains
npm run test:integration    # Postgres: full scan pipeline, user isolation, plan limits,
                            # rate limiter, scheduler (needs DATABASE_URL)
npm run test:e2e            # Playwright: signup → onboarding → scan → dashboard → recommendations → billing
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and a production build, plus integration tests against a Postgres service (using `tests/support/auth-stub.sql` in place of Supabase's `auth` schema).

## Deployment

**Vercel (recommended)**

1. Create the Supabase project, apply migrations (`npm run setup -- --remote`) and configure Auth URLs.
2. Import the repository into Vercel; set all environment variables from `.env.example` (`NEXT_PUBLIC_APP_URL` = your production URL, `DATABASE_URL` = pooler URL, `CRON_SECRET` = a long random string).
3. Deploy. `vercel.json` registers the cron jobs.
4. Configure the Stripe webhook to `https://<domain>/api/stripe/webhook` and run `npm run stripe:setup` against your live key only when ready (`--live`).
5. For live monitoring set `AI_VISIBILITY_MOCK_MODE=false` and provider keys. Optionally configure Inngest for durable jobs and Resend for email.

**Other hosts** — any Node.js 20.9+ host works (`npm run build && npm start`). Call the cron endpoints from your scheduler of choice.

## Production considerations

- Turn on email confirmation in Supabase and customize email templates.
- Use the transaction pooler for `DATABASE_URL`; tune `DATABASE_POOL_MAX` for your platform.
- Set `MAX_PROVIDER_CALLS_PER_SCAN`, plan quotas and `FREE_CHECK_DAILY_LIMIT` to match your budget; monitor `usage_records.estimated_cost_usd`.
- Long scans: in‑process processing is bounded by your function `maxDuration`; the cron worker resumes unfinished work, and Inngest is recommended at scale.
- Provider APIs, models and output formats change — models are configurable via env, provider code is isolated behind `AIProvider`, and failures degrade gracefully.
- Keep `/admin` disabled in production (`ENABLE_DEV_TOOLS=false`); when enabled it is restricted to `profiles.is_admin` users.
- Add an error tracker (e.g. Sentry) and log drain for the structured JSON logs.

### Known limitations

- Agency workspaces (organizations, members, client access) are modeled in the database but not yet exposed in the UI.
- PDF export uses the browser's print‑to‑PDF on a print‑optimized report page (no server‑side PDF rendering yet).
- Provider APIs do not expose user location; local questions include the city explicitly.
- Scores reflect the monitored questions and providers at scan time; AI answers vary between runs.

## Project structure

```
app/
  (marketing)/        landing, features, pricing, about, privacy, terms, demo, free checker
  (auth)/             login, signup, forgot/reset password
  (app)/              dashboard, projects/[projectId]/*, settings, billing, admin
  onboarding/         4-step onboarding wizard
  actions/            server actions (validated, return ActionResult)
  api/                scans progress, billing, Stripe webhook, cron, Inngest
components/           ui/ (design system), app/, dashboard/, overview/, …
db/                   schema.ts (Drizzle), repositories/ (authorized data access)
lib/                  env, auth, billing (plans, entitlements, Stripe), jobs, email, rate limit, analytics
services/             ai/, scoring/, metrics/, queries/, recommendations/, scans/, scheduler/, alerts/, …
schemas/              shared Zod schemas
supabase/             migrations + CLI config
scripts/              setup, migrate, seed, stripe-setup
tests/                unit/, integration/, e2e/, fixtures/
```
