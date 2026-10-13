import { FlaskConical } from "lucide-react";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { ProjectOverviewData } from "./types";

/**
 * Label for simulated results. In the app it is the standard SimulationBadge;
 * on the public demo it explains the sample data in visitor-friendly words.
 */
export function SimulationLabel({
  mode,
  label,
  className,
}: {
  mode: ProjectOverviewData["mode"];
  /** Defaults to "Simulation" in the app and "Simulated" on the demo. */
  label?: string;
  className?: string;
}) {
  if (mode !== "demo") return <SimulationBadge label={label ?? "Simulation"} className={className} />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="demo" className={className} tabIndex={0}>
          <FlaskConical aria-hidden="true" />
          {label ?? "Simulated"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Demo data: simulated AI answers for a sample business. No real AI assistant was asked; the analysis and scoring use
        the same engine as live monitoring.
      </TooltipContent>
    </Tooltip>
  );
}

/** "Demo data" and/or "Simulation" badges for the latest results. */
export function DataSourceBadges({ data }: { data: Pick<ProjectOverviewData, "mode" | "isDemoData" | "isSimulation"> }) {
  if (data.mode === "demo") return <SimulationLabel mode="demo" label="Demo data" />;
  return (
    <>
      {data.isDemoData && <Badge variant="demo">Demo data</Badge>}
      {data.isSimulation && <SimulationBadge />}
    </>
  );
}
