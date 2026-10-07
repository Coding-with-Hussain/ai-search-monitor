import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";

import { normalizeQueryText, type GeneratedQuery } from "@/services/queries/generator";
import type { Priority, QueryCategory } from "@/types/domain";

import { db } from "../index";
import { aiAnalysis, queries } from "../schema";
import type { AuthorizedProject } from "./projects";

export const QUERY_PAGE_SIZE = 25;
/** Hard cap on stored questions per project (cost safety). */
export const MAX_QUERIES_PER_PROJECT = 200;

export async function countQueries(project: AuthorizedProject) {
  const [row] = await db().select({ n: count() }).from(queries).where(eq(queries.projectId, project.id));
  return Number(row?.n ?? 0);
}

export async function listQueryTexts(project: AuthorizedProject) {
  const rows = await db().select({ text: queries.text }).from(queries).where(eq(queries.projectId, project.id));
  return rows.map((r) => r.text);
}

/** Insert generated/manual queries, skipping duplicates. Returns inserted rows. */
export async function insertQueries(
  project: AuthorizedProject,
  items: Array<GeneratedQuery & { source?: "generated" | "manual" }>,
) {
  if (items.length === 0) return [];
  const existing = await countQueries(project);
  const room = Math.max(0, MAX_QUERIES_PER_PROJECT - existing);
  const values = items.slice(0, room).map((q) => ({
    projectId: project.id,
    text: q.text.trim(),
    normalizedText: normalizeQueryText(q.text),
    category: q.category,
    priority: q.priority,
    service: q.service,
    source: q.source ?? ("generated" as const),
  }));
  if (values.length === 0) return [];
  return db()
    .insert(queries)
    .values(values)
    .onConflictDoNothing({ target: [queries.projectId, queries.normalizedText] })
    .returning();
}

export interface QueryListFilters {
  q?: string;
  category?: QueryCategory;
  status?: "active" | "paused" | "mentioned" | "not_mentioned" | "recommended";
  provider?: string;
  page?: number;
  latestScanId?: string | null;
}

/**
 * Server-side filtered, paginated query list. Visibility status filters use
 * the latest completed scan's analysis.
 */
export async function listQueries(project: AuthorizedProject, filters: QueryListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const conditions = [eq(queries.projectId, project.id)];
  if (filters.q) conditions.push(ilike(queries.text, `%${filters.q.replace(/[%_]/g, "\\$&")}%`));
  if (filters.category) conditions.push(eq(queries.category, filters.category));
  if (filters.status === "active" || filters.status === "paused") conditions.push(eq(queries.status, filters.status));

  if (filters.status && ["mentioned", "not_mentioned", "recommended"].includes(filters.status) && filters.latestScanId) {
    const analysisConds = [eq(aiAnalysis.scanId, filters.latestScanId)];
    if (filters.provider) analysisConds.push(eq(aiAnalysis.provider, filters.provider));
    const agg = db()
      .select({ queryId: aiAnalysis.queryId })
      .from(aiAnalysis)
      .where(and(...analysisConds))
      .groupBy(aiAnalysis.queryId)
      .having(
        filters.status === "recommended"
          ? sql`bool_or(${aiAnalysis.recommended})`
          : filters.status === "mentioned"
            ? sql`bool_or(${aiAnalysis.mentioned})`
            : sql`not bool_or(${aiAnalysis.mentioned})`,
      );
    conditions.push(inArray(queries.id, agg));
  }

  const where = and(...conditions);
  const priorityOrder = sql`case ${queries.priority} when 'high' then 0 when 'medium' then 1 else 2 end`;
  const [rows, [total]] = await Promise.all([
    db()
      .select()
      .from(queries)
      .where(where)
      .orderBy(asc(queries.status), priorityOrder, desc(queries.createdAt))
      .limit(QUERY_PAGE_SIZE)
      .offset((page - 1) * QUERY_PAGE_SIZE),
    db().select({ n: count() }).from(queries).where(where),
  ]);
  return { rows, total: Number(total?.n ?? 0), page, pageSize: QUERY_PAGE_SIZE };
}

export async function getQuery(project: AuthorizedProject, queryId: string) {
  const rows = await db()
    .select()
    .from(queries)
    .where(and(eq(queries.projectId, project.id), eq(queries.id, queryId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function setQueryStatus(project: AuthorizedProject, queryIds: string[], status: "active" | "paused") {
  if (queryIds.length === 0) return;
  await db()
    .update(queries)
    .set({ status })
    .where(and(eq(queries.projectId, project.id), inArray(queries.id, queryIds)));
}

export async function setQueryPriority(project: AuthorizedProject, queryId: string, priority: Priority) {
  await db()
    .update(queries)
    .set({ priority })
    .where(and(eq(queries.projectId, project.id), eq(queries.id, queryId)));
}

export async function deleteQueries(project: AuthorizedProject, queryIds: string[]) {
  if (queryIds.length === 0) return;
  await db()
    .delete(queries)
    .where(and(eq(queries.projectId, project.id), inArray(queries.id, queryIds)));
}

export async function countActiveQueries(project: AuthorizedProject) {
  const [row] = await db()
    .select({ n: count() })
    .from(queries)
    .where(and(eq(queries.projectId, project.id), eq(queries.status, "active")));
  return Number(row?.n ?? 0);
}
