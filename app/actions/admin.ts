"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { getProfile } from "@/db/repositories/profiles";
import { getProjectForUser, listCompetitors, toBusinessContext, toCompetitorContexts } from "@/db/repositories/projects";
import { getLatestCompletedScan } from "@/db/repositories/scans";
import { subscriptions } from "@/db/schema";
import { runAction } from "@/lib/action-utils";
import { requireUserOrThrow } from "@/lib/auth/session";
import { PLAN_IDS } from "@/lib/billing/plans";
import { features, isProduction } from "@/lib/env";
import { forbidden, validationError } from "@/lib/errors";
import { enqueueScan } from "@/lib/jobs/runner";
import { logger } from "@/lib/logger";
import { analyzeResponse } from "@/services/ai/analyzer";
import { analyzeHeuristically } from "@/services/ai/analyzer/heuristic";
import { getProvider } from "@/services/ai/providers/registry";
import { seedDemoProject } from "@/services/demo/seed";
import { regenerateQueries } from "@/services/projects/service";
import { createScan, recalculateScan } from "@/services/scans/pipeline";
import { enqueueDueScans, processPendingScans } from "@/services/scheduler";
import { PROVIDER_IDS } from "@/types/domain";

/**
 * Development tools. Available in development, or in production only when
 * ENABLE_DEV_TOOLS=true AND the user is an admin. Every action re-checks this
 * guard on the server and only ever touches the signed-in user's own data.
 */
async function requireDevUser() {
  const user = await requireUserOrThrow();
  if (!features.devTools()) throw forbidden("Development tools are disabled.");
  if (isProduction()) {
    const profile = await getProfile(user.id);
    if (!profile?.isAdmin) throw forbidden("Development tools are restricted to admins.");
  }
  return user;
}

const projectIdSchema = z.object({ projectId: z.uuid() });

export async function adminTriggerScanAction(input: { projectId: string; simulate: boolean }) {
  return runAction(async () => {
    const user = await requireDevUser();
    const { projectId, simulate } = projectIdSchema.extend({ simulate: z.boolean() }).parse(input);
    const project = await getProjectForUser(user.id, projectId);
    const scan = await createScan({ project, userId: user.id, trigger: simulate ? "demo" : "manual", mode: simulate ? "mock" : undefined });
    const driver = await enqueueScan(scan.id);
    revalidatePath(`/projects/${projectId}`, "layout");
    logger.info("admin.scan_triggered", { projectId, scanId: scan.id, mode: scan.mode });
    return { scanId: scan.id, mode: scan.mode, items: scan.totalItems, driver };
  }, "admin.trigger_scan");
}

export async function adminGenerateQueriesAction(input: { projectId: string; count: number }) {
  return runAction(async () => {
    const user = await requireDevUser();
    const { projectId, count } = projectIdSchema.extend({ count: z.number().int().min(1).max(50) }).parse(input);
    const project = await getProjectForUser(user.id, projectId);
    const added = await regenerateQueries(project, count);
    revalidatePath(`/projects/${projectId}/queries`);
    return { added };
  }, "admin.generate_queries");
}

export async function adminSeedDemoAction() {
  return runAction(async () => {
    const user = await requireDevUser();
    const project = await seedDemoProject({ userId: user.id, name: "ABC Dental (Demo)", weeks: 6 });
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { projectId: project.id, score: project.latestScore };
  }, "admin.seed_demo");
}

const inspectSchema = z.object({
  projectId: z.uuid().optional(),
  provider: z.enum(PROVIDER_IDS),
  mode: z.enum(["mock", "live"]),
  query: z.string().trim().min(5).max(300),
});

export async function adminInspectProviderAction(input: z.input<typeof inspectSchema>) {
  return runAction(async () => {
    const user = await requireDevUser();
    const data = inspectSchema.parse(input);
    const provider = getProvider(data.provider, data.mode);
    if (!provider.isConfigured()) throw validationError(`${data.provider} is not configured for live calls.`);
    let context: Partial<Parameters<typeof provider.runQuery>[0]> = {};
    if (data.projectId) {
      const project = await getProjectForUser(user.id, data.projectId);
      context = { businessContext: toBusinessContext(project), competitors: toCompetitorContexts(await listCompetitors(project)) };
    }
    const result = await provider.runQuery({ query: data.query, seed: "admin-inspect", ...context });
    // Drop the raw payload; show the normalized result only.
    return { ...result, raw: undefined };
  }, "admin.inspect_provider");
}

const analysisSchema = z.object({
  response: z.string().trim().min(10).max(12_000),
  businessName: z.string().trim().min(1).max(120),
  businessDomain: z.string().trim().max(200).optional(),
  competitors: z.array(z.string().trim().min(1).max(120)).max(20),
  useLlm: z.boolean(),
});

export async function adminRunAnalysisAction(input: z.input<typeof analysisSchema>) {
  return runAction(async () => {
    await requireDevUser();
    const data = analysisSchema.parse(input);
    const analyzerInput = {
      response: data.response,
      citations: [],
      business: { name: data.businessName, domain: data.businessDomain || null },
      competitors: data.competitors.map((name, i) => ({ id: `c${i + 1}`, name })),
    };
    const heuristic = analyzeHeuristically(analyzerInput);
    const llm = data.useLlm && !features.mockMode() ? await analyzeResponse(analyzerInput, { isMock: false }) : null;
    return { heuristic, llm };
  }, "admin.run_analysis");
}

export async function adminRecalculateAction(input: { projectId: string }) {
  return runAction(async () => {
    const user = await requireDevUser();
    const { projectId } = projectIdSchema.parse(input);
    const project = await getProjectForUser(user.id, projectId);
    const scan = await getLatestCompletedScan(project);
    if (!scan) throw validationError("This project has no completed scan yet.");
    const before = scan.score;
    const metrics = await recalculateScan(scan.id);
    revalidatePath(`/projects/${projectId}`, "layout");
    return { scanId: scan.id, before, after: metrics.overall.score };
  }, "admin.recalculate");
}

const planSchema = z.object({
  plan: z.enum(PLAN_IDS),
  status: z.enum(["trialing", "active", "canceled"]),
  trialDays: z.number().int().min(-30).max(60),
});

export async function adminSetPlanAction(input: z.input<typeof planSchema>) {
  return runAction(async () => {
    const user = await requireDevUser();
    if (isProduction()) throw forbidden("Plan overrides are disabled in production.");
    const data = planSchema.parse(input);
    await db()
      .update(subscriptions)
      .set({
        plan: data.plan,
        status: data.status,
        trialEndsAt: data.status === "trialing" ? new Date(Date.now() + data.trialDays * 86_400_000) : null,
      })
      .where(and(eq(subscriptions.userId, user.id)));
    revalidatePath("/", "layout");
    logger.info("admin.plan_override", { userId: user.id, plan: data.plan, status: data.status });
    return data;
  }, "admin.set_plan");
}

export async function adminRunSchedulerAction() {
  return runAction(async () => {
    await requireDevUser();
    const created = await enqueueDueScans();
    const processed = await processPendingScans(20_000);
    return { created: created.length, processed: processed.length };
  }, "admin.run_scheduler");
}
