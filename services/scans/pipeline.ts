import { and, asc, desc, eq, inArray, isNull, lt, notInArray, or, sql } from "drizzle-orm";

import { db, type DbExecutor } from "@/db";
import {
  type AuthorizedProject,
  computeNextScanAt,
  getProjectInternal,
  listCompetitors,
  toBusinessContext,
  toCompetitorContexts,
} from "@/db/repositories/projects";
import {
  aiAnalysis,
  aiRuns,
  type AiRun,
  competitors as competitorsTable,
  notifications,
  projects,
  queries as queriesTable,
  recommendations,
  type Scan,
  scans,
  sources,
  usageRecords,
} from "@/db/schema";
import { assertActive, remainingQueries, withEntitlementLock } from "@/lib/billing/entitlements";
import { domainMatches } from "@/lib/domain";
import { env } from "@/lib/env";
import { AppError, conflict, planLimitError, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { analyzeResponse } from "@/services/ai/analyzer";
import { currentScanMode, getProvider } from "@/services/ai/providers/registry";
import { type ProviderResult, ProviderUnavailableError } from "@/services/ai/providers/types";
import { evaluateScanAlerts } from "@/services/alerts";
import { computeScanMetrics, type MetricsRunInput } from "@/services/metrics/aggregate";
import { generateRecommendations } from "@/services/recommendations/engine";
import { scoreResult } from "@/services/scoring";
import { PROVIDER_IDS, type ProviderId, type ScanMetrics, type ScanMode } from "@/types/domain";

import { comparableScans, scanCoverage } from "./coverage";

/**
 * Scan pipeline
 *
 *   1. Load project            5. Store raw results       9. Compare competitors
 *   2. Load active queries     6. Analyze results        10. Generate recommendations
 *   3. Verify usage limits     7. Store analysis         11. Create scan summary
 *   4. Execute provider calls  8. Calculate metrics      12. Update project metrics
 *                                                         13. Notify / alert
 *
 * Steps 1–3 run synchronously in `createScan` (fast). Each query × provider
 * pair becomes an `ai_runs` row in state `pending`; workers claim rows with
 * `FOR UPDATE SKIP LOCKED`, so processing is resumable, safe to run from
 * several workers, and never blocks a browser request.
 */

const STALE_RUN_MS = 5 * 60_000;
const MAX_ATTEMPTS = 2;

export type ScanTrigger = Scan["trigger"];

export interface CreateScanOptions {
  project: AuthorizedProject;
  userId: string;
  trigger: ScanTrigger;
  /** Force a mode (e.g. demo scans always simulate). Defaults to configuration. */
  mode?: ScanMode;
  /** Mock-only: visibility bias for demo history. */
  mockStrength?: number;
  /** Skip plan/usage checks (seed script only). */
  skipEntitlements?: boolean;
  /** Override creation time (seed script only, for historical data). */
  createdAt?: Date;
}

async function getActiveScan(projectId: string, executor: DbExecutor) {
  const rows = await executor
    .select()
    .from(scans)
    .where(and(eq(scans.projectId, projectId), inArray(scans.status, ["queued", "running"])))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Postgres unique violation on the one-active-scan-per-project index. */
function isActiveScanConflict(error: unknown) {
  const e = error as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const pg = e?.code ? e : e?.cause;
  return pg?.code === "23505" && pg.constraint_name === "scans_one_active_per_project";
}

/**
 * Usage is reserved when a scan is created and settled when it ends: only
 * questions that got at least one answer count against the monthly quota, so
 * failed or partly failed scans are not charged for checks that never ran.
 */
async function settleQueryUsage(executor: DbExecutor, scanId: string) {
  const [row] = await executor
    .select({ n: sql<number>`count(distinct ${aiRuns.queryText})::int` })
    .from(aiRuns)
    .where(and(eq(aiRuns.scanId, scanId), eq(aiRuns.status, "completed")));
  await executor
    .update(usageRecords)
    .set({ quantity: Number(row?.n ?? 0) })
    .where(and(eq(usageRecords.scanId, scanId), eq(usageRecords.kind, "query_run")));
}

export async function createScan(opts: CreateScanOptions): Promise<Scan> {
  const { project, userId, trigger } = opts;
  const log = { projectId: project.id, trigger };
  const mode: ScanMode = opts.mode ?? currentScanMode();
  const createdAt = opts.createdAt ?? new Date();

  // Checks and inserts run under the account's entitlement lock so parallel
  // requests cannot start duplicate scans or overspend the monthly quota.
  // Quotas belong to the project owner (the paying account).
  const run = () =>
    withEntitlementLock(project.userId, async (tx) => {
      // 1. Project is already authorized & loaded. Guard against parallel scans.
      const active = await getActiveScan(project.id, tx);
      if (active) {
        const stale = active.heartbeatAt && Date.now() - active.heartbeatAt.getTime() > 30 * 60_000;
        if (!stale) throw conflict("A scan is already running for this project.");
        await tx.update(scans).set({ status: "failed", error: "Scan timed out." }).where(eq(scans.id, active.id));
        await settleQueryUsage(tx, active.id);
      }

      // 2. Active queries, most important first.
      const priorityOrder = sql`case ${queriesTable.priority} when 'high' then 0 when 'medium' then 1 else 2 end`;
      let activeQueries = await tx
        .select()
        .from(queriesTable)
        .where(and(eq(queriesTable.projectId, project.id), eq(queriesTable.status, "active")))
        .orderBy(priorityOrder, asc(queriesTable.createdAt));
      if (activeQueries.length === 0) {
        throw validationError("Add or generate at least one active question before running a scan.");
      }

      const providers = [...new Set(project.providers)].filter((p): p is ProviderId => (PROVIDER_IDS as readonly string[]).includes(p));
      if (providers.length === 0) throw validationError("Enable at least one AI platform for this project.");

      const notes: string[] = [];
      const activeTotal = activeQueries.length;
      let limitedBy: "quota" | "cap" | null = null;

      // 3. Usage limits (monthly queries) — enforced on the server.
      if (!opts.skipEntitlements) {
        const { remaining, limit, used, ent } = await remainingQueries(project.userId, undefined, tx);
        assertActive(ent);
        // After a downgrade, only the oldest projects within the plan keep
        // scanning; the others stay readable but are not monitored.
        const maxProjects = ent.plan.limits.projects;
        const owned = await tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.userId, project.userId))
          .orderBy(asc(projects.createdAt), asc(projects.id));
        if (owned.findIndex((p) => p.id === project.id) >= maxProjects) {
          throw planLimitError(
            `Your ${ent.plan.name} plan includes ${maxProjects} project${maxProjects === 1 ? "" : "s"}. Upgrade, or delete another project, to keep monitoring ${project.name}.`,
            { limit: "projects", used: owned.length, max: maxProjects, plan: ent.plan.id },
          );
        }
        if (remaining <= 0) {
          throw planLimitError(`You've used ${used}/${limit} queries this month. Upgrade your plan to keep monitoring.`, {
            limit: "queries",
            used,
            max: limit,
            plan: ent.plan.id,
          });
        }
        if (activeQueries.length > remaining) {
          notes.push(
            `Limited to your ${remaining} remaining monthly queries (of ${activeQueries.length} active). Highest-priority questions were checked first.`,
          );
          activeQueries = activeQueries.slice(0, remaining);
          limitedBy = "quota";
        }
      }

      // Cost guard: hard cap on provider calls per scan.
      const maxCalls = env().MAX_PROVIDER_CALLS_PER_SCAN;
      if (activeQueries.length * providers.length > maxCalls) {
        const allowed = Math.floor(maxCalls / providers.length);
        if (allowed < 1) throw validationError("This scan exceeds the per-scan safety cap. Choose fewer AI platforms.");
        notes.push(`Limited to ${allowed} questions by the per-scan safety cap.`);
        activeQueries = activeQueries.slice(0, allowed);
        limitedBy ??= "cap";
      }

      const [created] = await tx
        .insert(scans)
        .values({
          projectId: project.id,
          userId,
          status: "queued",
          trigger,
          mode,
          providers,
          queryCount: activeQueries.length,
          totalItems: activeQueries.length * providers.length,
          notes,
          config: {
            ...(opts.mockStrength !== undefined ? { mockStrength: opts.mockStrength } : {}),
            ...(limitedBy ? { activeQuestions: activeTotal, limitedBy } : {}),
          },
          createdAt,
        })
        .returning();

      const runRows = activeQueries.flatMap((q) =>
        providers.map((provider) => ({
          scanId: created.id,
          projectId: project.id,
          queryId: q.id,
          provider,
          queryText: q.text,
          status: "pending" as const,
          isMock: mode === "mock",
          createdAt,
        })),
      );
      for (let i = 0; i < runRows.length; i += 500) {
        await tx.insert(aiRuns).values(runRows.slice(i, i + 500));
      }

      // A scheduled run moves the schedule forward right away, so a scan that
      // later fails is not recreated on every scheduler tick.
      if (trigger === "scheduled" && project.monitoringEnabled) {
        await tx
          .update(projects)
          .set({ nextScanAt: computeNextScanAt(project.monitoringFrequency, createdAt) })
          .where(eq(projects.id, project.id));
      }

      // Seeded demo history is not real usage and never counts against quotas.
      if (trigger !== "seed") {
        await tx.insert(usageRecords).values({
          userId: project.userId,
          projectId: project.id,
          scanId: created.id,
          kind: "query_run",
          quantity: activeQueries.length,
          metadata: { trigger, mode, providers },
          createdAt,
        });
      }
      return { scan: created, queries: activeQueries.length, providers };
    });

  try {
    const { scan, queries, providers } = await run();
    logger.info("scan.created", { ...log, scanId: scan.id, mode, queries, providers });
    return scan;
  } catch (error) {
    // Backstop for writers outside this account's lock (e.g. organization members).
    if (isActiveScanConflict(error)) throw conflict("A scan is already running for this project.");
    throw error;
  }
}

function withCoverage(metrics: ScanMetrics, scan: Scan): ScanMetrics {
  const coverage = scanCoverage(scan);
  return coverage ? { ...metrics, coverage } : metrics;
}

/** Atomically claim up to `limit` runs for processing. */
async function claimRuns(scanId: string, limit: number): Promise<AiRun[]> {
  const staleBefore = new Date(Date.now() - STALE_RUN_MS);
  const candidates = db()
    .select({ id: aiRuns.id })
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.scanId, scanId),
        or(eq(aiRuns.status, "pending"), and(eq(aiRuns.status, "running"), lt(aiRuns.startedAt, staleBefore))),
      ),
    )
    .orderBy(asc(aiRuns.createdAt), asc(aiRuns.id))
    .limit(limit)
    .for("update", { skipLocked: true });

  return db()
    .update(aiRuns)
    .set({ status: "running", startedAt: new Date(), attempts: sql`${aiRuns.attempts} + 1` })
    .where(inArray(aiRuns.id, candidates))
    .returning();
}

interface ScanContext {
  scan: Scan;
  project: AuthorizedProject;
  competitors: Awaited<ReturnType<typeof listCompetitors>>;
  unavailable: Set<ProviderId>;
}

// 5. Store raw result
async function storeRawResult(runId: string, result: ProviderResult) {
  await db()
    .update(aiRuns)
    .set({
      status: "completed",
      model: result.model,
      responseText: result.response,
      citations: result.citations,
      rawResponse: result.raw ?? null,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      isMock: result.isMock,
      error: null,
      completedAt: new Date(),
    })
    .where(eq(aiRuns.id, runId));
}

async function processRun(run: AiRun, ctx: ScanContext) {
  const provider = run.provider as ProviderId;
  const { scan, project } = ctx;

  if (ctx.unavailable.has(provider)) {
    await db().update(aiRuns).set({ status: "unavailable", error: "Provider unavailable for this scan.", completedAt: new Date() }).where(eq(aiRuns.id, run.id));
    await db().update(scans).set({ failedItems: sql`${scans.failedItems} + 1` }).where(eq(scans.id, scan.id));
    return;
  }

  await db()
    .update(scans)
    .set({ currentProvider: provider, currentQuery: run.queryText, heartbeatAt: new Date() })
    .where(eq(scans.id, scan.id));

  const business = toBusinessContext(project);
  const competitorContexts = toCompetitorContexts(ctx.competitors);

  try {
    let result: Pick<ProviderResult, "response" | "citations" | "isMock">;
    if (run.responseText !== null) {
      // An earlier attempt got an answer but failed while storing the analysis.
      // Reuse it: never pay the provider twice for the same check.
      result = { response: run.responseText, citations: run.citations ?? [], isMock: run.isMock };
    } else {
      // 4. Execute provider query
      const impl = getProvider(provider, scan.mode);
      if (!impl.isConfigured()) throw new ProviderUnavailableError(provider, `${impl.displayName} is not configured.`);
      logger.debug("scan.provider_call", { scanId: scan.id, provider, runId: run.id });
      const answer = await impl.runQuery({
        query: run.queryText,
        businessContext: business,
        competitors: competitorContexts,
        seed: scan.id,
        mockStrength: scan.config.mockStrength,
      });
      result = answer;
      await storeRawResult(run.id, answer);
    }

    // 6. Analyze
    const analysis = await analyzeResponse(
      {
        response: result.response,
        citations: result.citations,
        business: { name: business.name, aliases: business.aliases, domain: business.domain },
        competitors: competitorContexts.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases, domain: c.domain })),
      },
      { isMock: result.isMock },
    );
    const a = analysis.result;

    // 7. Store analysis + sources
    await db().transaction(async (tx) => {
      // Questions and competitors can be deleted while a scan runs: reference
      // only rows that still exist (the FKs are ON DELETE SET NULL).
      const liveCompetitorIds = new Set(
        (await tx.select({ id: competitorsTable.id }).from(competitorsTable).where(eq(competitorsTable.projectId, project.id))).map(
          (c) => c.id,
        ),
      );
      await tx
        .insert(aiAnalysis)
        .values({
          aiRunId: run.id,
          scanId: scan.id,
          projectId: project.id,
          queryId: sql`(select ${queriesTable.id} from ${queriesTable} where ${queriesTable.id} = ${run.queryId})`,
          provider,
          mentioned: a.mentioned,
          recommended: a.recommended,
          position: a.position,
          sentiment: a.sentiment,
          citation: a.citation,
          confidence: Math.round(a.confidence * 1000) / 1000,
          evidence: a.evidence,
          explanation: a.explanation,
          competitors: a.competitors,
          otherBusinesses: a.otherBusinesses,
          analyzer: analysis.analyzer,
          analyzerModel: analysis.analyzerModel,
          score: scoreResult(a),
        })
        .onConflictDoNothing({ target: aiAnalysis.aiRunId });

      if (result.citations.length) {
        await tx.insert(sources).values(
          result.citations.slice(0, 30).map((c) => ({
            aiRunId: run.id,
            scanId: scan.id,
            projectId: project.id,
            url: c.url.slice(0, 2000),
            domain: c.domain,
            title: c.title?.slice(0, 300) ?? null,
            isOwnDomain: domainMatches(c.domain, project.domain),
            competitorId:
              ctx.competitors.find((comp) => liveCompetitorIds.has(comp.id) && domainMatches(c.domain, comp.domain))?.id ?? null,
          })),
        );
      }
      if (analysis.estimatedCostUsd > 0) {
        await tx
          .update(aiRuns)
          .set({ estimatedCostUsd: sql`${aiRuns.estimatedCostUsd} + ${analysis.estimatedCostUsd}` })
          .where(eq(aiRuns.id, run.id));
      }
      await tx.update(scans).set({ completedItems: sql`${scans.completedItems} + 1` }).where(eq(scans.id, scan.id));
    });
  } catch (error) {
    const message = (error as Error).message?.slice(0, 500) ?? "Unknown error";
    if (error instanceof ProviderUnavailableError) {
      ctx.unavailable.add(provider);
      logger.warn("scan.provider_unavailable", { scanId: scan.id, provider, error: message });
      await db().update(aiRuns).set({ status: "unavailable", error: message, completedAt: new Date() }).where(eq(aiRuns.id, run.id));
      await db().update(scans).set({ failedItems: sql`${scans.failedItems} + 1` }).where(eq(scans.id, scan.id));
      return;
    }
    const retry = run.attempts < MAX_ATTEMPTS;
    logger.error("scan.provider_error", { scanId: scan.id, provider, runId: run.id, attempt: run.attempts, retry, error: message });
    await db()
      .update(aiRuns)
      .set({ status: retry ? "pending" : "failed", error: message, completedAt: retry ? null : new Date() })
      .where(eq(aiRuns.id, run.id));
    if (!retry) await db().update(scans).set({ failedItems: sql`${scans.failedItems} + 1` }).where(eq(scans.id, scan.id));
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export interface ProcessOptions {
  /** Stop claiming new work after this many ms (serverless time limits). */
  deadlineMs?: number;
  batchSize?: number;
}

/**
 * Process pending runs for a scan until done or the deadline passes.
 * Returns `done: true` once the scan has been finalized (or was already).
 */
export async function processScan(scanId: string, options: ProcessOptions = {}): Promise<{ done: boolean }> {
  const deadline = Date.now() + (options.deadlineMs ?? 10 * 60_000);
  const [scan] = await db().select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (!scan) return { done: true };
  if (scan.status === "completed" || scan.status === "failed" || scan.status === "cancelled") return { done: true };

  const project = await getProjectInternal(scan.projectId);
  if (!project) {
    await db().update(scans).set({ status: "failed", error: "Project no longer exists." }).where(eq(scans.id, scanId));
    return { done: true };
  }

  if (scan.status === "queued") {
    await db()
      .update(scans)
      .set({ status: "running", startedAt: new Date(), heartbeatAt: new Date() })
      .where(and(eq(scans.id, scanId), eq(scans.status, "queued")));
    logger.info("scan.started", { scanId, projectId: project.id, mode: scan.mode });
  } else {
    // Resuming: mark the scan as attended so other workers don't pick it up too.
    await db().update(scans).set({ heartbeatAt: new Date() }).where(eq(scans.id, scanId));
  }

  const ctx: ScanContext = {
    scan,
    project,
    competitors: await listCompetitors(project),
    unavailable: new Set(),
  };
  const concurrency = env().SCAN_CONCURRENCY;
  const batchSize = options.batchSize ?? concurrency * 2;

  while (Date.now() < deadline) {
    const batch = await claimRuns(scanId, batchSize);
    if (batch.length === 0) break;
    await runWithConcurrency(batch, concurrency, (run) => processRun(run, ctx));
  }

  const [{ remaining }] = await db()
    .select({ remaining: sql<number>`count(*)::int` })
    .from(aiRuns)
    .where(and(eq(aiRuns.scanId, scanId), inArray(aiRuns.status, ["pending", "running"])));
  if (Number(remaining) > 0) return { done: false };

  await finalizeScan(scanId);
  return { done: true };
}

/** Run a scan to completion in-process (local fallback / scripts). */
export async function runScanToCompletion(scanId: string) {
  try {
    for (let i = 0; i < 100; i++) {
      const { done } = await processScan(scanId, { deadlineMs: 5 * 60_000 });
      if (done) return;
    }
  } catch (error) {
    logger.error("scan.crashed", { scanId, error: (error as Error).message });
    const failed = await db()
      .update(scans)
      .set({ status: "failed", error: "The scan stopped unexpectedly. Please retry." })
      .where(and(eq(scans.id, scanId), inArray(scans.status, ["queued", "running"])))
      .returning({ id: scans.id });
    if (failed.length) await settleQueryUsage(db(), scanId);
  }
}

/** Load runs + analysis in the shape the metrics engine needs. */
export async function loadMetricsInput(scan: Scan, project: AuthorizedProject) {
  const [runs, analyses, queryRows, competitorRows] = await Promise.all([
    db().select().from(aiRuns).where(eq(aiRuns.scanId, scan.id)),
    db().select().from(aiAnalysis).where(eq(aiAnalysis.scanId, scan.id)),
    db().select().from(queriesTable).where(eq(queriesTable.projectId, project.id)),
    listCompetitors(project),
  ]);
  const analysisByRun = new Map(analyses.map((a) => [a.aiRunId, a]));
  const queryById = new Map(queryRows.map((q) => [q.id, q]));

  const metricRuns: MetricsRunInput[] = runs.map((r) => {
    const q = r.queryId ? queryById.get(r.queryId) : undefined;
    const a = analysisByRun.get(r.id);
    return {
      provider: r.provider as ProviderId,
      status: r.status,
      queryId: r.queryId,
      queryText: r.queryText,
      category: q?.category ?? "recommendation",
      priority: q?.priority ?? "medium",
      service: q?.service ?? null,
      citations: r.citations,
      analysis: a
        ? {
            mentioned: a.mentioned,
            recommended: a.recommended,
            position: a.position,
            sentiment: a.sentiment,
            citation: a.citation,
            competitors: a.competitors,
            otherBusinesses: a.otherBusinesses,
          }
        : null,
    };
  });
  return {
    runs,
    analyses,
    competitorRows,
    input: {
      providers: scan.providers as ProviderId[],
      runs: metricRuns,
      competitors: competitorRows.map((c) => ({ id: c.id, name: c.name, domain: c.domain })),
      businessDomain: project.domain,
    },
  };
}

/** A finalization claim older than this is considered abandoned (crashed worker). */
const FINALIZE_CLAIM_MS = 5 * 60_000;

export async function finalizeScan(scanId: string) {
  // Only one worker finalizes. A claim left by a worker that died expires.
  const expired = new Date(Date.now() - FINALIZE_CLAIM_MS);
  const claimed = await db()
    .update(scans)
    .set({ finalizingAt: new Date() })
    .where(
      and(
        eq(scans.id, scanId),
        inArray(scans.status, ["queued", "running"]),
        or(isNull(scans.finalizingAt), lt(scans.finalizingAt, expired)),
      ),
    )
    .returning();
  const scan = claimed[0];
  if (!scan) return;

  try {
    await finalizeClaimedScan(scan);
  } catch (error) {
    // Release the claim so the next worker can retry right away.
    await db().update(scans).set({ finalizingAt: null }).where(eq(scans.id, scanId));
    throw error;
  }
}

async function finalizeClaimedScan(scan: Scan) {
  const scanId = scan.id;

  const project = await getProjectInternal(scan.projectId);
  if (!project) return;

  // 8–9. Metrics + competitor comparison
  const { runs, input } = await loadMetricsInput(scan, project);
  const metrics = withCoverage(computeScanMetrics(input), scan);

  if (metrics.runsSucceeded === 0) {
    const firstError = runs.find((r) => r.error)?.error ?? "No AI provider returned a result.";
    await db().transaction(async (tx) => {
      await tx
        .update(scans)
        .set({
          status: "failed",
          error: `Your scan failed: ${firstError}`,
          metrics,
          completedAt: new Date(),
          currentProvider: null,
          currentQuery: null,
        })
        .where(eq(scans.id, scanId));
      await settleQueryUsage(tx, scanId);
      // Nobody is watching a scheduled scan; tell the owner it failed.
      if (scan.trigger === "scheduled") {
        await tx.insert(notifications).values({
          userId: project.userId,
          projectId: project.id,
          type: "scan_failed",
          severity: "warning",
          title: `Scheduled scan failed for ${project.name}`,
          body: "No AI platform returned an answer, so this scan was not counted against your monthly queries. We'll try again at the next scheduled time.",
        });
      }
    });
    logger.error("scan.failed", { scanId, projectId: project.id, error: firstError });
    return;
  }

  // 10. Recommendations (upsert by key; keep the user's status). Open
  // recommendations that no longer apply are removed; completed/dismissed
  // ones are kept as history.
  const drafts = generateRecommendations({ business: toBusinessContext(project), metrics });
  const currentKeys = drafts.map((d) => d.key);
  await db()
    .delete(recommendations)
    .where(
      and(
        eq(recommendations.projectId, project.id),
        eq(recommendations.status, "open"),
        currentKeys.length ? notInArray(recommendations.key, currentKeys) : sql`true`,
      ),
    );
  for (const d of drafts) {
    await db()
      .insert(recommendations)
      .values({ ...d, projectId: project.id, scanId, source: "rules" })
      .onConflictDoUpdate({
        target: [recommendations.projectId, recommendations.key],
        set: {
          scanId,
          title: d.title,
          description: d.description,
          reason: d.reason,
          evidence: d.evidence,
          action: d.action,
          category: d.category,
          priority: d.priority,
          impact: d.impact,
          difficulty: d.difficulty,
          updatedAt: new Date(),
        },
      });
  }

  // 11–12. Scan summary + project metrics
  const completedAt = scan.trigger === "seed" ? scan.createdAt : new Date();
  // The project's "previous score" is only kept when the two scans checked the
  // same full question set; otherwise there is no meaningful change to show.
  const [previousLatest] = project.latestScanId
    ? await db().select({ metrics: scans.metrics }).from(scans).where(eq(scans.id, project.latestScanId)).limit(1)
    : [];
  const previousScore = comparableScans(metrics, previousLatest?.metrics) ? project.latestScore : null;
  await db().transaction(async (tx) => {
    await tx
      .update(scans)
      .set({
        status: "completed",
        score: metrics.overall.score,
        metrics,
        completedAt,
        currentProvider: null,
        currentQuery: null,
        error: metrics.runsFailed > 0 ? `${metrics.runsFailed} of ${metrics.runsTotal} checks could not be completed.` : null,
      })
      .where(eq(scans.id, scanId));
    if (metrics.runsFailed > 0) await settleQueryUsage(tx, scanId);

    await tx
      .update(projects)
      .set({
        latestScanId: scanId,
        latestScore: metrics.overall.score,
        previousScore,
        lastScanAt: completedAt,
        nextScanAt: project.monitoringEnabled ? computeNextScanAt(project.monitoringFrequency, completedAt) : null,
      })
      .where(eq(projects.id, project.id));

    // Cost accounting: one record per provider for this scan.
    const costByProvider = new Map<string, { calls: number; cost: number }>();
    for (const r of runs) {
      if (r.status !== "completed") continue;
      const cur = costByProvider.get(r.provider) ?? { calls: 0, cost: 0 };
      cur.calls++;
      cur.cost += Number(r.estimatedCostUsd ?? 0);
      costByProvider.set(r.provider, cur);
    }
    for (const [provider, v] of scan.trigger === "seed" ? [] : costByProvider) {
      await tx.insert(usageRecords).values({
        userId: project.userId,
        projectId: project.id,
        scanId,
        kind: "provider_call",
        quantity: v.calls,
        estimatedCostUsd: Math.round(v.cost * 1_000_000) / 1_000_000,
        metadata: { provider, mode: scan.mode },
        createdAt: completedAt,
      });
    }
  });

  logger.info("scan.completed", {
    scanId,
    projectId: project.id,
    score: metrics.overall.score,
    runs: metrics.runsTotal,
    failed: metrics.runsFailed,
  });

  // 13. Alerts / notifications (never fail the scan because of them)
  if (scan.trigger !== "seed") {
    try {
      await evaluateScanAlerts({ project, scan: { ...scan, status: "completed" }, metrics, previousScore });
    } catch (error) {
      logger.error("scan.alerts_failed", { scanId, error: (error as Error).message });
    }
  }
}

/**
 * Re-score a completed scan from stored analysis (e.g. after changing the
 * scoring weights). Does not call any provider.
 */
export async function recalculateScan(scanId: string) {
  const [scan] = await db().select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (!scan || scan.status !== "completed") throw new AppError("VALIDATION", "Only completed scans can be recalculated.", 400);
  const project = await getProjectInternal(scan.projectId);
  if (!project) throw new AppError("NOT_FOUND", "Project not found.", 404);

  const analyses = await db().select().from(aiAnalysis).where(eq(aiAnalysis.scanId, scanId));
  for (const a of analyses) {
    await db().update(aiAnalysis).set({ score: scoreResult(a) }).where(eq(aiAnalysis.id, a.id));
  }
  const { input } = await loadMetricsInput(scan, project);
  const metrics = withCoverage(computeScanMetrics(input), scan);
  await db().update(scans).set({ score: metrics.overall.score, metrics }).where(eq(scans.id, scanId));
  if (project.latestScanId === scanId) {
    await db().update(projects).set({ latestScore: metrics.overall.score }).where(eq(projects.id, project.id));
  }
  logger.info("scan.recalculated", { scanId, score: metrics.overall.score });
  return metrics;
}

/** Scans that need a worker: queued, or running without a recent heartbeat. */
export async function findScansNeedingWork(limit = 5) {
  const stale = new Date(Date.now() - 2 * 60_000);
  const claimExpired = new Date(Date.now() - FINALIZE_CLAIM_MS);
  return db()
    .select({ id: scans.id })
    .from(scans)
    .where(
      or(
        eq(scans.status, "queued"),
        and(
          eq(scans.status, "running"),
          or(lt(scans.heartbeatAt, stale), isNull(scans.heartbeatAt)),
          // Being finalized by another worker (unless that claim expired).
          or(isNull(scans.finalizingAt), lt(scans.finalizingAt, claimExpired)),
        ),
      ),
    )
    .orderBy(asc(scans.createdAt))
    .limit(limit);
}
