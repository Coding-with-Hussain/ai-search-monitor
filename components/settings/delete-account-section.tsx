"use client";

import { TriangleAlert } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteAccountAction } from "@/app/actions/settings";
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

import { DELETE_CONFIRMATION_WORD } from "./schemas";
import { SettingsSection } from "./settings-section";

/**
 * Danger zone: permanently delete the account. The user must type DELETE; the
 * server checks it again, cancels any paid subscription, deletes everything
 * and redirects to the home page.
 */
export function DeleteAccountSection({
  available,
  unavailableReason,
  hasPaidSubscription,
  projectCount,
}: {
  /** Account deletion is configured (service-role key present). */
  available: boolean;
  unavailableReason: string;
  hasPaidSubscription: boolean;
  projectCount: number;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = confirm.trim() === DELETE_CONFIRMATION_WORD;
  const confirmId = `${id}-confirm`;

  function onDelete() {
    if (!matches || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteAccountAction({ confirm });
        // On success the action redirects, so we only get here on failure.
        if (result && !result.ok) {
          setError(result.error);
          toast.error(result.error);
        }
      } catch (err) {
        // The redirect to the home page arrives as a thrown control-flow error.
        unstable_rethrow(err);
        setError("Network error. Check your connection and try again.");
      }
    });
  }

  return (
    <SettingsSection id="danger" title="Danger zone" description="Irreversible actions for your account." tone="danger">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Delete account</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {projectCount === 0
              ? "Permanently deletes your account, settings and usage history."
              : `Permanently deletes your account and ${projectCount === 1 ? "your project" : `all ${projectCount} projects`}, including scan history, recommendations and reports.`}
            {hasPaidSubscription ? " Your paid subscription is canceled immediately." : ""}
          </p>
          {!available && (
            <p id={`${id}-unavailable`} className="mt-2 text-[13px] leading-relaxed text-warning-text">
              {unavailableReason}
            </p>
          )}
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
            <Button
              variant="destructive-outline"
              className="shrink-0 self-start sm:self-center"
              disabled={!available}
              aria-describedby={available ? undefined : `${id}-unavailable`}
            >
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger-text">
                <TriangleAlert className="size-5" aria-hidden="true" />
              </div>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently deletes your account and all of its data — projects, questions, competitors, scan history,
                AI answers, recommendations and reports. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            {hasPaidSubscription && (
              <p className="rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] leading-snug text-warning-text">
                Your paid subscription will be canceled immediately. Unused time isn&apos;t refunded automatically.
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="flex flex-col gap-2"
            >
              <Label htmlFor={confirmId}>
                Type <span className="font-semibold select-all">{DELETE_CONFIRMATION_WORD}</span> to confirm
              </Label>
              <Input
                id={confirmId}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${confirmId}-error` : undefined}
                disabled={pending}
              />
              {error && (
                <p id={`${confirmId}-error`} role="alert" className="text-[13px] text-danger-text">
                  {error}
                </p>
              )}
              <DialogFooter className="mt-3">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" variant="destructive" loading={pending} disabled={!matches || pending}>
                  Delete my account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsSection>
  );
}
