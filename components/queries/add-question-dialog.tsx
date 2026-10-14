"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import type * as React from "react";

import { addQueryAction } from "@/app/actions/queries";
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
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";
import { addQuerySchema } from "@/schemas/project";
import type { Priority, QueryCategory } from "@/types/domain";

import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from "./labels";

const MAX_TEXT = 300;

type Errors = Partial<Record<"text" | "category" | "priority" | "service", string>>;

const EMPTY = { text: "", category: "recommendation" as QueryCategory, priority: "medium" as Priority, service: "" };

/** "Add question" dialog: one buyer question, validated on both sides. */
export function AddQuestionDialog({
  projectId,
  services,
  disabled,
  trigger,
}: {
  projectId: string;
  services: string[];
  disabled?: boolean;
  trigger?: React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  const { execute, pending } = useServerAction(addQueryAction, {
    successMessage: "Question added",
    onSuccess: () => {
      setOpen(false);
      setValues(EMPTY);
      setErrors({});
    },
    onError: (result) => {
      const fe = result.fieldErrors ?? {};
      setErrors({ text: fe.text?.[0], category: fe.category?.[0], priority: fe.priority?.[0], service: fe.service?.[0] });
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = addQuerySchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    void execute({ projectId, ...parsed.data });
  }

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as keyof Errors]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const textLength = values.text.trim().length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setErrors({});
      }}
    >
      <DialogTrigger asChild disabled={disabled}>
        {trigger ?? (
          <Button size="sm" disabled={disabled}>
            <Plus aria-hidden="true" />
            Add question
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a question</DialogTitle>
          <DialogDescription>
            Write it the way a potential customer would ask an AI assistant. It&apos;s checked on every monitored AI platform
            in your next scan.
          </DialogDescription>
        </DialogHeader>

        <form id={`${id}-form`} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-text`}>Question</Label>
            <Textarea
              id={`${id}-text`}
              value={values.text}
              onChange={(e) => set("text", e.target.value)}
              maxLength={MAX_TEXT}
              rows={3}
              placeholder="e.g. Which dentist in Austin is best for emergency appointments?"
              aria-invalid={errors.text ? true : undefined}
              aria-describedby={`${id}-text-hint${errors.text ? ` ${id}-text-error` : ""}`}
            />
            <div className="flex items-start justify-between gap-3 text-xs">
              <p id={`${id}-text-hint`} className="text-muted-foreground">
                Very similar questions are rejected so each one adds new signal.
              </p>
              <p className={cn("tabular shrink-0", textLength > MAX_TEXT - 20 ? "text-warning-text" : "text-subtle-foreground")} aria-hidden="true">
                {textLength}/{MAX_TEXT}
              </p>
            </div>
            {errors.text && (
              <p id={`${id}-text-error`} className="text-[13px] text-danger-text">
                {errors.text}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-category`}>Category</Label>
              <NativeSelect
                id={`${id}-category`}
                value={values.category}
                onChange={(e) => set("category", e.target.value as QueryCategory)}
                aria-invalid={errors.category ? true : undefined}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
              {errors.category && <p className="text-[13px] text-danger-text">{errors.category}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-priority`}>Priority</Label>
              <NativeSelect
                id={`${id}-priority`}
                value={values.priority}
                onChange={(e) => set("priority", e.target.value as Priority)}
                aria-describedby={`${id}-priority-hint`}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </NativeSelect>
              <p id={`${id}-priority-hint`} className="text-xs text-muted-foreground">
                High-priority questions are checked first when your monthly usage runs low.
              </p>
            </div>
          </div>

          {services.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-service`} className="flex items-center gap-1.5">
                Product or service
                <span className="text-xs font-normal text-subtle-foreground">Optional</span>
              </Label>
              <NativeSelect
                id={`${id}-service`}
                value={values.service}
                onChange={(e) => set("service", e.target.value)}
                aria-describedby={`${id}-service-hint`}
                aria-invalid={errors.service ? true : undefined}
              >
                <option value="">Not specific to one service</option>
                {services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
              <p id={`${id}-service-hint`} className="text-xs text-muted-foreground">
                Links the question to a service so results can be grouped by service.
              </p>
              {errors.service && <p className="text-[13px] text-danger-text">{errors.service}</p>}
            </div>
          )}
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form={`${id}-form`} loading={pending}>
            Add question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
