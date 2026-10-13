import { CreditCard, FolderKanban } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

/**
 * Shown instead of the wizard when the account cannot create a project:
 * the plan's project allowance is used up, or the subscription is inactive.
 */
export function OnboardingBlocked({
  kind,
  title,
  message,
  nextPlanHint,
}: {
  kind: "limit" | "inactive";
  title: string;
  message: string;
  nextPlanHint?: string | null;
}) {
  const Icon = kind === "limit" ? FolderKanban : CreditCard;
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="items-start gap-3 p-6 pb-4">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold leading-snug tracking-tight">{title}</h1>
        <CardDescription className="text-sm leading-relaxed">{message}</CardDescription>
      </CardHeader>
      {nextPlanHint && (
        <CardContent className="px-6 pb-5">
          <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-[13px] text-muted-foreground">{nextPlanHint}</p>
        </CardContent>
      )}
      <CardFooter className="flex-col-reverse items-stretch gap-2 px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild>
          <Link href={kind === "limit" ? "/billing#plans" : "/billing"}>{kind === "limit" ? "Upgrade Plan" : "Choose a plan"}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
