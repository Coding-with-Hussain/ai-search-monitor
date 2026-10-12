import { cn } from "@/lib/utils";

function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-primary-soft", className)}
    >
      <div className={cn("h-full rounded-full bg-primary transition-[width] duration-500", indicatorClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export { Progress };
