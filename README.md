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
- [Free AI visibility checker](#free-ai-visibility-checker)
- [Development tools](#development-tools)
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
| `STRIPE_PORTAL_CONFIGURATION_ID` | optional | Customer Portal configuration (`npm run stripe:setup` prints one) |
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
| `DATABASE_POOL_MAX` | optional | Postgres pool size per server instance (default 5) |

Server configuration is validated with Zod on first use (`lib/env.ts`). Secrets are only read on the server; nothing secret uses the `NEXT_PUBLIC_` prefix.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **API keys** — Project Settings → API: copy the URL and anon (publishable) key into `NEXT_PUBLIC_SUPABASE_*`, and the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
3. **Database URL** — Connect → *Transaction pooler* (port 6543) into `DATABASE_URL` for production. The client uses `prepare: false`, which the pooler requires.
4. **Migrations** — `npm run setup -- --remote` (or `supabase link && supabase db push`). Both tools share the `supabase_migrations.schema_migrations` table, so they can be mixed.
5. **Auth settings** — Authentication → URL configuration: set *Site URL* to your app URL and add `https://<your-domain>/auth/callback` and `https://<your-domain>/auth/confirm` to the redirect allow list. Enable *Confirm email* in production.
6. **Email templates (recommended)** — the default templates use the PKCE `/auth/callback` link, which only works in the browser that requested it. To make links work on any device, point the templates at the token‑hash route:
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
   - Magic link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

   `next` is restricted to same‑site paths.
7. **Seed (optional, non‑production)** — `npm run seed` creates `demo@aivisibility.dev` / `demo-password-123` with a six‑week simulated history. It refuses to run against a production `NODE_ENV`.

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

## Free AI visibility checker

`/free-ai-visibility-check` lets anonymous visitors try the product: a business name, website and a few details produce a small check (3 buyer questions) with a preview score, the competitors AI named instead, and a CTA to start monitoring. Abuse controls:

- Simulated by default (`FREE_CHECK_LIVE=false`) and labeled as such. In live mode it runs **one** provider × 3 questions with the heuristic analyzer only.
- Per‑IP rate limit (IP addresses are stored only as a daily‑salted SHA‑256 hash), a hidden honeypot field, and a global daily cap (`FREE_CHECK_DAILY_LIMIT`) after which the checker politely declines until the next day.

## Development tools

`/admin` (development only by default) provides: trigger a scan (simulated or live), generate questions, seed a demo project, inspect a single provider's raw normalized output, run the analyzer on any text (heuristic and LLM side by side), recalculate a scan's score, switch your own plan/status/trial, and run the scheduler once. Every tool is a server action that re‑checks the guard and only touches the signed‑in user's own data. In production the page and actions return 404/403 unless `ENABLE_DEV_TOOLS=true` **and** the user has `profiles.is_admin = true`; plan overrides are always disabled in production.

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

**Authorization.** Every project read goes through `getProjectForUser(userId, projectId)`, which returns a branded `AuthorizedProject` type. Project‑scoped repository functions only accept that type, so a browser‑supplied id cannot be used without an ownership check (IDOR protection by construction). The app writes only from the server, so through the Supabase Data API signed‑in users can **read** their own rows (RLS) and write nothing; the anonymous role has no table access at all.

**Entitlements.** `lib/billing/plans.ts` is the single source of truth for prices and limits; `lib/billing/entitlements.ts` enforces them on the server (projects, competitors per project, monthly queries, monitoring frequency, history, features).

- Checks and the inserts they guard run in one transaction holding a per‑account advisory lock, so parallel requests cannot exceed a limit together; a unique index allows one active scan per project.
- A "query" is one buyer question checked across the project's AI platforms. Usage is reserved when a scan starts and settled when it ends: questions that got no answer from any platform are not charged.
- The allowance is monthly: the calendar month during trials, then the Stripe billing period (annual plans use month‑long windows anchored on the subscription start).
- After a downgrade nothing is deleted. Schedules the plan no longer includes (daily) move to weekly with an in‑app notice, and only the oldest projects within the new project limit keep scanning; the rest stay readable.

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
- **Scheduled monitoring:** `GET /api/cron/scheduled-scans` creates scans for projects whose `next_scan_at` is due (daily/weekly/monthly) and starts processing. A scheduled scan moves the schedule forward when it is created, so a failing scan is not retried every tick (the owner is notified instead). `GET /api/cron/weekly-reports` runs daily and emails each project's report at most once a week, resuming where it stopped and retrying failed sends. `vercel.json` schedules these with Vercel Cron; any scheduler can call them with `Authorization: Bearer $CRON_SECRET`.
- **Vercel plan note:** the bundled `vercel.json` runs the scan worker every 5 minutes and the scheduler every 15 minutes, which needs Vercel Pro. On Hobby (daily crons only) change both schedules to once a day and rely on `after()` for user‑started scans, or use Inngest or an external scheduler (GitHub Actions, cron‑job.org) to call the endpoints more often.
- **Inngest (optional):** set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` and scans are sent as `scan/requested` events to durable step functions (`lib/jobs/inngest.ts`, served at `/api/inngest`), with Inngest crons for scheduling and weekly reports.

## Security

- Supabase sessions are verified with `auth.getUser()`; every page, action and route re‑checks the user (the proxy redirect is only a convenience).
- Ownership checks on every project‑scoped read and write (branded `AuthorizedProject`), UUID validation for child ids, RLS as defense‑in‑depth.
- Zod validation for all inputs; Drizzle parameterized queries (no string SQL from user input); provider output rendered as text (never as HTML).
- Server Actions have built‑in CSRF protection; billing POST routes check the `Origin` header; Stripe webhooks verify signatures and are idempotent; cron routes require a bearer secret (constant‑time comparison).
- Database‑backed rate limits on scans, query generation, reports, auth attempts and the free checker; a hard per‑scan cost cap (each AI platform at most once per question); free checker simulated by default, with a daily budget reserved atomically and IPv6 visitors limited per /64.
- Secrets are server‑only; logs redact sensitive keys; error messages shown to users never include internals.
- Security headers (HSTS, frame denial, nosniff, referrer and permissions policies); private pages are `noindex` and excluded in `robots.txt`.

## Testing

```bash
npm test                    # 97 unit tests: scoring, analyzer (+LLM validation), generator, metrics,
                            # recommendations, entitlements, alerts, simulator, domains, schemas
npm run test:integration    # 29 Postgres tests: scan pipeline and recovery, user isolation, RLS roles,
                            # plan limits under concurrency, downgrades, scheduler, weekly reports
npm run test:e2e            # 9 Playwright tests: signup → onboarding → scan → dashboard →
                            # recommendations → billing, cross-user access, public site, mobile
```

Integration tests blank all provider, Stripe and email keys, so they never make paid calls.

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
- After a downgrade, competitors above the new per‑project limit are kept and still analyzed; new ones cannot be added until the project is under the limit.
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
