import { cn } from "@/lib/utils";

/**
 * Decorative radar: hairline concentric rings, a slow sweep and a couple of
 * soft "blips". Purely visual (aria-hidden); motion is disabled for users who
 * prefer reduced motion via the global stylesheet.
 */
export function RadarBackdrop({
  className,
  sweep = true,
  blips = true,
  id = "radar",
}: {
  className?: string;
  sweep?: boolean;
  blips?: boolean;
  /** Unique per page when the backdrop is rendered more than once (SVG gradient id). */
  id?: string;
}) {
  const gradientId = `${id}-sweep-fade`;
  const rings = [60, 120, 180, 240, 300];
  return (
    <div className={cn("pointer-events-none select-none", className)} aria-hidden="true">
      <svg viewBox="0 0 600 600" className="size-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: "var(--primary)", stopOpacity: 0.12 }} />
          </linearGradient>
        </defs>
        {rings.map((r) => (
          <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="var(--border-strong)" strokeOpacity="0.7" strokeWidth="1" />
        ))}
        <line x1="0" y1="300" x2="600" y2="300" stroke="var(--border)" strokeWidth="1" />
        <line x1="300" y1="0" x2="300" y2="600" stroke="var(--border)" strokeWidth="1" />
        {sweep && (
          <g className="animate-radar" style={{ animationDuration: "9s" }}>
            {/* 40° wedge ending on the 12 o'clock axis */}
            <path d="M300 300 L107.2 70.2 A300 300 0 0 1 300 0 Z" fill={`url(#${gradientId})`} />
            <line x1="300" y1="300" x2="300" y2="0" stroke="var(--primary)" strokeOpacity="0.28" strokeWidth="1" />
          </g>
        )}
        {blips && (
          <>
            {/* Near the outer rings, so they sit beside (never on top of) centered text. */}
            <Blip cx={545} cy={380} />
            <Blip cx={39} cy={370} delay="1.1s" muted />
          </>
        )}
      </svg>
    </div>
  );
}

function Blip({ cx, cy, delay = "0s", muted = false }: { cx: number; cy: number; delay?: string; muted?: boolean }) {
  const color = muted ? "var(--chart-muted)" : "var(--primary)";
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r="6"
        fill={color}
        opacity="0.5"
        className={cn("animate-ping-soft", muted && "max-sm:hidden")}
        style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: delay }}
      />
      <circle cx={cx} cy={cy} r="4" fill={color} className={cn(muted && "max-sm:hidden")} />
    </g>
  );
}
