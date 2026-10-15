import { and, count, eq, gte, sql } from "drizzle-orm";

import { db, type DbExecutor } from "@/db";
import { competitors, projects, subscriptions, usageRecords } from "@/db/schema";
import { AppError, planLimitError } from "@/lib/errors";

import { getPlan, type Plan, TRIAL_DAYS } from "./plans";

/**
 * Central entitlement checks. Every limit is read from the plan catalogue and
 * enforced here on the server — UI checks are only for messaging.
 */

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface Entitlements {
  plan: Plan;
  status: SubscriptionStatus;
  /** Can run scans and create resources. */
  active: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  periodStart: Date;
  periodEnd: Date;
  hasStripeSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  /** Human-readable reason when inactive. */
  inactiveReason: string | null;
}

export interface UsageSummary {
  queriesUsed: number;
  queriesLimit: number;
  projectsUsed: number;
  projectsLimit: number;
  reportsGenerated: number;
  periodStart: Date;
  periodEnd: Date;
}

function calendarMonth(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Add whole months in UTC, clamping to the last day of shorter months. */
function addUtcMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Usage window: the paid Stripe billing period when one exists and is
 * current, otherwise the calendar month (UTC). Trials (in-app or a short
 * Stripe trial carried over at checkout) use the calendar month, so moving
 * between them does not reset the allowance; it resets when paid billing
 * starts.
 */
export function usagePeriod(
  sub: { currentPeriodStart: Date | null; currentPeriodEnd: Date | null; status?: SubscriptionStatus } | null,
  now = new Date(),
) {
  if (
    sub?.status !== "trialing" &&
    sub?.currentPeriodStart &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd > now &&
    sub.currentPeriodStart <= now
  ) {
    const start = sub.currentPeriodStart;
    const lengthDays = (sub.currentPeriodEnd.getTime() - start.getTime()) / 86_400_000;
    if (lengthDays <= 32) return { start, end: sub.currentPeriodEnd };
    // Annual billing: allowances are monthly, so use the current month-long
    // window anchored on the billing period start.
    let k = 0;
    while (addUtcMonths(start, k + 1) <= now) k++;
    const windowStart = addUtcMonths(start, k);
    const windowEnd = addUtcMonths(start, k + 1);
    return { start: windowStart, end: windowEnd < sub.currentPeriodEnd ? windowEnd : sub.currentPeriodEnd };
  }
  return calendarMonth(now);
}

export function resolveEntitlements(
  sub: {
    plan: string;
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    stripeSubscriptionId: string | null;
    cancelAtPeriodEnd: boolean;
  } | null,
  now = new Date(),
): Entitlements {
  const plan = getPlan(sub?.plan);
  const status: SubscriptionStatus = sub?.status ?? "trialing";
  const trialEndsAt = sub?.trialEndsAt ?? null;
  const trialActive = status === "trialing" && (!trialEndsAt || trialEndsAt > now);
  const active = status === "active" || status === "past_due" || trialActive;
  const period = usagePeriod(sub, now);
  let inactiveReason: string | null = null;
  if (!active) {
    inactiveReason =
      status === "trialing"
        ? `Your ${TRIAL_DAYS}-day trial has ended. Choose a plan to keep monitoring.`
        : status === "canceled"
          ? "Your subscription has been canceled. Choose a plan to resume monitoring."
          : "Your subscription is not active. Update your billing details to resume monitoring.";
  }
  return {
    plan,
    status,
    active,
    isTrial: status === "trialing",
    trialEndsAt,
    periodStart: period.start,
    periodEnd: period.end,
    hasStripeSubscription: Boolean(sub?.stripeSubscriptionId),
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    inactiveReason,
  };
}

export async function getEntitlements(userId: string, executor: DbExecutor = db()): Promise<Entitlements> {
  const rows = await executor.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return resolveEntitlements(rows[0] ?? null);
}

/**
 * Run `fn` in a transaction that holds a per-account advisory lock. Limit
 * checks and the inserts they guard must both happen inside `fn` (using `tx`),
 * so concurrent requests from one account cannot all pass a check and exceed
 * the plan together. The lock is released when the transaction ends.
 */
export async function withEntitlementLock<T>(accountId: string, fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  return db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`entitlements:${accountId}`}, 0))`);
    return fn(tx);
  });
}

export async function getQueriesUsed(userId: string, since: Date, executor: DbExecutor = db()) {
  const [row] = await executor
    .select({ total: sql<number>`coalesce(sum(${usageRecords.quantity}), 0)::int` })
    .from(usageRecords)
    .where(and(eq(usageRecords.userId, userId), eq(usageRecords.kind, "query_run"), gte(usageRecords.createdAt, since)));
  return Number(row?.total ?? 0);
}

export async function getUsageSummary(userId: string, ent?: Entitlements): Promise<UsageSummary> {
  const e = ent ?? (await getEntitlements(userId));
  const [queriesUsed, [projectRow], [reportRow]] = await Promise.all([
    getQueriesUsed(userId, e.periodStart),
    db().select({ n: count() }).from(projects).where(eq(projects.userId, userId)),
    db()
      .select({ total: sql<number>`coalesce(sum(${usageRecords.quantity}), 0)::int` })
      .from(usageRecords)
      .where(
        and(eq(usageRecords.userId, userId), eq(usageRecords.kind, "report_generated"), gte(usageRecords.createdAt, e.periodStart)),
      ),
  ]);
  return {
    queriesUsed,
    queriesLimit: e.plan.limits.queriesPerMonth,
    projectsUsed: Number(projectRow?.n ?? 0),
    projectsLimit: e.plan.limits.projects,
    reportsGenerated: Number(reportRow?.total ?? 0),
    periodStart: e.periodStart,
    periodEnd: e.periodEnd,
  };
}

export function assertActive(ent: Entitlements) {
  if (!ent.active) {
    throw new AppError("SUBSCRIPTION_INACTIVE", ent.inactiveReason ?? "Your subscription is not active.", 402);
  }
}

export async function assertCanCreateProject(userId: string, executor: DbExecutor = db()) {
  const ent = await getEntitlements(userId, executor);
  assertActive(ent);
  const [row] = await executor.select({ n: count() }).from(projects).where(eq(projects.userId, userId));
  const used = Number(row?.n ?? 0);
  const max = ent.plan.limits.projects;
  if (used >= max) {
    throw planLimitError(
      `Your ${ent.plan.name} plan includes ${max} project${max === 1 ? "" : "s"}. Upgrade to monitor more businesses.`,
      { limit: "projects", used, max, plan: ent.plan.id },
    );
  }
  return ent;
}

export async function assertCanAddCompetitors(userId: string, projectId: string, adding: number, executor: DbExecutor = db()) {
  const ent = await getEntitlements(userId, executor);
  const max = ent.plan.limits.competitorsPerProject;
  if (max === null) return ent;
  const [row] = await executor.select({ n: count() }).from(competitors).where(eq(competitors.projectId, projectId));
  const used = Number(row?.n ?? 0);
  if (used + adding > max) {
    throw planLimitError(
      `Your ${ent.plan.name} plan allows ${max} competitors per project (${used} used). Upgrade to track more.`,
      { limit: "competitors", used, max, plan: ent.plan.id },
    );
  }
  return ent;
}

/** Remaining monthly queries (never negative). */
export async function remainingQueries(userId: string, ent?: Entitlements, executor: DbExecutor = db()) {
  const e = ent ?? (await getEntitlements(userId, executor));
  const used = await getQueriesUsed(userId, e.periodStart, executor);
  return { used, limit: e.plan.limits.queriesPerMonth, remaining: Math.max(0, e.plan.limits.queriesPerMonth - used), ent: e };
}
