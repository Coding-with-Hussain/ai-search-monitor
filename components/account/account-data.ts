import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { notifications, type Project, scans } from "@/db/schema";

/**
 * Read-only loaders for the account dashboard and project list.
 *
 * Authorization: `getProjectScanMeta` must only receive projects returned by
 * `listProjectsForUser(user.id)` (already access-checked); every scan query is
 * additionally scoped to those project ids. Notifications are scoped by the
 * signed-in user's id.
 */

export interface ProjectScanMeta {
  /** Mode of the scan behind `latestScore` (null when there is none). */
  latestMode: "live" | "mock" | null;
  /** A scan is queued or running right now. */
  scanning: boolean;
}

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

export async function listRecentNotifications(userId: string, limit = 8) {
  return db()
    .select({
      id: notifications.id,
      projectId: notifications.projectId,
      type: notifications.type,
      severity: notifications.severity,
      title: notifications.title,
      body: notifications.body,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export type RecentNotification = Awaited<ReturnType<typeof listRecentNotifications>>[number];
