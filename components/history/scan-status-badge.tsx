import { CircleAlert, CircleCheck, CircleSlash, Clock, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ScanStatus } from "@/types/domain";

import { SCAN_STATUS_META } from "./labels";

const ICONS = {
  completed: CircleCheck,
  running: LoaderCircle,
  queued: Clock,
  failed: CircleAlert,
  cancelled: CircleSlash,
} as const;

/** Scan status with icon + text (never color alone). */
export function ScanStatusBadge({ status, className }: { status: ScanStatus; className?: string }) {
  const meta = SCAN_STATUS_META[status];
  const Icon = ICONS[status];
  return (
    <Badge variant={meta.variant} className={className}>
      <Icon aria-hidden="true" className={status === "running" ? "animate-spin" : undefined} />
      {meta.label}
    </Badge>
  );
}
