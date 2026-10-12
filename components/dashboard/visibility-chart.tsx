"use client";

import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { formatDate, formatShortDate } from "@/lib/format";
import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import type { ProviderId } from "@/types/domain";

export interface VisibilityPoint {
  date: string;
  score: number;
  chatgpt?: number | null;
  gemini?: number | null;
  perplexity?: number | null;
}

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | string | null;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== null && p.value !== undefined && p.dataKey !== "scoreArea");
  return (
    <div className="min-w-40 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-pop">
      <p className="mb-1.5 text-xs text-muted-foreground">{formatDate(label as string)}</p>
      {rows.map((p) => {
        const key = String(p.dataKey);
        const name = key === "score" ? "Overall" : (PROVIDER_META[key as ProviderId]?.name ?? key);
        return (
          <div key={key} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {name}
            </span>
            <span className="font-semibold text-foreground tabular">{Math.round(Number(p.value))}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * AI Visibility over time. Range filters sit in one row above the chart; a
 * table view is always available (tooltips enhance, never gate).
 */
export function VisibilityChart({
  points,
  providers = [],
  defaultRange = "all",
  height = 260,
  now,
}: {
  points: VisibilityPoint[];
  providers?: ProviderId[];
  defaultRange?: RangeKey;
  height?: number;
  /** Reference time for range filtering (defaults to the latest point). */
  now?: string;
}) {
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [showProviders, setShowProviders] = useState(false);
  const [asTable, setAsTable] = useState(false);

  const filtered = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const r = RANGES.find((x) => x.key === range);
    if (!r?.days || sorted.length === 0) return sorted;
    const ref = new Date(now ?? sorted[sorted.length - 1].date).getTime();
    const from = ref - r.days * 86_400_000;
    return sorted.filter((p) => new Date(p.date).getTime() >= from);
  }, [points, range, now]);

  const data = filtered.map((p) => ({ ...p, scoreArea: p.score }));
  const series: ProviderId[] = showProviders ? providers : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                range === r.key && "bg-surface text-foreground shadow-sm",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {providers.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => setShowProviders((v) => !v)} aria-pressed={showProviders}>
            {showProviders ? "Hide platforms" : "Compare platforms"}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? "View chart" : "View as table"}
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground" style={{ height }}>
          No scans in this period yet.
        </div>
      ) : asTable ? (
        <div className="max-h-80 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Overall</th>
                {providers.map((p) => (
                  <th key={p} className="px-3 py-2 text-right font-medium">
                    {PROVIDER_META[p].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {[...data].reverse().map((p) => (
                <tr key={p.date} className="border-t border-border">
                  <td className="px-3 py-2">{formatDate(p.date)}</td>
                  <td className="px-3 py-2 text-right font-medium">{Math.round(p.score)}</td>
                  {providers.map((prov) => (
                    <td key={prov} className="px-3 py-2 text-right text-muted-foreground">
                      {p[prov] == null ? "—" : Math.round(p[prov] as number)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatShortDate(d)}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                  tick={{ fill: "var(--subtle-foreground)", fontSize: 12 }}
                  minTickGap={24}
                  tickMargin={8}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--subtle-foreground)", fontSize: 12 }}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} />
                {series.length === 0 && (
                  <Area type="monotone" dataKey="scoreArea" stroke="none" fill="url(#scoreFill)" isAnimationActive={false} activeDot={false} />
                )}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={series.length ? "var(--foreground)" : "var(--series-1)"}
                  strokeWidth={2}
                  dot={data.length <= 12 ? { r: 3, strokeWidth: 2, stroke: "var(--chart-surface)", fill: series.length ? "var(--foreground)" : "var(--series-1)" } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--chart-surface)" }}
                  isAnimationActive={false}
                />
                {series.map((p) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={p}
                    stroke={PROVIDER_META[p].chartVar}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--chart-surface)" }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {series.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 rounded-full bg-foreground" aria-hidden="true" /> Overall
              </li>
              {series.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 rounded-full" style={{ background: PROVIDER_META[p].chartVar }} aria-hidden="true" />
                  {PROVIDER_META[p].name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function VisibilityChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div>
      <div className="mb-4 h-7 w-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="animate-pulse rounded-lg bg-surface-muted/70" style={{ height }} />
    </div>
  );
}
