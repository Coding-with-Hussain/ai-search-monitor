import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Previous / next pagination for lists without a total count. */
export function Pager({
  label,
  page,
  hasNext,
  hrefFor,
}: {
  /** Accessible name, e.g. "Scan history pagination". */
  label: string;
  page: number;
  hasNext: boolean;
  hrefFor: (page: number) => string;
}) {
  const hasPrev = page > 1;
  if (!hasPrev && !hasNext) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
      <p className="text-[13px] text-muted-foreground tabular">Page {page}</p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page - 1)} rel="prev">
              <ChevronLeft aria-hidden="true" />
              Newer
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden="true" />
            Newer
          </Button>
        )}
        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page + 1)} rel="next">
              Older
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Older
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
}

/** Read a 1-based page number from search params (invalid -> 1, capped). */
export function parsePage(value: string | string[] | undefined, max = 1000) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : 1;
}
