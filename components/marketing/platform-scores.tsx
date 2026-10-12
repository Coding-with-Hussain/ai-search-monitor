import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import type { ProviderId } from "@/types/domain";

/**
 * Score per AI platform as labeled horizontal meters. Color follows the
 * provider (ChatGPT = series 1, Gemini = 2, Perplexity = 3); the value is
 * always printed as text next to the bar.
 */
export function PlatformScores({
  scores,
  className,
  showVendor = true,
}: {
  scores: Array<{ provider: ProviderId; score: number }>;
  className?: string;
  showVendor?: boolean;
}) {
  return (
    <ul className={cn("space-y-4", className)} aria-label="AI Visibility score by platform">
      {scores.map(({ provider, score }) => {
        const meta = PROVIDER_META[provider];
        return (
          <li key={provider}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium text-foreground">
                {meta.name}
                {showVendor && <span className="ml-1.5 font-normal text-subtle-foreground">{meta.vendor}</span>}
              </span>
              <span className="font-semibold text-foreground tabular">
                {score}
                <span className="font-normal text-subtle-foreground">/100</span>
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, score))}%`, background: meta.chartVar }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
