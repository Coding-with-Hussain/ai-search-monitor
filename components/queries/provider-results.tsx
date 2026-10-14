import { PROVIDER_META } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import type { ProviderId } from "@/types/domain";

import { resultLabel } from "./labels";
import type { ProviderResult } from "./types";

/** Latest-scan outcome per AI platform for one question (text first; the dot is decoration). */
export function ProviderResults({
  providers,
  results,
  hasScan = true,
  className,
}: {
  providers: ProviderId[];
  results: Partial<Record<ProviderId, ProviderResult>>;
  /** False before the project's first completed scan. */
  hasScan?: boolean;
  className?: string;
}) {
  if (!hasScan) return <p className={cn("text-[13px] text-subtle-foreground", className)}>Not checked yet</p>;
  if (providers.length === 0) return <p className={cn("text-xs text-subtle-foreground", className)}>No AI platforms selected</p>;
  return (
    <dl className={cn("grid gap-1", className)}>
      {providers.map((p) => {
        const result = results[p];
        const { label, dot } = resultLabel(result);
        return (
          <div key={p} className="flex min-w-0 items-center gap-2 text-[13px]">
            <dt className="w-[4.75rem] shrink-0 text-xs text-muted-foreground">{PROVIDER_META[p].name}</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden="true" />
              <span className={cn("truncate", result?.state === "recommended" ? "font-medium text-foreground" : "text-muted-foreground")}>
                {label === "—" ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">Not in the latest scan</span>
                  </>
                ) : (
                  label
                )}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
