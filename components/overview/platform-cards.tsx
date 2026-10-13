import { ArrowRight, CircleOff, PlugZap } from "lucide-react";
import Link from "next/link";

import { Delta } from "@/components/dashboard/delta";
import { InfoTip } from "@/components/dashboard/info-tip";
import { Card } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import { PROVIDER_META } from "@/lib/providers-meta";
import { PROVIDER_IDS, type ProviderId, type ProviderMetrics } from "@/types/domain";

import { diff, overviewLinks } from "./helpers";
import { SimulationLabel } from "./simulation-label";
import { TOUR_TARGETS, type ProjectOverviewData } from "./types";

/** Visibility per AI platform (ChatGPT, Gemini, Perplexity). */
export function PlatformCards({ data }: { data: ProjectOverviewData }) {
  const links = overviewLinks(data);
  return (
    <section aria-labelledby="platforms-heading" data-tour={TOUR_TARGETS.platforms} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="platforms-heading" className="text-[15px] font-semibold tracking-tight">
          AI platform visibility
        </h2>
        <InfoTip label="About AI platform visibility">
          Your AI Visibility score calculated separately for each AI assistant, from the same monitored questions.
        </InfoTip>
        {data.isSimulation && <SimulationLabel mode={data.mode} className="ml-auto" />}
      </div>
      <ul className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {PROVIDER_IDS.map((id) => {
          const current = data.metrics.providers.find((p) => p.provider === id) ?? null;
          const previous = data.previous?.providers.find((p) => p.provider === id && p.status !== "unavailable") ?? null;
          return (
            <li key={id} className="min-w-0">
              <PlatformCard
                id={id}
                current={current}
                previous={previous}
                hasPreviousScan={data.previous !== null}
                monitored={data.monitoredProviders.includes(id)}
                reason={data.unavailableReasons[id] ?? null}
                href={links.providerQueries(id)}
                settingsHref={links.settings}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PlatformName({ id }: { id: ProviderId }) {
  const meta = PROVIDER_META[id];
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.chartVar }} aria-hidden="true" />
      <h3 className="truncate text-sm font-semibold">{meta.name}</h3>
      <span className="truncate text-xs text-subtle-foreground">{meta.vendor}</span>
    </div>
  );
}

function PlatformCard({
  id,
  current,
  previous,
  hasPreviousScan,
  monitored,
  reason,
  href,
  settingsHref,
}: {
  id: ProviderId;
  current: ProviderMetrics | null;
  previous: ProviderMetrics | null;
  hasPreviousScan: boolean;
  monitored: boolean;
  reason: "not_configured" | "no_results" | null;
  href: string | null;
  settingsHref: string | null;
}) {
  const name = PROVIDER_META[id].name;

  // Not part of the latest scan at all.
  if (!current) {
    return (
      <Card className="flex h-full flex-col gap-3 bg-surface-muted/50 p-4 shadow-none">
        <PlatformName id={id} />
        <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <CircleOff className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
          <p>
            {monitored
              ? `${name} was added after the latest scan. Results appear after the next scan.`
              : `${name} is not included in this project's monitored platforms.`}
          </p>
        </div>
        {!monitored && settingsHref && (
          <Link href={settingsHref} className="mt-auto text-[13px] font-medium text-primary hover:underline">
            Manage monitored platforms
          </Link>
        )}
      </Card>
    );
  }

  if (current.status === "unavailable") {
    return (
      <Card className="flex h-full flex-col gap-3 bg-surface-muted/50 p-4 shadow-none">
        <PlatformName id={id} />
        <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <PlugZap className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
          <p>
            <span className="font-medium text-foreground">Unavailable in the latest scan.</span>{" "}
            {reason === "not_configured"
              ? `API configuration is missing for ${name}, so it was skipped.`
              : `${name} did not return results for this scan. It will be tried again on the next scan.`}
          </p>
        </div>
        <p className="mt-auto text-xs text-subtle-foreground">Your overall score is based on the other platforms.</p>
      </Card>
    );
  }

  const change = previous ? diff(current.score, previous.score) : null;
  return (
    <Card className="flex h-full flex-col p-4">
      <PlatformName id={id} />
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight tabular">
          {Math.round(current.score)}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </span>
        {hasPreviousScan ? (
          <Delta value={change} suffix=" pts" context="vs previous scan" />
        ) : (
          <span className="text-xs text-subtle-foreground">No previous scan</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div className="min-w-0">
          <dt className="text-subtle-foreground">
            Questions<span className="sr-only"> analyzed</span>
          </dt>
          <dd className="mt-0.5 text-sm font-medium tabular">{formatNumber(current.queriesAnalyzed)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-subtle-foreground">Recommended</dt>
          <dd className="mt-0.5 text-sm font-medium tabular">{formatPercent(current.recommendationRate)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-subtle-foreground">Mentioned</dt>
          <dd className="mt-0.5 text-sm font-medium tabular">{formatPercent(current.mentionRate)}</dd>
        </div>
      </dl>
      {current.status === "partial" && current.failedRuns > 0 && (
        <p className="mt-3 text-xs text-warning-text">
          {current.failedRuns} {current.failedRuns === 1 ? "answer" : "answers"} could not be collected from {name}.
        </p>
      )}
      {href && (
        <div className="mt-auto pt-3">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            View questions<span className="sr-only"> for {name}</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Card>
  );
}
