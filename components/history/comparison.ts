import type { ComparisonEntity } from "@/components/dashboard/competitor-comparison";
import type { ScanMetrics } from "@/types/domain";

/** You + every competitor in a scan, for CompetitorBars / CompetitorTable. */
export function comparisonEntities(metrics: ScanMetrics, businessName: string): ComparisonEntity[] {
  return [
    { key: "business", name: businessName, isYou: true, metrics: metrics.overall },
    ...metrics.competitors.map((c) => ({ key: c.competitorId, name: c.name, isYou: false, metrics: c.metrics })),
  ];
}

/**
 * Stable color order for share of voice: tracked competitors first (tracking
 * order), then competitors present in the scan that are no longer tracked.
 */
export function competitorColorOrder(trackedIds: string[], metrics: ScanMetrics): string[] {
  const order = [...trackedIds];
  for (const c of metrics.competitors) if (!order.includes(c.competitorId)) order.push(c.competitorId);
  return order;
}
