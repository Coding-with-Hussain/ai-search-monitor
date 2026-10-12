import { formatPercent } from "@/lib/format";
import type { ShareOfVoiceSlice } from "@/types/domain";

/** Up to this many named competitors; the rest fold into "Others". */
const MAX_NAMED = 3;
const COMPETITOR_COLORS = ["var(--series-2)", "var(--series-3)", "var(--series-4)"];

/**
 * Part-to-whole bar of AI recommendations. Colors follow the entity (your
 * business is always slot 1; competitors keep their slot by tracking order).
 * The legend lists every value, so color never carries meaning alone.
 */
export function ShareOfVoice({ slices, competitorOrder }: { slices: ShareOfVoiceSlice[]; competitorOrder: string[] }) {
  const business = slices.find((s) => s.kind === "business");
  const competitors = slices.filter((s) => s.kind === "competitor");
  const others = slices.find((s) => s.kind === "others");

  // Assign colors by tracking order (entity), not by rank.
  const colorFor = new Map<string, string>();
  competitorOrder.slice(0, MAX_NAMED).forEach((id, i) => colorFor.set(id, COMPETITOR_COLORS[i]));

  const named = competitors.filter((c) => colorFor.has(c.key));
  const folded = competitors.filter((c) => !colorFor.has(c.key));
  const othersShare = (others?.share ?? 0) + folded.reduce((s, c) => s + c.share, 0);
  const othersMentions = (others?.mentions ?? 0) + folded.reduce((s, c) => s + c.mentions, 0);

  const rows = [
    ...(business ? [{ key: "business", name: "Your business", share: business.share, mentions: business.mentions, color: "var(--series-1)" }] : []),
    ...named
      .sort((a, b) => b.share - a.share)
      .map((c) => ({ key: c.key, name: c.name, share: c.share, mentions: c.mentions, color: colorFor.get(c.key)! })),
    { key: "others", name: folded.length ? `Others (incl. ${folded.length} tracked)` : "Others", share: othersShare, mentions: othersMentions, color: "var(--series-others)" },
  ];
  const total = rows.reduce((s, r) => s + r.share, 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No recommendations were detected in monitored answers yet.</p>;
  }

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-surface" role="img" aria-label={rows.map((r) => `${r.name} ${formatPercent(r.share)}`).join(", ")}>
        {rows
          .filter((r) => r.share > 0)
          .map((r) => (
            <div key={r.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(r.share / total) * 100}%`, background: r.color }} title={`${r.name}: ${formatPercent(r.share)}`} />
          ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: r.color }} aria-hidden="true" />
              <span className={r.key === "business" ? "truncate font-medium" : "truncate text-muted-foreground"}>{r.name}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2 tabular">
              <span className="text-xs text-subtle-foreground">{r.mentions} rec.</span>
              <span className="w-12 text-right font-semibold">{formatPercent(r.share)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
