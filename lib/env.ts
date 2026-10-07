import "server-only";

import { z } from "zod";

/**
 * Server-side environment, validated with Zod on first access.
 *
 * Optional integrations (Stripe, AI providers, Inngest, email, analytics)
 * degrade gracefully when their variables are missing; use the `features`
 * helpers below instead of reading `process.env` directly.
 */

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const intWithDefault = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? Number.parseInt(v, 10) : Number.NaN;
      return Number.isFinite(n) ? n : fallback;
    });

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  DATABASE_URL: optionalString,

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,

  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_WEB_SEARCH: bool(true),
  GOOGLE_AI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  PERPLEXITY_API_KEY: optionalString,
  PERPLEXITY_MODEL: z.string().default("sonar"),
  ANALYSIS_MODE: z.enum(["auto", "heuristic", "llm"]).default("auto"),
  ANALYSIS_MODEL: z.string().default("gpt-5-mini"),

  AI_VISIBILITY_MOCK_MODE: bool(true),
  MOCK_LATENCY_MS: intWithDefault(250),
  MAX_PROVIDER_CALLS_PER_SCAN: intWithDefault(600),
  SCAN_CONCURRENCY: intWithDefault(4),
  FREE_CHECK_LIVE: bool(false),
  FREE_CHECK_DAILY_LIMIT: intWithDefault(100),

  CRON_SECRET: optionalString,
  INNGEST_EVENT_KEY: optionalString,
  INNGEST_DEV: bool(false),

  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.string().default("AI Visibility <reports@example.com>"),

  ENABLE_DEV_TOOLS: bool(false),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Reset the cached env (tests only). */
export function resetEnvCache() {
  cached = null;
}

export const features = {
  supabase: () => Boolean(env().NEXT_PUBLIC_SUPABASE_URL && env().NEXT_PUBLIC_SUPABASE_ANON_KEY),
  database: () => Boolean(env().DATABASE_URL),
  stripe: () => Boolean(env().STRIPE_SECRET_KEY),
  stripeWebhooks: () => Boolean(env().STRIPE_SECRET_KEY && env().STRIPE_WEBHOOK_SECRET),
  mockMode: () => env().AI_VISIBILITY_MOCK_MODE,
  inngest: () => Boolean(env().INNGEST_EVENT_KEY) || env().INNGEST_DEV,
  email: () => Boolean(env().RESEND_API_KEY),
  serviceRole: () => Boolean(env().SUPABASE_SERVICE_ROLE_KEY),
  /**
   * Dev tools are always available in development. In production they require
   * ENABLE_DEV_TOOLS=true *and* an admin user (checked at the call site).
   */
  devTools: () => env().NODE_ENV !== "production" || env().ENABLE_DEV_TOOLS,
};

export function isProduction() {
  return env().NODE_ENV === "production";
}

export function appUrl(path = "") {
  const base = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}
