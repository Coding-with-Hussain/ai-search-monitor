"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteReportAction } from "@/app/actions/reports";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useServerAction } from "@/hooks/use-server-action";

/**
 * Delete a stored report after confirmation. With `redirectTo` (the report
 * page) the user is sent back to the list once it is gone.
 */
export function DeleteReportButton({
  projectId,
  reportId,
  reportTitle,
  redirectTo,
  variant = "ghost",
  size = "sm",
  iconOnly = false,
}: {
  projectId: string;
  reportId: string;
  reportTitle: string;
  redirectTo?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const { execute, pending } = useServerAction(deleteReportAction, {
    onSuccess: () => {
      toast.success("Report deleted");
      setOpen(false);
      if (redirectTo) startNavigation(() => router.replace(redirectTo));
    },
  });
  const busy = pending || navigating;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={iconOnly ? "icon-sm" : size}
          className={variant === "ghost" ? "text-muted-foreground hover:text-danger-text" : undefined}
          aria-label={iconOnly ? `Delete report: ${reportTitle}` : undefined}
        >
          <Trash2 aria-hidden="true" />
          {!iconOnly && (
            <>
              Delete
              <span className="sr-only"> report: {reportTitle}</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this report?</DialogTitle>
          <DialogDescription>
            “{reportTitle}” will be removed permanently. Your scans and history are not affected, and you can generate a new
            report at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={busy}
            onClick={() => void execute({ projectId, reportId, navigateAway: Boolean(redirectTo) })}
          >
            Delete report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
