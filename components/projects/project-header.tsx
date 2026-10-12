import { Building2, Calendar, Clock, Globe, MapPin, Radar } from "lucide-react";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { Project } from "@/db/schema";
import { formatDate } from "@/lib/format";

const FREQUENCY_LABEL: Record<Project["monitoringFrequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "Manual only",
};

function Item({ icon: Icon, label, children }: { icon: typeof Globe; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}

export function ProjectHeader({ project, actions }: { project: Project; actions?: React.ReactNode }) {
  const location = [project.city, project.country].filter(Boolean).join(", ");
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h1>
          {project.isDemo && <Badge variant="demo">Demo data</Badge>}
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
          {project.domain && (
            <Item icon={Globe} label="Website">
              <a href={project.website ?? `https://${project.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
                {project.domain}
              </a>
            </Item>
          )}
          <Item icon={Building2} label="Industry">{project.industry}</Item>
          {location && <Item icon={MapPin} label="Location">{location}</Item>}
          <Item icon={Radar} label="Monitoring">
            {project.monitoringEnabled ? FREQUENCY_LABEL[project.monitoringFrequency] : "Paused"}
          </Item>
          <Item icon={Clock} label="Last scan">Last scan: {formatDate(project.lastScanAt, "never")}</Item>
          {project.monitoringEnabled && project.nextScanAt && (
            <Item icon={Calendar} label="Next scan">Next scan: {formatDate(project.nextScanAt)}</Item>
          )}
        </dl>
      </div>
      {actions && <div className="shrink-0 lg:pl-6">{actions}</div>}
    </div>
  );
}
