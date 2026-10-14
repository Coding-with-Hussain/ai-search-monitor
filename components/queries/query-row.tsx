"use client";

import { Ellipsis, ExternalLink, Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";

import { deleteQueriesAction, setQueriesStatusAction, setQueryPriorityAction } from "@/app/actions/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";
import type { Priority, ProviderId } from "@/types/domain";

import { CompactSelect } from "./compact-select";
import { ConfirmDialog } from "./confirm-dialog";
import { CATEGORY_LABELS, PRIORITY_OPTIONS } from "./labels";
import { ProviderResults } from "./provider-results";
import type { QueryRowData } from "./types";

/**
 * One question: text, category/source/paused badges, editable priority,
 * latest result per AI platform and row actions. Grid row on large screens,
 * stacked card on small ones (same DOM).
 */
export function QueryRow({
  row,
  projectId,
  detailHref,
  providers,
  hasScan,
  selected,
  onSelectedChange,
}: {
  row: QueryRowData;
  projectId: string;
  detailHref: string;
  providers: ProviderId[];
  hasScan: boolean;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const textId = useId();
  const [priority, setPriority] = useState<Priority>(row.priority);
  const [prevPriority, setPrevPriority] = useState<Priority>(row.priority);
  if (row.priority !== prevPriority) {
    setPrevPriority(row.priority);
    setPriority(row.priority);
  }
  const [confirmOpen, setConfirmOpen] = useState(false);
  const paused = row.status === "paused";

  const priorityAction = useServerAction(setQueryPriorityAction, {
    onError: () => setPriority(row.priority),
  });
  const statusAction = useServerAction(setQueriesStatusAction);
  const deleteAction = useServerAction(deleteQueriesAction, {
    successMessage: "Question deleted",
    onSuccess: () => setConfirmOpen(false),
  });

  function changePriority(next: Priority) {
    setPriority(next);
    void priorityAction.execute({ projectId, queryId: row.id, priority: next });
  }

  async function toggleStatus() {
    const next = paused ? "active" : "paused";
    const result = await statusAction.execute({ projectId, queryIds: [row.id], status: next });
    if (result.ok) toast.success(next === "paused" ? "Question paused" : "Question resumed", { description: row.text });
  }

  return (
    <li
      className={cn(
        "grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] gap-x-3 px-4 py-4 transition-colors sm:px-5 lg:grid-cols-[1.25rem_minmax(0,1fr)_6.5rem_14rem_2rem] lg:items-center lg:gap-x-4 lg:py-3.5",
        selected ? "bg-primary-soft/40" : "hover:bg-surface-muted/50",
      )}
    >
      <div className="col-start-1 row-start-1 pt-0.5 lg:pt-0">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelectedChange(v === true)}
          aria-label="Select question"
          aria-describedby={textId}
        />
      </div>

      <div className="col-start-2 row-start-1 min-w-0">
        <Link
          href={detailHref}
          id={textId}
          className={cn(
            "rounded-sm text-sm leading-snug font-medium text-pretty underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            paused ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {row.text}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{CATEGORY_LABELS[row.category]}</Badge>
          {row.source === "manual" ? <Badge variant="outline">Added manually</Badge> : <Badge variant="outline">Generated</Badge>}
          {paused && (
            <Badge variant="warning">
              <Pause aria-hidden="true" />
              Paused
            </Badge>
          )}
          {row.service && <span className="truncate text-xs text-subtle-foreground">· {row.service}</span>}
        </div>
      </div>

      <div className="col-span-2 col-start-2 row-start-2 mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6 lg:contents">
        <div className="flex items-center gap-2 lg:col-start-3 lg:row-start-1">
          <span className="text-xs text-muted-foreground lg:sr-only" aria-hidden="true">
            Priority
          </span>
          <CompactSelect
            aria-label="Priority"
            aria-describedby={textId}
            value={priority}
            onChange={(e) => changePriority(e.target.value as Priority)}
            disabled={priorityAction.pending}
            className="w-28 lg:w-full"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </CompactSelect>
        </div>
        <ProviderResults providers={providers} results={row.results} hasScan={hasScan} className="min-w-0 lg:col-start-4 lg:row-start-1" />
      </div>

      <div className="col-start-3 row-start-1 flex justify-end lg:col-start-5">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Question actions" aria-describedby={textId} loading={statusAction.pending}>
              {!statusAction.pending && <Ellipsis aria-hidden="true" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={detailHref}>
                <ExternalLink aria-hidden="true" />
                View AI answers
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void toggleStatus()}>
              {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              {paused ? "Resume monitoring" : "Pause monitoring"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger-text [&_svg]:text-danger-text">
              <Trash2 aria-hidden="true" />
              Delete question
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this question?"
        description={
          <>
            <span className="block font-medium text-foreground">“{row.text}”</span>
            <span className="block">
              It won&apos;t be checked in future scans. Results from past scans stay in your history. To stop checking it
              temporarily, pause it instead.
            </span>
          </>
        }
        confirmLabel="Delete question"
        pending={deleteAction.pending}
        onConfirm={() => void deleteAction.execute({ projectId, queryIds: [row.id] })}
      />
    </li>
  );
}
