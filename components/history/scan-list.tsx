import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { Delta } from "@/components/dashboard/delta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, formatNumber, pluralize } from "@/lib/format";
import type { ScanStatus } from "@/types/domain";

import { type ScanTrigger, TRIGGER_LABEL } from "./labels";
import { ScanStatusBadge } from "./scan-status-badge";

export interface HistoryScanRow {
  id: string;
  /** ISO timestamp the scan is dated by (completion, else creation). */
  date: string;
  status: ScanStatus;
  trigger: ScanTrigger;
  mode: "live" | "mock";
  score: number | null;
  /** Points vs the previous completed scan (null when there is no baseline). */
  change: number | null;
  queryCount: number;
  providerCount: number;
  failedItems: number;
  note: string | null;
  /** Detail page link (completed / failed / cancelled scans). */
  href: string | null;
}

function ScoreValue({ row }: { row: HistoryScanRow }) {
  if (row.status !== "completed" || row.score === null) return <span className="text-subtle-foreground">—</span>;
  return (
    <span className="font-semibold">
      {Math.round(row.score)}
      <span className="text-xs font-normal text-muted-foreground">/100</span>
    </span>
  );
}

function ChangeValue({ row }: { row: HistoryScanRow }) {
  if (row.status !== "completed") return <span className="text-subtle-foreground">—</span>;
  if (row.change === null) return <span className="text-xs text-subtle-foreground">First scan</span>;
  return <Delta value={row.change} suffix=" pts" />;
}

function DateLink({ row, className }: { row: HistoryScanRow; className?: string }) {
  const label = formatDate(row.date);
  return row.href ? (
    <Link href={row.href} className={className ?? "font-medium text-foreground hover:text-primary hover:underline"}>
      {label}
    </Link>
  ) : (
    <span className={className ?? "font-medium"}>{label}</span>
  );
}

/** Scan history: a table on large screens, a card list on small ones. */
export function ScanList({ rows }: { rows: HistoryScanRow[] }) {
  return (
    <>
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">Date</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="text-right">Score</TableHead>
              <TableHead scope="col">Change</TableHead>
              <TableHead scope="col" className="text-right">Questions</TableHead>
              <TableHead scope="col" className="text-right">Platforms</TableHead>
              <TableHead scope="col" className="text-right">Failed checks</TableHead>
              <TableHead scope="col">Trigger</TableHead>
              <TableHead scope="col">Notes</TableHead>
              <TableHead scope="col" className="pr-5">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tabular">
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-5 whitespace-nowrap">
                  <DateLink row={row} />
                  <span className="sr-only"> ({formatDateTime(row.date)})</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ScanStatusBadge status={row.status} />
                    {row.mode === "mock" && <SimulationBadge />}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <ScoreValue row={row} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <ChangeValue row={row} />
                </TableCell>
                <TableCell className="text-right">{formatNumber(row.queryCount)}</TableCell>
                <TableCell className="text-right">{formatNumber(row.providerCount)}</TableCell>
                <TableCell className={row.failedItems > 0 ? "text-right font-medium text-warning-text" : "text-right text-muted-foreground"}>
                  {formatNumber(row.failedItems)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{TRIGGER_LABEL[row.trigger]}</TableCell>
                <TableCell className="max-w-56">
                  {row.note ? (
                    <span className="line-clamp-2 text-xs text-muted-foreground" title={row.note}>
                      {row.note}
                    </span>
                  ) : (
                    <span className="text-subtle-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  {row.href && (
                    <Link
                      href={row.href}
                      className="inline-flex items-center gap-0.5 text-[13px] font-medium whitespace-nowrap text-primary hover:underline"
                    >
                      View
                      <span className="sr-only"> scan from {formatDate(row.date)}</span>
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border lg:hidden" aria-label="Scans">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2.5 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <DateLink row={row} className="min-w-0 text-sm font-semibold text-foreground hover:text-primary hover:underline" />
              <ScanStatusBadge status={row.status} className="shrink-0" />
            </div>
            {row.status === "completed" && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular">
                <span className="text-lg">
                  <ScoreValue row={row} />
                </span>
                <ChangeValue row={row} />
              </div>
            )}
            <p className="text-[13px] text-muted-foreground tabular">
              {pluralize(row.queryCount, "question")} · {pluralize(row.providerCount, "platform")} ·{" "}
              <span className={row.failedItems > 0 ? "font-medium text-warning-text" : undefined}>
                {pluralize(row.failedItems, "failed check")}
              </span>{" "}
              · {TRIGGER_LABEL[row.trigger]}
            </p>
            {row.note && <p className="line-clamp-3 text-xs text-muted-foreground">{row.note}</p>}
            {(row.href || row.mode === "mock") && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {row.href ? (
                  <Link href={row.href} className="inline-flex items-center gap-0.5 text-[13px] font-medium text-primary hover:underline">
                    View scan details
                    <span className="sr-only"> from {formatDate(row.date)}</span>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <span />
                )}
                {row.mode === "mock" && <SimulationBadge />}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
