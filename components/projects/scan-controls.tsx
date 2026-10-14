"use client";

import { Play, Radar, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { startScanAction } from "@/app/actions/scans";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trackClient } from "@/lib/analytics/client";
import { providerName } from "@/lib/providers-meta";
import type { ScanProgressDto } from "@/lib/scan-progress";
import { useServerAction } from "@/hooks/use-server-action";

const POLL_MS = 1500;

export function ScanControls({
  projectId,
  initialScan,
  mockMode,
  disabledReason,
}: {
  projectId: string;
  initialScan: ScanProgressDto | null;
  mockMode: boolean;
  /** When set, the run button is disabled and this explains why. */
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [scan, setScan] = useState<ScanProgressDto | null>(initialScan);
  const [pollError, setPollError] = useState<string | null>(null);
  const isActive = (s: ScanProgressDto | null) => Boolean(s && (s.status === "queued" || s.status === "running"));
  const active = isActive(scan);
  // The scan currently being polled (null = not polling).
  const [pollId, setPollId] = useState<string | null>(isActive(initialScan) ? initialScan!.id : null);

  useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delay: number) => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const res = await fetch(`/api/scans/${pollId}`, { cache: "no-store" });
          if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Could not load scan status.");
          const data = (await res.json()) as ScanProgressDto;
          if (cancelled) return;
          setScan(data);
          setPollError(null);
          if (data.status === "completed") {
            toast.success("Scan completed", {
              description: data.score !== null ? `AI Visibility score: ${Math.round(data.score)}/100` : undefined,
            });
            trackClient("scan_completed", { projectId, mode: data.mode });
            setPollId(null);
            router.refresh();
            return;
          }
          if (data.status === "failed" || data.status === "cancelled") {
            setPollId(null);
            router.refresh();
            return;
          }
          schedule(POLL_MS);
        } catch (error) {
          if (cancelled) return;
          setPollError((error as Error).message);
          schedule(POLL_MS * 3);
        }
      }, delay);
    };

    schedule(POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollId, projectId, router]);

  const { execute, pending } = useServerAction(startScanAction, {
    onSuccess: (data) => {
      toast.message("Scan started", { description: "We're asking AI assistants your buyer questions." });
      for (const note of data.notes) toast.warning(note);
      setScan({
        id: data.scanId,
        status: "queued",
        mode: data.mode,
        totalItems: data.totalItems,
        completedItems: 0,
        failedItems: 0,
        queryCount: 0,
        providerCount: 0,
        currentProvider: null,
        currentQuery: null,
        score: null,
        error: null,
        notes: data.notes,
      });
      setPollId(data.scanId);
    },
  });

  const run = () => execute({ projectId });

  const done = scan ? scan.completedItems + scan.failedItems : 0;
  const providers = scan?.providerCount || 1;
  const questionsDone = Math.min(scan?.queryCount ?? 0, Math.floor(done / providers));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {mockMode && <SimulationBadge />}
        <Button onClick={run} loading={pending} disabled={Boolean(active) || Boolean(disabledReason)} title={disabledReason ?? undefined} data-testid="run-scan">
          {active ? <Radar className="animate-spin [animation-duration:2.5s]" /> : <Play />}
          {active ? "Scan running…" : mockMode ? "Run scan (simulation)" : "Run scan"}
        </Button>
      </div>
      {disabledReason && !active && <p className="max-w-xs text-xs text-muted-foreground sm:text-right">{disabledReason}</p>}

      {scan && active && (
        <Card className="w-full p-4 sm:w-[380px]" aria-live="polite" data-testid="scan-progress">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">AI Visibility Scan</p>
            <span className="text-xs text-muted-foreground">{scan.status === "queued" ? "Queued" : "Running"}</span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Analyzing {questionsDone} / {scan.queryCount || "…"} questions
            <span className="text-subtle-foreground"> · {done}/{scan.totalItems} answers</span>
          </p>
          <Progress value={done} max={scan.totalItems || 1} className="mt-3" label="Scan progress" />
          {scan.currentProvider && (
            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-subtle-foreground">Current provider</dt>
                <dd className="font-medium">{providerName(scan.currentProvider)}</dd>
              </div>
              {scan.currentQuery && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-subtle-foreground">Current query</dt>
                  <dd className="line-clamp-2">&ldquo;{scan.currentQuery}&rdquo;</dd>
                </div>
              )}
            </dl>
          )}
          {pollError && <p className="mt-2 text-xs text-danger-text">{pollError} Retrying…</p>}
        </Card>
      )}

      {scan && scan.status === "failed" && (
        <Alert
          variant="danger"
          title="Your scan failed"
          className="w-full sm:w-[380px]"
          action={
            <Button size="sm" variant="outline" onClick={run} loading={pending}>
              <RotateCcw /> Retry
            </Button>
          }
        >
          {scan.error ?? "Something went wrong while scanning."}
        </Alert>
      )}
    </div>
  );
}
