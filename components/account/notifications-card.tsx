import { BellOff, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { RecentNotification } from "./account-data";
import { RetryButton } from "./retry-button";

const SEVERITY = {
  info: { icon: Info, label: "Info", className: "bg-primary-soft text-primary" },
  success: { icon: CircleCheck, label: "Good news", className: "bg-success-soft text-success-text" },
  warning: { icon: TriangleAlert, label: "Warning", className: "bg-warning-soft text-warning-text" },
  critical: { icon: CircleAlert, label: "Important", className: "bg-danger-soft text-danger-text" },
} as const;

/**
 * Latest alerts for the signed-in user. `notifications` is null when loading
 * failed (shows an error with retry).
 */
export function NotificationsCard({
  notifications,
  projectNames,
}: {
  notifications: RecentNotification[] | null;
  projectNames: Map<string, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-[15px] leading-snug font-semibold tracking-tight">Recent alerts</h2>
        <CardDescription>Score changes, visibility drops and competitor moves from your scans.</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications === null ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3">
            <p className="text-[13px] text-danger-text">We couldn&apos;t load your alerts right now.</p>
            <RetryButton />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong px-4 py-8 text-center">
            <BellOff className="mb-2 size-5 text-subtle-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No alerts yet</p>
            <p className="mt-1 max-w-60 text-[13px] text-muted-foreground">
              We&apos;ll post important changes here after your scans run.
            </p>
          </div>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {notifications.map((n) => {
              const sev = SEVERITY[n.severity] ?? SEVERITY.info;
              const Icon = sev.icon;
              const projectName = n.projectId ? projectNames.get(n.projectId) : undefined;
              return (
                <li key={n.id} className="flex gap-3 py-3">
                  <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", sev.className)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{sev.label}:</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start gap-2 text-[13px] leading-snug font-medium text-foreground">
                      <span className="min-w-0 break-words">{n.title}</span>
                      {!n.readAt && (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" role="img" />
                      )}
                    </p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-subtle-foreground">
                      {projectName && n.projectId && (
                        <>
                          <Link href={`/projects/${n.projectId}`} className="font-medium text-muted-foreground hover:text-foreground hover:underline">
                            {projectName}
                          </Link>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <time dateTime={n.createdAt.toISOString()} title={formatDateTime(n.createdAt)}>
                        {formatRelative(n.createdAt)}
                      </time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
