import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { notFound } from "@/lib/errors";
import type { ProviderMetrics } from "@/types/domain";

import { db } from "../index";
import { type Project, scans } from "../schema";
import type { AuthorizedProject } from "./projects";

const uuid = z.uuid();

/** Lightweight scan columns (no metrics JSON) for lists and progress. */
const summaryColumns = {
  id: scans.id,
  projectId: scans.projectId,
  status: scans.status,
  trigger: scans.trigger,
  mode: scans.mode,
  providers: scans.providers,
  queryCount: scans.queryCount,
  totalItems: scans.totalItems,
  completedItems: scans.completedItems,
  failedItems: scans.failedItems,
  currentProvider: scans.currentProvider,
  currentQuery: scans.currentQuery,
  score: scans.score,
  notes: scans.notes,
  config: scans.config,
  error: scans.error,
  startedAt: scans.startedAt,
  completedAt: scans.completedAt,
  createdAt: scans.createdAt,
};


export async function getScanForProject(project: AuthorizedProject, scanId: string) {
  if (!uuid.safeParse(scanId).success) throw notFound("Scan not found.");
  const rows = await db()
    .select()
    .from(scans)
    .where(and(eq(scans.projectId, project.id), eq(scans.id, scanId)))
    .limit(1);
  if (!rows[0]) throw notFound("Scan not found.");
  return rows[0];
}

/** Latest completed scan with full metrics (the dashboard's data source). */
export async function getLatestCompletedScan(project: AuthorizedProject) {
  if (project.latestScanId) {
    const rows = await db()
      .select()
      .from(scans)
      .where(and(eq(scans.id, project.latestScanId), eq(scans.projectId, project.id)))
      .limit(1);
    if (rows[0]?.status === "completed") return rows[0];
  }
  const rows = await db()
    .select()
    .from(scans)
    .where(and(eq(scans.projectId, project.id), eq(scans.status, "completed")))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** The completed scan before `scan` (for period-over-period deltas). */
export async function getPreviousCompletedScan(project: AuthorizedProject, before: Date) {
  const rows = await db()
    .select()
    .from(scans)
    .where(and(eq(scans.projectId, project.id), eq(scans.status, "completed"), lt(scans.createdAt, before)))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveScan(project: AuthorizedProject) {
  const rows = await db()
    .select(summaryColumns)
    .from(scans)
    .where(and(eq(scans.projectId, project.id), inArray(scans.status, ["queued", "running"])))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getMostRecentScan(project: AuthorizedProject) {
  const rows = await db()
    .select(summaryColumns)
    .from(scans)
    .where(eq(scans.projectId, project.id))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listScans(project: AuthorizedProject, opts: { limit?: number; offset?: number; since?: Date | null } = {}) {
  const conds = [eq(scans.projectId, project.id)];
  if (opts.since) conds.push(gte(scans.createdAt, opts.since));
  return db()
    .select(summaryColumns)
    .from(scans)
    .where(and(...conds))
    .orderBy(desc(scans.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export interface HistoryPoint {
  scanId: string;
  date: string;
  score: number;
  mode: "live" | "mock";
  providers: Partial<Record<string, number>>;
}

/** Score history for charts (small payload: score + per-provider scores). */
export async function getScoreHistory(project: AuthorizedProject, opts: { since?: Date | null; limit?: number } = {}): Promise<HistoryPoint[]> {
  const conds = [eq(scans.projectId, project.id), eq(scans.status, "completed")];
  if (opts.since) conds.push(gte(scans.createdAt, opts.since));
  const rows = await db()
    .select({
      id: scans.id,
      completedAt: scans.completedAt,
      createdAt: scans.createdAt,
      score: scans.score,
      mode: scans.mode,
      providers: sql<ProviderMetrics[] | null>`${scans.metrics} -> 'providers'`,
    })
    .from(scans)
    .where(and(...conds))
    .orderBy(desc(scans.createdAt))
    .limit(opts.limit ?? 200);
  return rows
    .reverse()
    .map((r) => ({
      scanId: r.id,
      date: (r.completedAt ?? r.createdAt).toISOString(),
      score: Number(r.score ?? 0),
      mode: r.mode,
      providers: Object.fromEntries(
        (r.providers ?? []).filter((p) => p.status !== "unavailable").map((p) => [p.provider, p.score]),
      ),
    }));
}

/** Progress snapshot for polling (ownership verified via the project). */
export async function getScanProgress(project: AuthorizedProject, scanId: string) {
  if (!uuid.safeParse(scanId).success) throw notFound("Scan not found.");
  const rows = await db()
    .select(summaryColumns)
    .from(scans)
    .where(and(eq(scans.projectId, project.id), eq(scans.id, scanId)))
    .limit(1);
  if (!rows[0]) throw notFound("Scan not found.");
  return rows[0];
}

export type ScanSummary = Awaited<ReturnType<typeof listScans>>[number];

export interface ProjectScanMeta {
  /** Mode of the scan behind `latestScore` (null when there is none). */
  latestMode: "live" | "mock" | null;
  /** A scan is queued or running right now. */
  scanning: boolean;
}

/**
 * Latest-scan mode and "scanning now" flags for a list of projects.
 * Only pass projects already returned by listProjectsForUser(user.id).
 */
export async function getProjectScanMeta(projects: Project[]): Promise<Map<string, ProjectScanMeta>> {
  const meta = new Map<string, ProjectScanMeta>();
  if (projects.length === 0) return meta;
  const projectIds = projects.map((p) => p.id);
  const latestIds = projects.map((p) => p.latestScanId).filter((id): id is string => Boolean(id));

  const [latest, active] = await Promise.all([
    latestIds.length
      ? db()
          .select({ projectId: scans.projectId, mode: scans.mode })
          .from(scans)
          .where(and(inArray(scans.id, latestIds), inArray(scans.projectId, projectIds)))
      : Promise.resolve([] as Array<{ projectId: string; mode: "live" | "mock" }>),
    db()
      .selectDistinct({ projectId: scans.projectId })
      .from(scans)
      .where(and(inArray(scans.projectId, projectIds), inArray(scans.status, ["queued", "running"]))),
  ]);

  const modes = new Map(latest.map((row) => [row.projectId, row.mode]));
  const scanning = new Set(active.map((row) => row.projectId));
  for (const p of projects) {
    meta.set(p.id, { latestMode: modes.get(p.id) ?? null, scanning: scanning.has(p.id) });
  }
  return meta;
}
