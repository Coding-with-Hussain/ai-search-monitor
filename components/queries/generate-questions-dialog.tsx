"use client";

import { Sparkles } from "lucide-react";
import { useId, useState } from "react";
import type * as React from "react";
import { toast } from "sonner";

import { generateQueriesAction } from "@/app/actions/queries";
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
import { useServerAction } from "@/hooks/use-server-action";
import { formatNumber, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

import { GENERATE_COUNTS, type GenerateCount } from "./labels";

/**
 * "Generate more questions" dialog: 5 / 10 / 20 new buyer-intent questions,
 * written from the project's services, location and competitors. Duplicates
 * and near-duplicates of existing questions are skipped.
 */
export function GenerateQuestionsDialog({
  projectId,
  remainingCapacity,
  disabled,
  trigger,
}: {
  projectId: string;
  /** How many more questions fit under the per-project cap. */
  remainingCapacity: number;
  disabled?: boolean;
  trigger?: React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<GenerateCount>(10);

  const { execute, pending } = useServerAction(generateQueriesAction, {
    successMessage: (d) => (d.added > 0 ? `${pluralize(d.added, "new question")} added` : null),
    onSuccess: (d) => {
      setOpen(false);
      if (d.added === 0) {
        toast("No new unique questions found", {
          description: "Your current questions already cover what we can generate. Try adding a service or a question of your own.",
        });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger ?? (
          <Button size="sm" variant="outline" disabled={disabled}>
            <Sparkles aria-hidden="true" />
            Generate more questions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate buyer-intent questions</DialogTitle>
          <DialogDescription>
            We write realistic questions customers ask AI assistants, based on your services, location and competitors.
            Questions similar to ones you already monitor are skipped.
          </DialogDescription>
        </DialogHeader>

        <form
          id={`${id}-form`}
          onSubmit={(e) => {
            e.preventDefault();
            void execute({ projectId, count });
          }}
        >
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">How many new questions?</legend>
            <div className="grid grid-cols-3 gap-2">
              {GENERATE_COUNTS.map((n) => (
                <label
                  key={n}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-3 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    count === n ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:bg-surface-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="count"
                    value={n}
                    checked={count === n}
                    onChange={() => setCount(n)}
                    className="sr-only"
                  />
                  <span className="text-lg font-semibold tabular">{n}</span>
                  <span className="text-xs text-muted-foreground">questions</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-3 text-xs text-muted-foreground">
            {remainingCapacity < count
              ? `Only ${formatNumber(remainingCapacity)} more ${remainingCapacity === 1 ? "question fits" : "questions fit"} in this project, so at most that many will be added.`
              : "New questions start as active and are checked in your next scan. Each one counts as one query per scan."}
          </p>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form={`${id}-form`} loading={pending}>
            {!pending && <Sparkles aria-hidden="true" />}
            Generate questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
