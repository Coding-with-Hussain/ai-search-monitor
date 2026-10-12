import { cn } from "@/lib/utils";

/**
 * Circular progress for the 0–100 AI Visibility score. The hero figure uses
 * the same sans as the rest of the UI (proportional figures).
 */
export function ScoreRing({
  value,
  size = 168,
  stroke = 12,
  label = "AI Visibility",
  className,
  showLabel = true,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const tone = value === null ? "var(--chart-muted)" : value >= 70 ? "var(--success)" : value >= 40 ? "var(--primary)" : "var(--serious)";
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={value === null ? `${label}: no data yet` : `${label}: ${Math.round(value)} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="leading-none font-semibold tracking-tight" style={{ fontSize: size * 0.3 }}>
          {value === null ? "—" : Math.round(value)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">/100</span>
        {showLabel && size >= 140 && <span className="mt-1.5 text-[11px] font-medium text-subtle-foreground">{label}</span>}
      </div>
    </div>
  );
}
