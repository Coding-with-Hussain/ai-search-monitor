import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Clear label for simulated (mock-mode / demo) data. Never omit it on mock results. */
export function SimulationBadge({ label = "Simulation", className }: { label?: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="demo" className={className} tabIndex={0}>
          <FlaskConical aria-hidden="true" />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        These results come from deterministic simulated AI answers (no real AI provider was queried). The analysis and
        scoring are real. Set AI_VISIBILITY_MOCK_MODE=false and add API keys for live monitoring.
      </TooltipContent>
    </Tooltip>
  );
}
