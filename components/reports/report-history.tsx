import { Delta } from "@/components/dashboard/delta";
import { formatNumber } from "@/lib/format";
import type { ReportSnapshot } from "@/types/report";

import { formatMediumDate } from "./labels";
import { TrendChart } from "./trend-chart";

/**
 * Score trend over the report period: a static chart plus a table with every
 * value and the change from one completed scan to the next.
 */
export function ReportHistory({ history }: { history: ReportSnapshot["history"] }) {
  const points = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed scans were recorded in this period.</p>;
  }
  // Scores are shown as whole numbers, so changes are computed from the shown values.
  const shown = points.map((p) => Math.round(p.score));
  const rows = points.map((p, i) => ({ date: p.date, score: shown[i], change: i === 0 ? null : shown[i] - shown[i - 1] }));
  const first = rows[0];
  const last = rows[rows.length - 1];
  const total = rows.length > 1 ? last.score - first.score : null;

  return (
    <div className="flex flex-col gap-5 print:block print:space-y-5">
      {points.length > 1 ? (
        <>
          <p className="text-sm text-muted-foreground">
            From <span className="font-medium text-foreground tabular">{first.score}</span> on {formatMediumDate(first.date)} to{" "}
            <span className="font-medium text-foreground tabular">{last.score}</span>{" "}
            on {formatMediumDate(last.date)} <Delta value={total} suffix=" pts" className="align-middle" /> across{" "}
            {formatNumber(points.length)} completed scans.
          </p>
          <TrendChart points={points} label="AI Visibility score" />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          This period has one completed scan. The trend appears once more scans are completed.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <caption className="sr-only">AI Visibility score of each completed scan in the report period</caption>
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3 text-left font-medium">
                Scan date
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                AI Visibility score
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                Change
              </th>
            </tr>
          </thead>
          <tbody className="tabular">
            {[...rows].reverse().map((row, i) => (
              <tr key={`${row.date}-${i}`} className="print-avoid-break border-b border-border last:border-0">
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  {formatMediumDate(row.date)}
                </th>
                <td className="px-3 py-2.5 text-right font-medium">{row.score}</td>
                <td className="py-2.5 pl-3 text-right">
                  {row.change === null ? (
                    <span className="text-xs text-subtle-foreground">First in period</span>
                  ) : (
                    <Delta value={row.change} suffix=" pts" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
