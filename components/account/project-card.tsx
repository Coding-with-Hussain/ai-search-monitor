import { Building2, Globe, LoaderCircle, MapPin } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { Delta } from "@/components/dashboard/delta";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { Badge } from "@/components/ui/badge";
import type { ProjectScanMeta } from "@/db/repositories/scans";
import type { Project } from "@/db/schema";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { scoreChange } from "@/services/scoring";

import { isPast, monitoringLabel, projectLocation } from "./labels";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

function When({ date, future }: { date: Date; future?: boolean }) {
  const overdue = future && isPast(date);
  return (
    <time dateTime={date.toISOString()} title={formatDate(date)}>
      {overdue ? "Due now" : formatRelative(date)}
    </time>
  );
}

/**
 * Summary card for one project. The project name is a stretched link, so the
 * whole card is clickable while badges (with tooltips) stay interactive.
 */
export function ProjectCard({
  project,
  meta,
  detailed = false,
  headingLevel = "h3",
}: {
  project: Project;
  meta?: ProjectScanMeta;
  /** Show domain, industry, location and monitoring frequency (projects list). */
  detailed?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const score = project.latestScore;
  const delta = scoreChange(score, project.previousScore);
  const location = projectLocation(project);
  const simulated = !project.isDemo && meta?.latestMode === "mock";
  const nextScan = project.monitoringEnabled && project.monitoringFrequency !== "manual" ? project.nextScanAt : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-surface p-5 shadow-card transition-colors",
        "hover:border-border-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <Heading className="truncate text-[15px] font-semibold tracking-tight">
            <Link
              href={`/projects/${project.id}`}
              className="outline-none group-hover:text-primary after:absolute after:inset-0 after:z-[1] after:rounded-xl after:content-['']"
            >
              {project.name}
            </Link>
          </Heading>
          {detailed ? (
            <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-muted-foreground">
              <li className="flex min-w-0 items-center gap-1.5">
                <Globe className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
                <span className="sr-only">Website: </span>
                <span className="truncate">{project.domain ?? "No website added"}</span>
              </li>
              <li className="flex min-w-0 items-center gap-1.5">
                <Building2 className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
                <span className="sr-only">Industry: </span>
                <span className="truncate">{project.industry}</span>
              </li>
              {location && (
                <li className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
                  <span className="sr-only">Location: </span>
                  <span className="truncate">{location}</span>
                </li>
              )}
            </ul>
          ) : (
            project.domain && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{project.domain}</p>
          )}
          {(project.isDemo || simulated || meta?.scanning) && (
            <div className="relative z-[2] mt-2.5 flex w-fit flex-wrap gap-1.5">
              {project.isDemo && <Badge variant="demo">Demo data</Badge>}
              {simulated && <SimulationBadge />}
              {meta?.scanning && (
                <Badge variant="default">
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  Scan in progress
                </Badge>
              )}
            </div>
          )}
        </div>
        <ScoreRing value={score} size={64} stroke={6} showLabel={false} label={`${project.name} AI Visibility score`} />
      </div>

      <div className="mt-3 min-h-5">
        {score === null ? (
          <span className="text-xs text-subtle-foreground">
            {meta?.scanning ? "Score appears when the first scan finishes" : "No score yet. Run a scan to measure visibility."}
          </span>
        ) : (
          <Delta value={delta} context={delta === null ? undefined : "vs previous scan"} />
        )}
      </div>

      <dl className={cn("mt-4 grid gap-3 border-t border-border pt-4", detailed ? "grid-cols-3" : "grid-cols-2")}>
        <Stat label="Last scan">{project.lastScanAt ? <When date={project.lastScanAt} /> : "Never"}</Stat>
        <Stat label="Next scan">
          {nextScan ? (
            <When date={nextScan} future />
          ) : project.monitoringFrequency === "manual" ? (
            "On demand"
          ) : project.monitoringEnabled ? (
            "Not scheduled"
          ) : (
            "Paused"
          )}
        </Stat>
        {detailed && <Stat label="Monitoring">{monitoringLabel(project)}</Stat>}
      </dl>
    </article>
  );
}
