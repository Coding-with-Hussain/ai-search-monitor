import { and, asc, count, desc, eq, getTableColumns, type SQL, sql } from "drizzle-orm";
import { z } from "zod";

import { notFound } from "@/lib/errors";
import type { Priority, RecommendationCategory } from "@/types/domain";

import { db } from "../index";
import { recommendations, scans } from "../schema";
import type { AuthorizedProject } from "./projects";

export const RECOMMENDATION_STATUSES = ["open", "completed", "dismissed"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

/**
 * Open recommendations shown in full on plans without
 * `features.advancedRecommendations` (Starter). The rest are summarized in a
 * locked card. Kept here until the plan catalogue carries a numeric limit.
 */
export const BASIC_RECOMMENDATIONS_VISIBLE = 5;

/** Safety cap: recommendations are keyed per project, so lists stay small. */
const MAX_ROWS = 200;

const uuid = z.uuid();

export interface RecommendationFilters {
  priority?: Priority;
  category?: RecommendationCategory;
}

const priorityRank = sql`case ${recommendations.priority} when 'high' then 0 when 'medium' then 1 else 2 end`;
const impactRank = sql`case ${recommendations.impact} when 'high' then 0 when 'medium' then 1 else 2 end`;
const difficultyRank = sql`case ${recommendations.difficulty} when 'easy' then 0 when 'medium' then 1 else 2 end`;

/** Most valuable first: priority, then expected impact, then the easiest. */
const openOrder = [priorityRank, impactRank, difficultyRank, desc(recommendations.updatedAt), asc(recommendations.id)];

function scopeConditions(project: AuthorizedProject, filters: RecommendationFilters = {}): SQL[] {
  const conds: SQL[] = [eq(recommendations.projectId, project.id)];
  if (filters.priority) conds.push(eq(recommendations.priority, filters.priority));
  if (filters.category) conds.push(eq(recommendations.category, filters.category));
  return conds;
}

/**
 * Recommendations in one status tab, with the mode of the scan that produced
 * them (so simulated results can be labeled). Open ones are ordered by value;
 * completed and dismissed ones by when that happened.
 */
export async function listRecommendations(
  project: AuthorizedProject,
  opts: { status: RecommendationStatus } & RecommendationFilters,
) {
  const order =
    opts.status === "open"
      ? openOrder
      : opts.status === "completed"
        ? [desc(recommendations.completedAt), desc(recommendations.updatedAt), asc(recommendations.id)]
        : [desc(recommendations.dismissedAt), desc(recommendations.updatedAt), asc(recommendations.id)];
  return db()
    .select({ ...getTableColumns(recommendations), scanMode: scans.mode })
    .from(recommendations)
    .leftJoin(scans, and(eq(scans.id, recommendations.scanId), eq(scans.projectId, recommendations.projectId)))
    .where(and(...scopeConditions(project, opts), eq(recommendations.status, opts.status)))
    .orderBy(...order)
    .limit(MAX_ROWS);
}

export type RecommendationRow = Awaited<ReturnType<typeof listRecommendations>>[number];

/** Number of recommendations per status (filters applied), for the status tabs. */
export async function countRecommendationsByStatus(
  project: AuthorizedProject,
  filters: RecommendationFilters = {},
): Promise<Record<RecommendationStatus, number>> {
  const rows = await db()
    .select({ status: recommendations.status, n: count() })
    .from(recommendations)
    .where(and(...scopeConditions(project, filters)))
    .groupBy(recommendations.status);
  const counts: Record<RecommendationStatus, number> = { open: 0, completed: 0, dismissed: 0 };
  for (const row of rows) counts[row.status] = Number(row.n);
  return counts;
}

/** Ids of every open recommendation in display order (plan gating uses the top of this list). */
export async function listOpenRecommendationIds(project: AuthorizedProject): Promise<string[]> {
  const rows = await db()
    .select({ id: recommendations.id })
    .from(recommendations)
    .where(and(eq(recommendations.projectId, project.id), eq(recommendations.status, "open")))
    .orderBy(...openOrder)
    .limit(MAX_ROWS);
  return rows.map((r) => r.id);
}

/** One recommendation of this project, or NOT_FOUND. */
export async function getRecommendation(project: AuthorizedProject, recommendationId: string) {
  if (!uuid.safeParse(recommendationId).success) throw notFound("Recommendation not found.");
  const rows = await db()
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.projectId, project.id), eq(recommendations.id, recommendationId)))
    .limit(1);
  if (!rows[0]) throw notFound("This recommendation no longer exists. It may have been replaced by a newer scan.");
  return rows[0];
}

/** Change a recommendation's status, keeping completedAt / dismissedAt consistent with it. */
export async function setRecommendationStatus(project: AuthorizedProject, recommendationId: string, status: RecommendationStatus) {
  if (!uuid.safeParse(recommendationId).success) throw notFound("Recommendation not found.");
  const now = new Date();
  const timestamps =
    status === "completed"
      ? { completedAt: now, dismissedAt: null }
      : status === "dismissed"
        ? { completedAt: null, dismissedAt: now }
        : { completedAt: null, dismissedAt: null };
  const rows = await db()
    .update(recommendations)
    .set({ status, ...timestamps, updatedAt: now })
    .where(and(eq(recommendations.projectId, project.id), eq(recommendations.id, recommendationId)))
    .returning({ id: recommendations.id, status: recommendations.status, title: recommendations.title });
  if (!rows[0]) throw notFound("This recommendation no longer exists. It may have been replaced by a newer scan.");
  return rows[0];
}

/** Top open recommendations (report "recommended actions"). */
export async function listTopOpenRecommendations(project: AuthorizedProject, limit: number) {
  return db()
    .select({
      title: recommendations.title,
      priority: recommendations.priority,
      action: recommendations.action,
      reason: recommendations.reason,
    })
    .from(recommendations)
    .where(and(eq(recommendations.projectId, project.id), eq(recommendations.status, "open")))
    .orderBy(...openOrder)
    .limit(Math.max(0, limit));
}
