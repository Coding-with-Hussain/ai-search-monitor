"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { removeCompetitorAction } from "@/app/actions/competitors";
import { ConfirmDialog } from "@/components/queries/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

/** Remove a tracked competitor after confirmation. */
export function RemoveCompetitorButton({ projectId, competitorId, name }: { projectId: string; competitorId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const { execute, pending } = useServerAction(removeCompetitorAction, {
    successMessage: (d) => `${d.name} is no longer tracked`,
    onSuccess: () => setOpen(false),
  });
  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-danger-text" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" />
        Remove
        <span className="sr-only"> {name}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Stop tracking ${name}?`}
        description={
          <span className="block">
            Future scans won&apos;t check AI answers for {name}. Results from past scans stay in your history, and you can add
            it again at any time.
          </span>
        }
        confirmLabel="Remove competitor"
        pending={pending}
        onConfirm={() => void execute({ projectId, competitorId })}
      />
    </>
  );
}
