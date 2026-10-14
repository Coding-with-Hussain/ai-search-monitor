import { PROVIDER_META, providerName } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import type { ProviderId } from "@/types/domain";

import { cellLabel, type MatrixCell, type MatrixRow, type OtherBusinessSummary } from "./insights";

function Cell({ cell }: { cell: MatrixCell | undefined }) {
  const label = cellLabel(cell);
  return (
    <span className={cn(cell?.recommended ? "font-medium text-foreground" : "text-muted-foreground")}>
      {label === "—" ? (
        <>
          <span aria-hidden="true">—</span>
          <span className="sr-only">No result</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}

/** You and each tracked competitor × AI platform for this question (table on wide screens, cards on small ones). */
export function CompetitorMatrix({ providers, rows }: { providers: ProviderId[]; rows: MatrixRow[] }) {
  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Position of each business by AI platform for this question</caption>
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3 text-left font-medium">
                Business
              </th>
              {providers.map((p) => (
                <th key={p} scope="col" className="px-3 py-2 text-left font-medium">
                  {PROVIDER_META[p].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((row) => (
              <tr key={row.key} className={cn("border-b border-border last:border-0", row.isYou && "bg-primary-soft/50")}>
                <th scope="row" className={cn("py-2.5 pr-3 text-left font-normal", row.isYou && "font-semibold")}>
                  {row.name}
                  {row.isYou && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
                </th>
                {providers.map((p) => (
                  <td key={p} className="px-3 py-2.5">
                    <Cell cell={row.cells[p]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 sm:hidden" aria-label="Position of each business by AI platform">
        {rows.map((row) => (
          <li key={row.key} className={cn("rounded-lg border border-border p-3", row.isYou && "bg-primary-soft/50")}>
            <p className={cn("text-sm", row.isYou && "font-semibold")}>
              {row.name}
              {row.isYou && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
            </p>
            <dl className="mt-2 grid grid-cols-1 gap-1 text-[13px] tabular">
              {providers.map((p) => (
                <div key={p} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{providerName(p)}</dt>
                  <dd>
                    <Cell cell={row.cells[p]} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Businesses the AI recommended that you don't track as competitors. */
export function OtherBusinessesList({ items }: { items: OtherBusinessSummary[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No other businesses were recommended in these answers.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.slice(0, 12).map((b) => (
        <li key={b.name} className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm font-medium break-words">{b.name}</span>
          <span className="text-xs text-muted-foreground tabular">
            {b.appearances.map((a) => `${providerName(a.provider)}${a.position ? ` #${a.position}` : ""}`).join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
