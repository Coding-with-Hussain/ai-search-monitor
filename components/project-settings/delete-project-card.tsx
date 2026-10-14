"use client";

import { TriangleAlert } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteProjectAction } from "@/app/actions/project-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Danger zone: permanently delete the project. The user must type the
 * project name; the server checks it again and redirects to /projects.
 */
export function DeleteProjectCard({
  projectId,
  projectName,
  isOwner,
  isDemo,
}: {
  projectId: string;
  projectName: string;
  isOwner: boolean;
  isDemo: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = confirm.trim() === projectName.trim();

  function onDelete() {
    if (!matches) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteProjectAction({ projectId, confirmName: confirm });
        // On success the action redirects, so we only get here on failure.
        if (!result.ok) {
          setError(result.error);
          toast.error(result.error);
        }
      } catch (err) {
        // The redirect to /projects arrives as a thrown control-flow error.
        unstable_rethrow(err);
        setError("Network error. Check your connection and try again.");
      }
    });
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid gap-5 rounded-xl border border-danger/30 bg-surface p-5 shadow-card sm:p-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-10"
    >
      <div>
        <h2 id={`${id}-title`} className="text-[15px] font-semibold tracking-tight text-danger-text">
          Danger zone
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Irreversible actions for this project.</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Delete this project</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {isOwner
              ? `Permanently deletes ${projectName}${isDemo ? " (a demo project)" : ""}, including its questions, competitors, scan history, recommendations and reports.`
              : "Only the project owner can delete this project."}
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (pending) return;
            setOpen(next);
            if (!next) {
              setConfirm("");
              setError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive-outline" disabled={!isOwner} className="shrink-0">
              Delete project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger-text">
                <TriangleAlert className="size-5" aria-hidden="true" />
              </div>
              <DialogTitle>Delete {projectName}?</DialogTitle>
              <DialogDescription>
                This permanently deletes the project and all of its data: questions, competitors, scan history, AI answers,
                recommendations and reports. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <form
              id={`${id}-form`}
              onSubmit={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="flex flex-col gap-2"
            >
              <Label htmlFor={`${id}-confirm`}>
                Type <span className="font-semibold select-all">{projectName}</span> to confirm
              </Label>
              <Input
                id={`${id}-confirm`}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                autoComplete="off"
                spellCheck={false}
                disabled={pending}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              {error && (
                <p id={`${id}-error`} className="text-[13px] text-danger-text">
                  {error}
                </p>
              )}
            </form>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" form={`${id}-form`} variant="destructive" loading={pending} disabled={!matches}>
                Delete project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
