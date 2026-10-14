"use client";

import { Lock, Printer } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { trackClient } from "@/lib/analytics/client";

/**
 * "Print / Save as PDF" (the browser's print dialog saves the print-styled
 * report as a PDF). Plans without PDF reports see it disabled with the plan
 * that includes it and an upgrade link; the HTML report stays viewable.
 */
export function PrintReportButton({ enabled, pdfPlanName }: { enabled: boolean; pdfPlanName: string | null }) {
  const noteId = useId();

  if (enabled) {
    return (
      <Button onClick={() => window.print()}>
        <Printer aria-hidden="true" />
        Print / Save as PDF
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <Button disabled aria-describedby={noteId}>
        <Lock aria-hidden="true" />
        Print / Save as PDF
      </Button>
      <p id={noteId} className="text-xs text-muted-foreground sm:text-right">
        PDF export is available on {pdfPlanName ?? "higher plans"}.{" "}
        <Link
          href="/billing#plans"
          className="font-medium text-primary hover:underline"
          onClick={() => trackClient("upgrade_clicked", { source: "report_pdf" })}
        >
          Upgrade
        </Link>
      </p>
    </div>
  );
}
