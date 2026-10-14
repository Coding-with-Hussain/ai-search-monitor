/**
 * Print isolation for the report page. While printing (Print / Save as PDF or
 * the browser menu), everything outside the report is hidden: the app sidebar
 * and top bar, the project header and tabs, the page controls and any toasts.
 * The report's ancestors also drop their screen padding and flex layout, so
 * the printout contains only the report and paginates cleanly.
 *
 * The rules are scoped with :has() to documents that contain `.report-root`,
 * so they never affect other pages, and they don't depend on how the app
 * shell is structured.
 */
const PRINT_CSS = `@media print {
  *:has(.report-root) > :not(.report-root):not(:has(.report-root)) { display: none !important; }
  *:has(.report-root) {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    min-height: 0 !important;
    height: auto !important;
    overflow: visible !important;
  }
}`;

export function ReportPrintStyles() {
  // Static CSS (no user content), injected as-is so selector combinators are not escaped.
  return <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />;
}
