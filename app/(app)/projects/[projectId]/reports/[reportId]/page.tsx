import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { RetryButton } from "@/components/history/retry-button";
import { DeleteReportButton } from "@/components/reports/delete-report-button";
import { PrintLightMode } from "@/components/reports/print-light-mode";
import { PrintReportButton } from "@/components/reports/print-report-button";
import { ReportDocument } from "@/components/reports/report-document";
import { ReportPrintStyles } from "@/components/reports/report-print-styles";
import { Alert } from "@/components/ui/alert";
import { getProjectForUser } from "@/db/repositories/projects";
import { getReport } from "@/db/repositories/reports";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isReportSnapshot } from "@/services/reports/validate";

type Params = Promise<{ projectId: string; reportId: string }>;

/** One lookup per request, shared by generateMetadata and the page. */
const loadReport = cache(async (userId: string, projectId: string, reportId: string) => {
  const project = await getProjectForUser(userId, projectId);
  const report = await getReport(project, reportId);
  return { project, report };
});

function isNotFound(error: unknown) {
  return isAppError(error) && error.code === "NOT_FOUND";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId, reportId } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Report" };
  try {
    const { project, report } = await loadReport(user.id, projectId, reportId);
    const title = `${project.name} · ${report.title}`;
    // White-label reports carry no product name (it also names the saved PDF).
    return isReportSnapshot(report.snapshot) && report.snapshot.whiteLabel ? { title: { absolute: title } } : { title };
  } catch {
    return { title: "Report" };
  }
}

export default async function ReportPage({ params }: { params: Params }) {
  const user = await requireUser();
  const { projectId, reportId } = await params;
  const listPath = `/projects/${projectId}/reports`;

  const backLink = (
    <Link
      href={listPath}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      All reports
    </Link>
  );

  let loaded;
  try {
    const [{ project, report }, ent] = await Promise.all([
      loadReport(user.id, projectId, reportId),
      getEntitlements(user.id),
    ]);
    loaded = { project, report, ent };
  } catch (error) {
    if (isNotFound(error)) notFound();
    logger.error("reports.view_failed", { projectId, reportId, error: (error as Error).message });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {backLink}
        <Alert variant="danger" title="We couldn't load this report" action={<RetryButton />}>
          Something went wrong while loading the report. Please try again.
        </Alert>
      </div>
    );
  }

  const { project, report, ent } = loaded;
  const snapshot = report.snapshot;

  if (!isReportSnapshot(snapshot)) {
    logger.warn("reports.invalid_snapshot", { projectId: project.id, reportId: report.id });
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        {backLink}
        <Alert
          variant="warning"
          title="This report can’t be displayed"
          action={
            <DeleteReportButton
              projectId={project.id}
              reportId={report.id}
              reportTitle={report.title}
              redirectTo={listPath}
              variant="outline"
            />
          }
        >
          It was saved in a format this version of the app can’t read. Generate a new report to see your latest results.
        </Alert>
      </div>
    );
  }

  const pdfPlan = PLAN_IDS.map((id) => PLANS[id]).find((p) => p.features.pdfReports) ?? null;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PrintLightMode />
      <ReportPrintStyles />
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="pt-1.5">{backLink}</div>
        <div className="flex flex-wrap items-start gap-2">
          <PrintReportButton enabled={ent.plan.features.pdfReports} pdfPlanName={pdfPlan?.name ?? null} />
          <DeleteReportButton
            projectId={project.id}
            reportId={report.id}
            reportTitle={report.title}
            redirectTo={listPath}
            variant="outline"
            size="default"
          />
        </div>
      </div>

      <ReportDocument reportId={report.id} snapshot={snapshot} isDemo={project.isDemo} />
    </div>
  );
}
