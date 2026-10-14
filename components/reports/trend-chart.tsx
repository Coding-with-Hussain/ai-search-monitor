import { formatDate, formatShortDate } from "@/lib/format";

const TICKS = [0, 25, 50, 75, 100];

/**
 * Static, print-friendly score trend (single series, so no legend box; the
 * heading names it). Lines are SVG with non-scaling 2px strokes; dots and
 * labels are HTML so they stay round and legible at any width. Every value is
 * also listed in the table that follows it in the report.
 */
export function TrendChart({ points, label }: { points: Array<{ date: string; score: number }>; label: string }) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;
  const t0 = new Date(sorted[0].date).getTime();
  const t1 = new Date(sorted[sorted.length - 1].date).getTime();
  const span = t1 - t0;
  const xy = sorted.map((p) => ({
    ...p,
    x: span > 0 ? ((new Date(p.date).getTime() - t0) / span) * 100 : 50,
    y: 100 - Math.max(0, Math.min(100, p.score)),
  }));
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = xy.length > 1 ? `${line} L${xy[xy.length - 1].x.toFixed(2)},100 L${xy[0].x.toFixed(2)},100 Z` : null;
  const first = xy[0];
  const last = xy[xy.length - 1];
  const summary =
    xy.length > 1
      ? `${label}: from ${Math.round(first.score)} on ${formatDate(first.date)} to ${Math.round(last.score)} on ${formatDate(last.date)}.`
      : `${label}: ${Math.round(last.score)} on ${formatDate(last.date)}.`;

  return (
    <figure className="print-avoid-break pt-2">
      {/* The top padding keeps the "100" axis label (centered on its gridline) inside the figure when printed. */}
      <div role="img" aria-label={summary} className="relative h-44 w-full pr-8 pl-9">
        {/* Y axis labels */}
        <div className="absolute inset-y-0 left-0 w-7" aria-hidden="true">
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[11px] leading-none text-subtle-foreground tabular"
              style={{ top: `${100 - t}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        {/* Plot */}
        <div className="relative h-full w-full" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            {TICKS.map((t) => (
              <line
                key={t}
                x1={0}
                x2={100}
                y1={100 - t}
                y2={100 - t}
                stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {area && <path d={area} fill="var(--series-1)" fillOpacity={0.1} stroke="none" />}
            {xy.length > 1 && (
              <path
                d={line}
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {xy.map((p, i) => (
            <span
              key={`${p.date}-${i}`}
              title={`${formatDate(p.date)}: ${Math.round(p.score)}`}
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--chart-surface)]"
              style={{ left: `${p.x}%`, top: `${p.y}%`, background: "var(--series-1)" }}
            />
          ))}
          {/* Direct label on the latest value only. */}
          <span
            className="absolute -translate-y-1/2 pl-2.5 text-xs font-semibold text-foreground tabular"
            style={{ left: `${last.x}%`, top: `${last.y}%` }}
          >
            {Math.round(last.score)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex justify-between pr-8 pl-9 text-[11px] text-subtle-foreground" aria-hidden="true">
        <span>{formatShortDate(first.date)}</span>
        {xy.length > 1 && <span>{formatShortDate(last.date)}</span>}
      </div>
    </figure>
  );
}
