"use client";

import { ChevronDown, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  CATEGORY_OPTIONS,
  hasRecommendationFilters,
  PRIORITY_OPTIONS,
  type RecommendationFilterValues,
  recommendationsHref,
} from "./labels";

function FilterSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-8 w-full appearance-none rounded-md border border-input bg-surface pr-7 pl-2.5 text-[13px] text-foreground transition-colors hover:border-border-strong focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/30"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
    </div>
  );
}

/**
 * Priority and category filters. Each change updates the URL (status kept).
 * It is a real GET form, so it also works before JavaScript loads.
 */
export function RecommendationFilters({ basePath, filters }: { basePath: string; filters: RecommendationFilterValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(next: Partial<RecommendationFilterValues>) {
    startTransition(() => router.push(recommendationsHref(basePath, { ...filters, ...next }), { scroll: false }));
  }

  return (
    <form
      action={basePath}
      method="get"
      aria-label="Filter recommendations"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-wrap items-center gap-2"
    >
      {filters.status !== "open" && <input type="hidden" name="status" value={filters.status} />}
      <label htmlFor="recommendations-priority" className="sr-only">
        Priority
      </label>
      <FilterSelect
        id="recommendations-priority"
        name="priority"
        value={filters.priority ?? ""}
        onChange={(e) => navigate({ priority: (e.target.value || undefined) as RecommendationFilterValues["priority"] })}
        className="w-[calc(50%-0.25rem)] sm:w-40"
      >
        <option value="">All priorities</option>
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} priority
          </option>
        ))}
      </FilterSelect>

      <label htmlFor="recommendations-category" className="sr-only">
        Category
      </label>
      <FilterSelect
        id="recommendations-category"
        name="category"
        value={filters.category ?? ""}
        onChange={(e) => navigate({ category: (e.target.value || undefined) as RecommendationFilterValues["category"] })}
        className="w-[calc(50%-0.25rem)] sm:w-44"
      >
        <option value="">All categories</option>
        {CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </FilterSelect>

      <noscript>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
      </noscript>

      {hasRecommendationFilters(filters) && (
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
          <Link href={recommendationsHref(basePath, { status: filters.status })} scroll={false}>
            <X aria-hidden="true" />
            Clear filters
          </Link>
        </Button>
      )}
      {pending && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Updating…
        </span>
      )}
    </form>
  );
}
