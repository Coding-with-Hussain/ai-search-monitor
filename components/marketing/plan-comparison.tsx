import { Check, Minus } from "lucide-react";
import type * as React from "react";

import { PLAN_IDS, PLANS, type Plan } from "@/lib/billing/plans";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { annualDiscountPercent, competitorsLabel, FREQUENCY_LABELS, historyLabel } from "./plan-copy";

/**
 * Full plan comparison generated from the plan catalogue (lib/billing/plans.ts).
 * A table on wider screens; one card per plan on phones.
 */

type CellValue = string | boolean;

interface Row {
  label: string;
  hint?: string;
  value: (plan: Plan) => CellValue;
}

const SEATS_NOTE = "Inviting team members is coming soon. Seat counts apply once it launches.";

const GROUPS: Array<{ title: string; rows: Row[] }> = [
  {
    title: "Usage",
    rows: [
      { label: "Projects", hint: "Businesses or brands you monitor", value: (p) => formatNumber(p.limits.projects) },
      { label: "Queries per month", hint: "1 question checked in 1 scan", value: (p) => formatNumber(p.limits.queriesPerMonth) },
      { label: "Competitors per project", value: (p) => competitorsLabel(p) },
      {
        label: "Monitoring frequency",
        value: (p) =>
          p.limits.monitoringFrequencies.map((f, i) => (i === 0 ? FREQUENCY_LABELS[f] : FREQUENCY_LABELS[f].toLowerCase())).join(", "),
      },
      { label: "Scan history", value: (p) => historyLabel(p) },
      { label: "Team seats", hint: "Coming soon", value: (p) => formatNumber(p.limits.seats) },
    ],
  },
  {
    title: "Monitoring and insights",
    rows: [
      { label: "AI Visibility Score", value: () => true },
      { label: "ChatGPT, Gemini and Perplexity", value: () => true },
      { label: "Buyer-question generator", value: () => true },
      { label: "Competitor comparison and share of voice", value: () => true },
      { label: "Citation and source analysis", value: () => true },
      { label: "Recommendations", value: () => true },
      { label: "Advanced recommendations", value: (p) => p.features.advancedRecommendations },
      { label: "Historical trend tracking", value: (p) => p.features.historicalTracking },
      { label: "Drop and competitor alerts", value: () => true },
    ],
  },
  {
    title: "Reporting",
    rows: [
      { label: "Weekly email reports", value: (p) => p.features.emailReports },
      { label: "PDF reports", value: (p) => p.features.pdfReports },
      { label: "White-label reports", value: (p) => p.features.whiteLabelReports },
    ],
  },
];

function Cell({ value, className }: { value: CellValue; className?: string }) {
  if (value === true) {
    return (
      <span className={cn("inline-flex", className)}>
        <Check className="size-4 text-primary" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className={cn("inline-flex", className)}>
        <Minus className="size-4 text-subtle-foreground" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className={cn("text-sm text-foreground tabular", className)}>{value}</span>;
}

export function PlanComparison() {
  const plans = PLAN_IDS.map((id) => PLANS[id]);
  return (
    <div>
      {/* Wide screens: one table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-card md:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Plan comparison: limits and features of each plan</caption>
          <colgroup>
            <col className="w-[30%]" />
            {plans.map((p) => (
              <col key={p.id} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              <td className="px-5 py-4" />
              {plans.map((p) => (
                <th key={p.id} scope="col" className="px-4 py-4 text-left align-bottom">
                  <span className="block text-[15px] font-semibold text-foreground">{p.name}</span>
                  <span className="mt-0.5 block text-[13px] font-normal text-muted-foreground tabular">
                    ${p.monthlyPrice}/month
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((group) => (
            <tbody key={group.title} className="border-b border-border last:border-0">
              <tr className="bg-surface-muted/60">
                <th scope="colgroup" colSpan={plans.length + 1} className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  {group.title}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th scope="row" className="px-5 py-3 text-left align-top font-normal">
                    <span className="block text-foreground">{row.label}</span>
                    {row.hint && <span className="mt-0.5 block text-xs text-subtle-foreground">{row.hint}</span>}
                  </th>
                  {plans.map((p) => (
                    <td key={p.id} className="px-4 py-3 align-top">
                      <Cell value={row.value(p)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Phones: one card per plan */}
      <div className="space-y-4 md:hidden">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
        Prices in USD per month with monthly billing; annual billing saves {annualDiscountPercent}%. {SEATS_NOTE}
      </p>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <section aria-labelledby={`compare-${plan.id}`} className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`compare-${plan.id}`} className="text-base font-semibold text-foreground">
          {plan.name}
        </h3>
        <span className="text-sm text-muted-foreground tabular">${plan.monthlyPrice}/month</span>
      </div>
      {GROUPS.map((group) => (
        <div key={group.title} className="mt-4">
          <h4 className="text-xs font-semibold text-muted-foreground">{group.title}</h4>
          <dl className="mt-2 divide-y divide-border">
            {group.rows.map((row) => (
              <Item key={row.label} label={row.label} hint={row.hint}>
                <Cell value={row.value(plan)} className="justify-end text-right" />
              </Item>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}

function Item({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-[13px] text-muted-foreground">
        {label}
        {hint && <span className="block text-[11px] text-subtle-foreground">{hint}</span>}
      </dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}
