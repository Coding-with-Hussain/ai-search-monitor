import { ThumbsUp, TriangleAlert } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/** Top wins and top problems side by side (stacked on mobile). */
export function InsightsList({ wins, problems, className }: { wins: string[]; problems: string[]; className?: string }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <InsightColumn
        title="Top wins"
        items={wins}
        empty="No clear wins observed in this scan yet."
        icon={<ThumbsUp className="size-3.5" aria-hidden="true" />}
        tone="success"
      />
      <InsightColumn
        title="Top problems"
        items={problems}
        empty="No significant problems observed in this scan."
        icon={<TriangleAlert className="size-3.5" aria-hidden="true" />}
        tone="warning"
      />
    </div>
  );
}

function InsightColumn({
  title,
  items,
  empty,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  icon: React.ReactNode;
  tone: "success" | "warning";
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="print-avoid-break rounded-lg border border-border p-4">
      <h4 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            tone === "success" ? "bg-success-soft text-success-text" : "bg-warning-soft text-warning-text",
          )}
        >
          {icon}
        </span>
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed">
              <span
                className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", tone === "success" ? "bg-success" : "bg-warning")}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
