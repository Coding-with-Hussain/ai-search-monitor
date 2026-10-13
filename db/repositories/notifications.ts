import { desc, eq } from "drizzle-orm";

import { db } from "../index";
import { notifications } from "../schema";

/** Latest in-app notifications/alerts for a user (scoped by user id). */
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
