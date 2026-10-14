"use client";

import { CircleCheck, CircleSlash, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { setRecommendationStatusAction } from "@/app/actions/recommendations";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

import type { RecommendationStatusValue } from "./labels";

type Target = RecommendationStatusValue;

/**
 * Mark complete / Dismiss (open) or Reopen (completed, dismissed). Completing
 * or dismissing shows a toast with Undo, since the card leaves the current tab.
 */
export function RecommendationActions({
  projectId,
  recommendationId,
  status,
  title,
}: {
  projectId: string;
  recommendationId: string;
  status: RecommendationStatusValue;
  title: string;
}) {
  const [target, setTarget] = useState<Target | null>(null);

  const undo = (previous: Target) => {
    void setRecommendationStatusAction({ projectId, recommendationId, status: previous })
      .then((result) => {
        if (!result.ok) toast.error(result.error);
      })
      .catch(() => toast.error("Network error. Check your connection and try again."));
  };

  const { execute, pending } = useServerAction(setRecommendationStatusAction, {
    onSuccess: (data) => {
      if (data.status === data.previousStatus) return;
      const undoAction = { label: "Undo", onClick: () => undo(data.previousStatus) };
      if (data.status === "completed") toast.success("Recommendation completed", { description: title, action: undoAction });
      else if (data.status === "dismissed") toast("Recommendation dismissed", { description: title, action: undoAction });
    },
  });

  const run = (next: Target) => {
    setTarget(next);
    void execute({ projectId, recommendationId, status: next }).finally(() => setTarget(null));
  };

  if (status === "open") {
    return (
      <>
        <Button size="sm" onClick={() => run("completed")} loading={pending && target === "completed"} disabled={pending}>
          {!(pending && target === "completed") && <CircleCheck aria-hidden="true" />}
          Mark complete
          <span className="sr-only">: {title}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => run("dismissed")}
          loading={pending && target === "dismissed"}
          disabled={pending}
        >
          {!(pending && target === "dismissed") && <CircleSlash aria-hidden="true" />}
          Dismiss
          <span className="sr-only">: {title}</span>
        </Button>
      </>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => run("open")} loading={pending} disabled={pending}>
      {!pending && <RotateCcw aria-hidden="true" />}
      Reopen
      <span className="sr-only">: {title}</span>
    </Button>
  );
}
