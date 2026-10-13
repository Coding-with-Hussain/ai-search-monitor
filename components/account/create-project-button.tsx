import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Create Project" that respects plan limits: when the account is at its
 * project allowance (or the subscription is inactive) the button is disabled
 * and explains why, with a link to upgrade. The server enforces the same
 * limits in `createProjectAction`.
 */
export function CreateProjectButton({
  id,
  atLimit,
  inactiveReason,
  planName,
  projectLimit,
  align = "end",
  className,
}: {
  /** Unique id prefix for aria-describedby. */
  id: string;
  atLimit: boolean;
  /** Set when the subscription is inactive. */
  inactiveReason?: string | null;
  planName: string;
  projectLimit: number;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  if (!atLimit && !inactiveReason) {
    return (
      <Button asChild className={className}>
        <Link href="/onboarding">
          <Plus aria-hidden="true" />
          Create Project
        </Link>
      </Button>
    );
  }

  const noteId = `${id}-note`;
  const note = inactiveReason ?? `Your ${planName} plan includes ${projectLimit} project${projectLimit === 1 ? "" : "s"}.`;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        align === "end" && "items-start sm:items-end",
        align === "center" && "items-center",
        align === "start" && "items-start",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled aria-describedby={noteId}>
          <Plus aria-hidden="true" />
          Create Project
        </Button>
        <Button variant="outline" asChild>
          <Link href={inactiveReason ? "/billing" : "/billing#plans"}>{inactiveReason ? "Choose a plan" : "Upgrade"}</Link>
        </Button>
      </div>
      <p id={noteId} className={cn("max-w-xs text-xs text-muted-foreground", align === "end" && "sm:text-right", align === "center" && "text-center")}>
        {note}
      </p>
    </div>
  );
}
