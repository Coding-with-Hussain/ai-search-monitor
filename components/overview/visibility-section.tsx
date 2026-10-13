import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { VisibilityChart } from "@/components/dashboard/visibility-chart";
import { Button } from "@/components/ui/button";
import { PROVIDER_IDS } from "@/types/domain";

import { overviewLinks } from "./helpers";
import { SectionCard } from "./section-card";
import { TOUR_TARGETS, type ProjectOverviewData } from "./types";

/** AI Visibility over time (overall, with optional per-platform lines). */
export function VisibilitySection({ data }: { data: ProjectOverviewData }) {
  const links = overviewLinks(data);
  const providers = PROVIDER_IDS.filter((p) => data.history.some((point) => point[p] != null));

  return (
    <SectionCard
      tour={TOUR_TARGETS.history}
      className="lg:col-span-2"
      title="Visibility over time"
      description={
        data.history.length > 1
          ? "Your AI Visibility score after each completed scan."
          : "Your trend line appears after your next completed scan."
      }
      actions={
        <>
          {data.historyIncludesSimulation && <SimulationBadge label="Includes simulated scans" />}
          {links.history && (
            <Button asChild variant="ghost" size="sm">
              <Link href={links.history}>
                Scan history
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </>
      }
    >
      <VisibilityChart points={data.history} providers={providers} />
    </SectionCard>
  );
}
