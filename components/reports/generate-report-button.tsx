"use client";

import { FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { toast } from "sonner";

import { generateReportAction } from "@/app/actions/reports";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";

/**
 * Generates a report from the latest completed scan, then opens it. When it
 * cannot run (no completed scan, inactive subscription) the button is disabled
 * and the reason is written next to it.
 */
export function GenerateReportButton({
  projectId,
  disabledReason,
  size = "default",
  align = "end",
  className,
}: {
  projectId: string;
  disabledReason?: string | null;
  size?: ButtonProps["size"];
  /** "end" in a page header, "center" inside an empty state. */
  align?: "end" | "center";
  className?: string;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [navigating, startNavigation] = useTransition();
  const { execute, pending } = useServerAction(generateReportAction, {
    onSuccess: (data) => {
      toast.success("Report generated", { description: data.title });
      startNavigation(() => router.push(`/projects/${projectId}/reports/${data.reportId}`));
    },
  });
  const busy = pending || navigating;

  return (
    <div
      className={cn("flex flex-col gap-1.5", align === "center" ? "items-center text-center" : "items-start sm:items-end", className)}
    >
      <Button
        size={size}
        onClick={() => void execute({ projectId })}
        loading={busy}
        disabled={Boolean(disabledReason)}
        aria-describedby={disabledReason ? reasonId : undefined}
      >
        {!busy && <FilePlus2 aria-hidden="true" />}
        {busy ? "Generating report…" : "Generate report"}
      </Button>
      {disabledReason && (
        <p id={reasonId} className={cn("max-w-xs text-xs text-muted-foreground", align === "end" && "sm:text-right")}>
          {disabledReason}
        </p>
      )}
    </div>
  );
}
