import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

import { SimulationBadge } from "@/components/app/simulation-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

import { DeleteReportButton } from "./delete-report-button";
import { formatPeriod } from "./labels";

export interface ReportListRow {
  id: string;
  title: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  score: number | null;
  isSimulation: boolean;
}

function ScoreValue({ score }: { score: number | null }) {
  if (score === null || !Number.isFinite(score)) return <span className="text-subtle-foreground">—</span>;
  return (
    <span className="font-semibold">
      {Math.round(score)}
      <span className="text-xs font-normal text-muted-foreground">/100</span>
    </span>
  );
}

/** Previously generated reports: a table on large screens, a card list on small ones. */
export function ReportList({ projectId, rows }: { projectId: string; rows: ReportListRow[] }) {
  const hrefFor = (id: string) => `/projects/${projectId}/reports/${id}`;
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">
                Report
              </TableHead>
              <TableHead scope="col">Monitoring period</TableHead>
              <TableHead scope="col" className="text-right">
                Score
              </TableHead>
              <TableHead scope="col">Created</TableHead>
              <TableHead scope="col" className="pr-5 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
                    <Link href={hrefFor(row.id)} className="font-medium text-foreground hover:text-primary hover:underline">
                      {row.title}
                    </Link>
                    {row.isSimulation && <SimulationBadge label="Simulated" className="shrink-0" />}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular">
                  {formatPeriod(row.periodStart, row.periodEnd)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular">
                  <ScoreValue score={row.score} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular">{formatDateTime(row.createdAt)}</TableCell>
                <TableCell className="pr-5">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={hrefFor(row.id)}
                      className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[13px] font-medium whitespace-nowrap text-primary hover:underline"
                    >
                      View
                      <span className="sr-only"> report: {row.title}</span>
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Link>
                    <DeleteReportButton projectId={projectId} reportId={row.id} reportTitle={row.title} iconOnly />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border md:hidden" aria-label="Reports">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={hrefFor(row.id)}
                className="min-w-0 text-sm leading-snug font-semibold text-foreground hover:text-primary hover:underline"
              >
                {row.title}
              </Link>
              <span className="shrink-0 text-sm tabular">
                <ScoreValue score={row.score} />
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground tabular">
              {formatPeriod(row.periodStart, row.periodEnd)} · Created {formatDateTime(row.createdAt)}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>{row.isSimulation && <SimulationBadge label="Simulated" />}</div>
              <div className="flex items-center gap-1">
                <Link
                  href={hrefFor(row.id)}
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-[13px] font-medium text-primary hover:underline"
                >
                  View report
                  <span className="sr-only">: {row.title}</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
                <DeleteReportButton projectId={projectId} reportId={row.id} reportTitle={row.title} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
