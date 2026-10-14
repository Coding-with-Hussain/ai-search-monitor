import { ArrowRight, CalendarRange, FileText, Printer, Radar, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type * as React from "react";

import { EmptyState } from "@/components/app/empty-state";
import { Pager, parsePage } from "@/components/history/pager";
import { RetryButton } from "@/components/history/retry-button";
import { SectionHeader } from "@/components/history/section-header";
import { UpgradeLink } from "@/components/history/upgrade-link";
import { GenerateReportButton } from "@/components/reports/generate-report-button";
import { formatMediumDate } from "@/components/reports/labels";
import { ReportList, type ReportListRow } from "@/components/reports/report-list";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProfile } from "@/db/repositories/profiles";
import { getProjectForUser } from "@/db/repositories/projects";
import { listReports, REPORT_PAGE_SIZE } from "@/db/repositories/reports";
import { getLatestCompletedScan } from "@/db/repositories/scans";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { isAppError } from "@/lib/errors";
import { pluralize } from "@/lib/format";
import { logger } from "@/lib/logger";
import { REPORT_PERIOD_DAYS } from "@/services/reports/build";

export const metadata: Metadata = { title: "Reports" };

const NO_SCAN_REASON = "Run a scan first. Reports summarize your latest completed AI scan.";

function firstPlanWith(feature: "pdfReports" | "whiteLabelReports") {
  return PLAN_IDS.map((id) => PLANS[id]).find((p) => p.features[feature]) ?? null;
}

function Feature({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectForUser(user.id, projectId).catch((error) => {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const page = parsePage((await searchParams).page);
  const basePath = `/projects/${project.id}/reports`;

  const header = (actions?: React.ReactNode) => (
    <SectionHeader
      title="Reports"
      description="Point-in-time summaries of your AI search visibility to share with your team or clients: score, AI platforms, competitors, wins, problems and recommended actions."
      meta={project.isDemo ? <Badge variant="demo">Demo data</Badge> : undefined}
      actions={actions}
    />
  );

  let data;
  try {
    const [pageRows, latest, ent, profile] = await Promise.all([
      listReports(project, { limit: REPORT_PAGE_SIZE + 1, offset: (page - 1) * REPORT_PAGE_SIZE }),
      getLatestCompletedScan(project),
      getEntitlements(user.id),
      getProfile(user.id),
    ]);
    data = { pageRows, latest, ent, company: profile?.company?.trim() || null };
  } catch (error) {
    logger.error("reports.load_failed", { projectId: project.id, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header()}
        <Alert variant="danger" title="We couldn't load your reports" action={<RetryButton />}>
          Something went wrong while loading this page. Please try again.
        </Alert>
      </div>
    );
  }

  const { pageRows, latest, ent, company } = data;
  const hasNext = pageRows.length > REPORT_PAGE_SIZE;
  const rows: ReportListRow[] = pageRows.slice(0, REPORT_PAGE_SIZE).map((r) => ({
    id: r.id,
    title: r.title,
    periodStart: r.periodStart?.toISOString() ?? null,
    periodEnd: r.periodEnd?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    score: r.score,
    isSimulation: r.isSimulation,
  }));
  const disabledReason = !ent.active ? (ent.inactiveReason ?? "Your subscription is not active.") : !latest ? NO_SCAN_REASON : null;
  const periodDays = ent.plan.limits.historyDays === null ? REPORT_PERIOD_DAYS : Math.min(REPORT_PERIOD_DAYS, ent.plan.limits.historyDays);
  const pdfPlan = firstPlanWith("pdfReports");
  const whiteLabelPlan = firstPlanWith("whiteLabelReports");
  const isFirstPageEmpty = rows.length === 0 && page === 1;

  const features = (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">What a report includes</h3>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        <Feature icon={Radar} title="Latest results">
          Score, AI platforms, competitors and share of voice from your latest completed scan
          {latest ? ` (${formatMediumDate(latest.completedAt ?? latest.createdAt)})` : ""}.
        </Feature>
        <Feature icon={CalendarRange} title="Trend and next steps">
          Score history for the last {pluralize(periodDays, "day")}, top wins and problems, and your recommended actions.
        </Feature>
        {ent.plan.features.pdfReports ? (
          <Feature icon={Printer} title="Print or save as PDF">
            Open any report and use Print / Save as PDF for a clean, print-ready copy.
          </Feature>
        ) : (
          <Feature icon={Printer} title="PDF export">
            PDF export is available on {pdfPlan?.name ?? "higher plans"}. Reports remain viewable online on your{" "}
            {ent.plan.name} plan.{" "}
            <UpgradeLink source="reports_pdf" variant="link" size="sm" className="h-auto px-0 text-[13px]">
              Upgrade
            </UpgradeLink>
          </Feature>
        )}
      </ul>
      {ent.plan.features.whiteLabelReports && (
        <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-[13px] text-muted-foreground">
          <Tag className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {company ? (
            <span>
              New reports are white-labeled: they show “Prepared by {company}” instead of our branding.
            </span>
          ) : (
            <span>
              Your {ent.plan.name} plan includes white-label reports. Add your company name in{" "}
              <Link href="/settings" className="font-medium text-primary hover:underline">
                Settings
              </Link>{" "}
              to show “Prepared by” your brand on new reports.
            </span>
          )}
        </p>
      )}
      {!ent.plan.features.whiteLabelReports && whiteLabelPlan && (
        <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-[13px] text-muted-foreground">
          <Tag className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>White-label reports with your own brand name are available on the {whiteLabelPlan.name} plan.</span>
        </p>
      )}
    </Card>
  );

  if (isFirstPageEmpty) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {header()}
        {latest ? (
          <EmptyState
            icon={FileText}
            title="Generate your first report"
            description="Create a shareable summary of your latest AI scan. Each report is saved here, so you can compare how your AI search visibility changes over time."
            action={<GenerateReportButton projectId={project.id} disabledReason={disabledReason} align="center" />}
          />
        ) : (
          <EmptyState
            icon={Radar}
            title="No reports yet"
            description="Run your first AI scan with the Run scan button above. Once it completes, you can generate a report that summarizes it."
          />
        )}
        {features}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {header(<GenerateReportButton projectId={project.id} disabledReason={disabledReason} />)}

      <Card className="overflow-hidden">
        <section aria-labelledby="reports-heading">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
            <h3 id="reports-heading" className="text-[15px] font-semibold tracking-tight">
              Generated reports
            </h3>
            <p className="text-xs text-muted-foreground">Newest first</p>
          </div>
          {rows.length > 0 ? (
            <ReportList projectId={project.id} rows={rows} />
          ) : (
            <div className="p-4 sm:p-5">
              <EmptyState
                icon={FileText}
                className="py-10"
                title="No reports on this page"
                description="This page is past the end of your reports."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href={basePath}>
                      Go to the newest reports
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
            </div>
          )}
          <Pager
            label="Reports pagination"
            page={page}
            hasNext={hasNext}
            hrefFor={(p) => (p > 1 ? `${basePath}?page=${p}` : basePath)}
          />
        </section>
      </Card>

      {features}
    </div>
  );
}
