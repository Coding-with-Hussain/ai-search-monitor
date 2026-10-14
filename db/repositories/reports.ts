import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { notFound } from "@/lib/errors";
import type { ReportSnapshot } from "@/types/report";

import { db } from "../index";
import { reports, usageRecords } from "../schema";
import type { AuthorizedProject } from "./projects";

export const REPORT_PAGE_SIZE = 20;

const uuid = z.uuid();

/** Report list (without the snapshot payload, except the simulation flag). */
export async function listReports(project: AuthorizedProject, opts: { limit?: number; offset?: number } = {}) {
  return db()
    .select({
      id: reports.id,
      title: reports.title,
      scanId: reports.scanId,
      periodStart: reports.periodStart,
      periodEnd: reports.periodEnd,
      createdAt: reports.createdAt,
      isSimulation: sql<boolean>`coalesce((${reports.snapshot} ->> 'isSimulation')::boolean, false)`,
      score: sql<number | null>`(${reports.snapshot} -> 'metrics' -> 'overall' ->> 'score')::numeric`.mapWith(
        (v: string | number | null) => (v === null ? null : Number(v)),
      ),
    })
    .from(reports)
    .where(eq(reports.projectId, project.id))
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(opts.limit ?? REPORT_PAGE_SIZE)
    .offset(opts.offset ?? 0);
}

export type ReportListItem = Awaited<ReturnType<typeof listReports>>[number];

/** One report of this project (full snapshot), or NOT_FOUND. */
export async function getReport(project: AuthorizedProject, reportId: string) {
  if (!uuid.safeParse(reportId).success) throw notFound("Report not found.");
  const rows = await db()
    .select()
    .from(reports)
    .where(and(eq(reports.projectId, project.id), eq(reports.id, reportId)))
    .limit(1);
  if (!rows[0]) throw notFound("Report not found.");
  return rows[0];
}

/**
 * Store a generated report and record it as usage, atomically (a report is
 * never saved without its usage record and vice versa).
 */
export async function createReport(
  project: AuthorizedProject,
  input: { userId: string; title: string; snapshot: ReportSnapshot; periodStart: Date | null; periodEnd: Date },
) {
  return db().transaction(async (tx) => {
    const [row] = await tx
      .insert(reports)
      .values({
        projectId: project.id,
        scanId: input.snapshot.scanId,
        userId: input.userId,
        title: input.title,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        snapshot: input.snapshot,
      })
      .returning({ id: reports.id, title: reports.title });
    await tx.insert(usageRecords).values({
      userId: input.userId,
      projectId: project.id,
      scanId: input.snapshot.scanId,
      kind: "report_generated",
      quantity: 1,
      metadata: { reportId: row.id },
    });
    return row;
  });
}

/** Delete a report of this project, or NOT_FOUND. Usage records are kept for accounting. */
export async function deleteReport(project: AuthorizedProject, reportId: string) {
  if (!uuid.safeParse(reportId).success) throw notFound("Report not found.");
  const rows = await db()
    .delete(reports)
    .where(and(eq(reports.projectId, project.id), eq(reports.id, reportId)))
    .returning({ id: reports.id, title: reports.title });
  if (!rows[0]) throw notFound("This report was already deleted.");
  return rows[0];
}
