import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Signed change indicator. Icon + sign + text so meaning never relies on color alone. */
export function Delta({
  value,
  suffix = "",
  invert = false,
  className,
  context,
  emptyLabel = "No previous data",
}: {
  value: number | null | undefined;
  suffix?: string;
  /** For metrics where lower is better (e.g. average position). */
  invert?: boolean;
  className?: string;
  context?: string;
  /** Shown when there is no change to display. */
  emptyLabel?: string;
}) {
  const text = formatDelta(value, suffix);
  if (text === null) return <span className={cn("text-xs text-subtle-foreground", className)}>{emptyLabel}</span>;
  const v = value ?? 0;
  const good = invert ? v < 0 : v > 0;
  const neutral = Math.abs(v) < 0.05;
  const Icon = neutral ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        neutral ? "text-muted-foreground" : good ? "text-success-text" : "text-danger-text",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {text}
      {context && <span className="ml-1 font-normal text-subtle-foreground">{context}</span>}
    </span>
  );
}
