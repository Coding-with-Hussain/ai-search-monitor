import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

import type { QueryFilterValues } from "./types";
import { queriesHref } from "./url";

/** Previous / next pagination that keeps the current filters. */
export function QueryPagination({
  basePath,
  filters,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  filters: QueryFilterValues;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const hasPrev = page > 1;
  const hasNext = page < pages;

  return (
    <nav
      aria-label="Questions pagination"
      className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p className="text-[13px] text-muted-foreground tabular">
        Showing {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
        <span className="text-subtle-foreground"> · Page {page} of {pages}</span>
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {hasPrev ? (
            <Button asChild variant="outline" size="sm">
              <Link href={queriesHref(basePath, { ...filters, page: page - 1 })} rel="prev">
                <ChevronLeft aria-hidden="true" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
          )}
          {hasNext ? (
            <Button asChild variant="outline" size="sm">
              <Link href={queriesHref(basePath, { ...filters, page: page + 1 })} rel="next">
                Next
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
