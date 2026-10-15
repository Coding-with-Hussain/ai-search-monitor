import "server-only";

import { createHash } from "node:crypto";

import type { z } from "zod";

import { db } from "@/db";
import { freeChecks } from "@/db/schema";
import { track } from "@/lib/analytics/server";
import { extractDomain, normalizeWebsite } from "@/lib/domain";
import { env, features } from "@/lib/env";
import { AppError, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { freeCheckSchema } from "@/schemas/free-check";
import { analyzeHeuristically } from "@/services/ai/analyzer/heuristic";
import { getProvider } from "@/services/ai/providers/registry";
import { generateQueries } from "@/services/queries/generator";
import { scoreResult } from "@/services/scoring";
import type { BusinessContext, ProviderId } from "@/types/domain";
import type { FreeCheckResult } from "@/types/free-check";

/**
 * Public free AI visibility check (lead generation).
 *
 * Cost safety: simulated unless FREE_CHECK_LIVE=true AND simulation mode is
 * off; live checks use ONE configured provider × 3 questions, are limited per
 * hashed IP per day and by a global daily cap, and use the free heuristic
 * analyzer (no LLM analysis cost). Raw IPs are never stored.
 */

const QUESTION_COUNT = 3;
const LIVE_PROVIDER_ORDER: ProviderId[] = ["perplexity", "chatgpt", "gemini"];

type Input = z.output<typeof freeCheckSchema>;

function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * The unit a visitor is rate limited by: the IPv4 address, or the /64 prefix
 * for IPv6 (one subscriber usually controls a whole /64, i.e. 2^64 addresses).
 */
export function clientKey(ip: string) {
  const v = ip.trim().toLowerCase().replace(/%.*$/, "");
  const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  if (!v.includes(":")) return v;
  const [head, tail] = v.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

export function hashIp(ip: string, now = new Date()) {
  const salt = env().CRON_SECRET ?? "aivm-free-check";
  return createHash("sha256").update(`free-check:${dayKey(now)}:${salt}:${clientKey(ip)}`).digest("hex");
}

function pickProviders(): { mode: "live" | "mock"; providers: ProviderId[] } {
  if (features.mockMode() || !env().FREE_CHECK_LIVE) return { mode: "mock", providers: ["chatgpt", "gemini", "perplexity"] };
  const live = LIVE_PROVIDER_ORDER.find((id) => getProvider(id, "live").isConfigured());
  return live ? { mode: "live", providers: [live] } : { mode: "mock", providers: ["chatgpt", "gemini", "perplexity"] };
}

function topIssue(name: string, result: Omit<FreeCheckResult, "topIssue">): FreeCheckResult["topIssue"] {
  const instead = result.competitors.slice(0, 3).map((c) => c.name);
  const total = result.questions.length;
  const mentioned = result.questions.filter((q) => q.mentioned).length;
  const recommended = result.questions.filter((q) => q.recommended).length;
  const positions = result.questions.filter((q) => q.recommended && q.position).map((q) => q.position as number);
  const avgPos = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null;

  if (mentioned === 0) {
    return {
      title: "AI isn't recommending you for high-intent questions",
      detail: `${name} wasn't mentioned in any of the ${total} answers we checked.${instead.length ? ` AI recommended ${instead.join(", ")} instead.` : ""}`,
    };
  }
  if (recommended < mentioned) {
    return {
      title: "You're mentioned, but not always recommended",
      detail: `${name} appeared in ${mentioned} of ${total} answers but was recommended in ${recommended}. Clear proof points (reviews, results, credentials) make recommendations more likely.`,
    };
  }
  if (avgPos !== null && avgPos > 3) {
    return {
      title: "You appear below other businesses",
      detail: `When recommended, ${name} was listed around position #${avgPos.toFixed(1)}.${instead.length ? ` ${instead[0]} tends to appear first.` : ""}`,
    };
  }
  if (mentioned < total) {
    return {
      title: "Your visibility is inconsistent",
      detail: `${name} appeared in ${mentioned} of ${total} answers. AI answers vary between questions and platforms — weekly monitoring shows where you're missing.`,
    };
  }
  return {
    title: "Good start — keep an eye on it",
    detail: `${name} was recommended in every answer we checked. AI answers change over time and competitors can catch up, so monitor regularly.`,
  };
}

export async function runFreeCheck(input: Input, ip: string): Promise<{ id: string; result: FreeCheckResult }> {
  if (input.company) {
    // Honeypot filled: likely a bot. Fail with a generic message.
    logger.warn("free_check.honeypot");
    throw validationError("We couldn't run the check. Please try again.");
  }

  const ipHash = hashIp(ip);
  await enforceRateLimit(
    `free-check:${ipHash}`,
    RATE_LIMITS.freeCheck.limit,
    RATE_LIMITS.freeCheck.windowSeconds,
    "You've used today's free checks. Create a free account to monitor your AI visibility every week.",
  );

  // Global daily budget, reserved atomically before any provider call so
  // concurrent bursts cannot overspend it. Failed checks count too.
  await enforceRateLimit(
    `free-check:global:${dayKey()}`,
    env().FREE_CHECK_DAILY_LIMIT,
    86_400,
    "The free checker is at capacity today. Please try again tomorrow — or start a free trial for full monitoring.",
  );

  const website = normalizeWebsite(input.website);
  const business: BusinessContext = {
    name: input.businessName,
    website,
    domain: extractDomain(website),
    industry: input.industry,
    businessType: input.businessType,
    city: input.city ?? null,
    country: input.country ?? null,
    services: [],
  };
  const questions = generateQueries({ business, competitors: [], count: QUESTION_COUNT });
  if (questions.length === 0) throw validationError("Add a little more detail (industry and city) so we can build questions.");

  const { mode, providers } = pickProviders();
  const seed = `free-check:${dayKey()}`;

  const calls = questions.flatMap((q) => providers.map((provider) => ({ q, provider })));
  const outcomes = await Promise.all(
    calls.map(async ({ q, provider }) => {
      try {
        const result = await getProvider(provider, mode).runQuery({ query: q.text, businessContext: business, competitors: [], seed });
        const analysis = analyzeHeuristically({
          response: result.response,
          citations: result.citations,
          business: { name: business.name, domain: business.domain },
          competitors: [],
        });
        return { q, provider, result, analysis };
      } catch (error) {
        logger.warn("free_check.provider_failed", { provider, error: (error as Error).message });
        return null;
      }
    }),
  );
  const ok = outcomes.filter((o): o is NonNullable<typeof o> => o !== null);
  if (ok.length === 0) {
    throw new AppError("NOT_CONFIGURED", "We couldn't reach the AI assistants right now. Please try again in a few minutes.", 503);
  }

  const scores = ok.map((o) => scoreResult(o.analysis));
  const pct = (n: number) => Math.round((n / ok.length) * 1000) / 10;
  const otherCounts = new Map<string, number>();
  for (const o of ok) for (const b of o.analysis.otherBusinesses) otherCounts.set(b.name, (otherCounts.get(b.name) ?? 0) + 1);

  const base: Omit<FreeCheckResult, "topIssue"> = {
    businessName: business.name,
    isSimulation: mode === "mock",
    score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    mentionRate: pct(ok.filter((o) => o.analysis.mentioned).length),
    recommendationRate: pct(ok.filter((o) => o.analysis.recommended).length),
    providers: providers.map((provider) => {
      const rows = ok.filter((o) => o.provider === provider);
      const s = rows.map((o) => scoreResult(o.analysis));
      return {
        provider,
        score: s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10 : 0,
        mentioned: rows.filter((o) => o.analysis.mentioned).length,
        total: rows.length,
      };
    }),
    questions: ok.map((o) => ({
      text: o.q.text,
      provider: o.provider,
      mentioned: o.analysis.mentioned,
      recommended: o.analysis.recommended,
      position: o.analysis.position,
      recommendedInstead: o.analysis.otherBusinesses.map((b) => b.name).slice(0, 4),
    })),
    competitors: [...otherCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, mentions]) => ({ name, mentions })),
  };
  const result: FreeCheckResult = { ...base, topIssue: topIssue(business.name, base) };
  const cost = ok.reduce((s, o) => s + o.result.estimatedCostUsd, 0);

  const [row] = await db()
    .insert(freeChecks)
    .values({
      ipHash,
      businessName: business.name,
      website,
      industry: business.industry,
      location: [business.city, business.country].filter(Boolean).join(", ") || null,
      mode,
      result,
      estimatedCostUsd: Math.round(cost * 1_000_000) / 1_000_000,
    })
    .returning({ id: freeChecks.id });

  await track("free_check_completed", `anon:${ipHash.slice(0, 16)}`, { mode, score: result.score, providers: providers.length });
  logger.info("free_check.completed", { mode, providers, cost });
  return { id: row.id, result };
}
