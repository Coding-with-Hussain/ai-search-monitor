"use client";

import { Pause, Play, Trash2, X } from "lucide-react";
import { useState } from "react";

import { deleteQueriesAction, setQueriesStatusAction } from "@/app/actions/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useServerAction } from "@/hooks/use-server-action";
import { pluralize } from "@/lib/format";
import { PROVIDER_META } from "@/lib/providers-meta";
import type { ProviderId } from "@/types/domain";

import { ConfirmDialog } from "./confirm-dialog";
import { QueryRow } from "./query-row";
import type { QueryRowData } from "./types";

/** Question list with per-page bulk selection (pause, resume, delete). */
export function QueryList({
  rows,
  projectId,
  basePath,
  providers,
  hasScan,
  scopedProvider,
}: {
  rows: QueryRowData[];
  projectId: string;
  basePath: string;
  providers: ProviderId[];
  /** False before the project's first completed scan. */
  hasScan: boolean;
  /** Set when the list is filtered to one AI platform (the status column shows only it). */
  scopedProvider?: ProviderId;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Only rows on this page can be selected; ignore ids that left the page.
  const visibleIds = rows.map((r) => r.id);
  const selectedIds = visibleIds.filter((id) => selected.has(id));
  const allSelected = selectedIds.length > 0 && selectedIds.length === visibleIds.length;

  const clear = () => setSelected(new Set());
  const statusAction = useServerAction(setQueriesStatusAction, {
    successMessage: (d) => `${pluralize(d.count, "question")} ${d.status === "paused" ? "paused" : "resumed"}`,
    onSuccess: clear,
  });
  const deleteAction = useServerAction(deleteQueriesAction, {
    successMessage: (d) => `${pluralize(d.count, "question")} deleted`,
    onSuccess: () => {
      clear();
      setConfirmOpen(false);
    },
  });
  const busy = statusAction.pending || deleteAction.pending;

  function toggle(id: string, value: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const statusHeading = scopedProvider ? `${PROVIDER_META[scopedProvider].name} in latest scan` : "Latest scan";

  return (
    <div>
      <div
        className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface-muted/50 px-4 py-2 sm:px-5 lg:gap-x-4"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <div className="flex w-5 shrink-0">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => setSelected(v === true ? new Set(visibleIds) : new Set())}
            aria-label="Select all questions on this page"
            disabled={busy}
          />
        </div>
        {selectedIds.length === 0 ? (
          <div className="grid flex-1 items-center gap-4 text-xs font-medium text-muted-foreground lg:grid-cols-[minmax(0,1fr)_6.5rem_14rem_2rem]">
            <span>Question</span>
            <span className="hidden lg:block">Priority</span>
            <span className="hidden lg:block">{statusHeading}</span>
            <span className="hidden lg:block" />
          </div>
        ) : (
          <>
            <span className="text-[13px] font-medium" aria-live="polite">
              {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void statusAction.execute({ projectId, queryIds: selectedIds, status: "paused" })}
              >
                <Pause aria-hidden="true" />
                Pause
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void statusAction.execute({ projectId, queryIds: selectedIds, status: "active" })}
              >
                <Play aria-hidden="true" />
                Resume
              </Button>
              <Button size="sm" variant="destructive-outline" disabled={busy} onClick={() => setConfirmOpen(true)}>
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={clear}>
                <X aria-hidden="true" />
                Clear
              </Button>
            </div>
          </>
        )}
      </div>

      <ul className="divide-y divide-border" aria-label="Questions" aria-busy={busy || undefined}>
        {rows.map((row) => (
          <QueryRow
            key={row.id}
            row={row}
            projectId={projectId}
            detailHref={`${basePath}/${row.id}`}
            providers={providers}
            hasScan={hasScan}
            selected={selected.has(row.id)}
            onSelectedChange={(v) => toggle(row.id, v)}
          />
        ))}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${pluralize(selectedIds.length, "question")}?`}
        description={
          <span className="block">
            They won&apos;t be checked in future scans. Results from past scans stay in your history. To stop checking them
            temporarily, pause them instead.
          </span>
        }
        confirmLabel={`Delete ${pluralize(selectedIds.length, "question")}`}
        pending={deleteAction.pending}
        onConfirm={() => void deleteAction.execute({ projectId, queryIds: selectedIds })}
      />
    </div>
  );
}
