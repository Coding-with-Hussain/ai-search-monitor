/** Product analytics event names (shared by server and client). */
export type AnalyticsEvent =
  | "signup_completed"
  | "project_created"
  | "onboarding_completed"
  | "query_generated"
  | "scan_started"
  | "scan_completed"
  | "recommendation_viewed"
  | "upgrade_clicked"
  | "subscription_started"
  | "free_check_completed"
  | "report_generated";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;
