"use client";

import { Pause, Play } from "lucide-react";

import { setQueriesStatusAction } from "@/app/actions/queries";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

/** Pause or resume monitoring of this question from its detail page. */
export function QueryStatusButton({ projectId, queryId, status }: { projectId: string; queryId: string; status: "active" | "paused" }) {
  const { execute, pending } = useServerAction(setQueriesStatusAction, {
    successMessage: (d) => (d.status === "paused" ? "Question paused" : "Question resumed"),
  });
  const paused = status === "paused";
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() => void execute({ projectId, queryIds: [queryId], status: paused ? "active" : "paused" })}
    >
      {!pending && (paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />)}
      {paused ? "Resume monitoring" : "Pause monitoring"}
    </Button>
  );
}
