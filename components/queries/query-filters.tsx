"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { PROVIDER_META } from "@/lib/providers-meta";
import type { ProviderId } from "@/types/domain";

import { CompactSelect } from "./compact-select";
import { CATEGORY_OPTIONS, STATUS_FILTER_LABEL } from "./labels";
import type { QueryFilterValues } from "./types";
import { hasActiveFilters, queriesHref } from "./url";

/**
 * One-row filter bar. Each change updates the URL (other filters kept, page
 * reset). It is a real GET form, so it also works before JavaScript loads.
 */
export function QueryFilters({
  basePath,
  filters,
  providers,
  hasLatestScan,
}: {
  basePath: string;
  filters: QueryFilterValues;
  providers: ProviderId[];
  hasLatestScan: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(filters.q ?? "");
  const [prevQ, setPrevQ] = useState(filters.q);
  if (filters.q !== prevQ) {
    // The URL changed elsewhere (e.g. "Clear filters"): sync the search box.
    setPrevQ(filters.q);
    setDraft(filters.q ?? "");
  }

  /** Apply a filter change. Text typed in the search box is applied with it. */
  function navigate(next: Partial<QueryFilterValues>) {
    const href = queriesHref(basePath, { ...filters, q: draft.trim() || undefined, ...next, page: 1 });
    startTransition(() => router.push(href, { scroll: false }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = draft.trim();
    if (q === (filters.q ?? "")) return;
    navigate({ q: q || undefined });
  }

  const providerOptions = filters.provider && !providers.includes(filters.provider) ? [...providers, filters.provider] : providers;
  const active = hasActiveFilters(filters);

  return (
    <form
      role="search"
      aria-label="Filter questions"
      action={basePath}
      method="get"
      onSubmit={onSubmit}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center"
    >
      <div className="relative col-span-2 sm:col-span-3 lg:w-72 lg:flex-none">
        <label htmlFor="questions-search" className="sr-only">
          Search questions
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
        <input
          id="questions-search"
          name="q"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={100}
          placeholder="Search questions…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-8 w-full rounded-md border border-input bg-surface pr-2.5 pl-8 text-[13px] text-foreground placeholder:text-subtle-foreground hover:border-border-strong focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/30"
        />
      </div>

      <label htmlFor="questions-category" className="sr-only">
        Category
      </label>
      <CompactSelect
        id="questions-category"
        name="category"
        value={filters.category ?? ""}
        onChange={(e) => navigate({ category: (e.target.value || undefined) as QueryFilterValues["category"] })}
        className="lg:w-44"
      >
        <option value="">All categories</option>
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </CompactSelect>

      <label htmlFor="questions-status" className="sr-only">
        Status
      </label>
      <CompactSelect
        id="questions-status"
        name="status"
        value={filters.status ?? ""}
        onChange={(e) => navigate({ status: (e.target.value || undefined) as QueryFilterValues["status"] })}
        className="lg:w-44"
      >
        <option value="">All statuses</option>
        <optgroup label="Monitoring">
          <option value="active">{STATUS_FILTER_LABEL.active}</option>
          <option value="paused">{STATUS_FILTER_LABEL.paused}</option>
        </optgroup>
        <optgroup label={hasLatestScan ? "In the latest scan" : "In the latest scan (none yet)"}>
          <option value="recommended">{STATUS_FILTER_LABEL.recommended}</option>
          <option value="mentioned">{STATUS_FILTER_LABEL.mentioned}</option>
          <option value="not_mentioned">{STATUS_FILTER_LABEL.not_mentioned}</option>
        </optgroup>
      </CompactSelect>

      <label htmlFor="questions-provider" className="sr-only">
        AI platform
      </label>
      <CompactSelect
        id="questions-provider"
        name="provider"
        value={filters.provider ?? ""}
        onChange={(e) => navigate({ provider: (e.target.value || undefined) as QueryFilterValues["provider"] })}
        className="col-span-2 sm:col-span-1 lg:w-40"
      >
        <option value="">All AI platforms</option>
        {providerOptions.map((p) => (
          <option key={p} value={p}>
            {PROVIDER_META[p].name}
          </option>
        ))}
      </CompactSelect>

      <button type="submit" className="sr-only">
        Apply filters
      </button>

      {(active || pending) && (
        <div className="col-span-2 flex min-h-8 items-center gap-2 sm:col-span-3 lg:col-span-1">
          {active && (
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
              <Link href={basePath} scroll={false}>
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
        </div>
      )}
    </form>
  );
}
