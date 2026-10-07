/**
 * Drizzle table definitions mirroring `supabase/migrations/*.sql`.
 *
 * The SQL migrations are the source of truth for the database (constraints,
 * RLS, triggers). This file gives the server typed access to the same tables.
 * When you add a migration, update the matching table here.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  AnalysisCompetitorResult,
  Citation,
  OtherBusiness,
  QueryCategory,
  RecommendationCategory,
  ScanMetrics,
} from "@/types/domain";
import type { FreeCheckResult } from "@/types/free-check";
import type { ReportSnapshot } from "@/types/report";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

const ts = (name: string) => timestamp(name, { withTimezone: true });

/** numeric columns are returned as strings by postgres.js; map to numbers. */
const num = (name: string, precision: number, scale: number) =>
  numeric(name, { precision, scale, mode: "number" });

export type NotificationPreferences = {
  weeklyReport: boolean;
  scanCompleted: boolean;
  scoreChanges: boolean;
  visibilityDrops: boolean;
  competitorOvertakes: boolean;
};

export type MonitoringDefaults = {
  frequency: "daily" | "weekly" | "monthly" | "manual";
  queryCount: number;
  providers: string[];
};

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  company: text("company"),
  isAdmin: boolean("is_admin").notNull().default(false),
  onboardingCompletedAt: ts("onboarding_completed_at"),
  tourCompletedAt: ts("tour_completed_at"),
  notificationPreferences: jsonb("notification_preferences")
    .$type<NotificationPreferences>()
    .notNull(),
  monitoringDefaults: jsonb("monitoring_defaults").$type<MonitoringDefaults>().notNull(),
  ...timestamps,
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull(),
  ...timestamps,
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text("role").$type<"owner" | "admin" | "member">().notNull().default("member"),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  plan: text("plan").$type<"starter" | "growth" | "pro" | "agency">().notNull().default("starter"),
  status: text("status")
    .$type<
      | "trialing"
      | "active"
      | "past_due"
      | "canceled"
      | "incomplete"
      | "incomplete_expired"
      | "unpaid"
      | "paused"
    >()
    .notNull()
    .default("trialing"),
  billingInterval: text("billing_interval").$type<"month" | "year">(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  currentPeriodStart: ts("current_period_start"),
  currentPeriodEnd: ts("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  trialEndsAt: ts("trial_ends_at"),
  ...timestamps,
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  website: text("website"),
  domain: text("domain"),
  industry: text("industry").notNull(),
  businessType: text("business_type")
    .$type<"local" | "saas" | "ecommerce" | "services">()
    .notNull()
    .default("local"),
  country: text("country"),
  city: text("city"),
  description: text("description"),
  services: text("services").array().notNull().default(sql`'{}'`),
  aliases: text("aliases").array().notNull().default(sql`'{}'`),
  providers: text("providers").array().notNull(),
  monitoringFrequency: text("monitoring_frequency")
    .$type<"daily" | "weekly" | "monthly" | "manual">()
    .notNull()
    .default("weekly"),
  monitoringEnabled: boolean("monitoring_enabled").notNull().default(true),
  lastScanAt: ts("last_scan_at"),
  nextScanAt: ts("next_scan_at"),
  latestScanId: uuid("latest_scan_id"),
  latestScore: num("latest_score", 5, 2),
  previousScore: num("previous_score", 5, 2),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const competitors = pgTable("competitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  website: text("website"),
  domain: text("domain"),
  aliases: text("aliases").array().notNull().default(sql`'{}'`),
  ...timestamps,
});

export const queries = pgTable("queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  text: text("text").notNull(),
  normalizedText: text("normalized_text").notNull(),
  category: text("category").$type<QueryCategory>().notNull(),
  priority: text("priority").$type<"high" | "medium" | "low">().notNull().default("medium"),
  status: text("status").$type<"active" | "paused">().notNull().default("active"),
  source: text("source").$type<"generated" | "manual">().notNull().default("generated"),
  service: text("service"),
  ...timestamps,
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  userId: uuid("user_id"),
  status: text("status")
    .$type<"queued" | "running" | "completed" | "failed" | "cancelled">()
    .notNull()
    .default("queued"),
  trigger: text("trigger")
    .$type<"manual" | "scheduled" | "onboarding" | "demo" | "seed">()
    .notNull()
    .default("manual"),
  mode: text("mode").$type<"live" | "mock">().notNull().default("mock"),
  providers: text("providers").array().notNull().default(sql`'{}'`),
  queryCount: integer("query_count").notNull().default(0),
  totalItems: integer("total_items").notNull().default(0),
  completedItems: integer("completed_items").notNull().default(0),
  failedItems: integer("failed_items").notNull().default(0),
  currentProvider: text("current_provider"),
  currentQuery: text("current_query"),
  score: num("score", 5, 2),
  metrics: jsonb("metrics").$type<ScanMetrics>(),
  notes: text("notes").array().notNull().default(sql`'{}'`),
  /** Pipeline options captured at creation (e.g. simulation strength for demo history). */
  config: jsonb("config").$type<{ mockStrength?: number }>().notNull().default({}),
  error: text("error"),
  startedAt: ts("started_at"),
  heartbeatAt: ts("heartbeat_at"),
  finalizingAt: ts("finalizing_at"),
  completedAt: ts("completed_at"),
  ...timestamps,
});

export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id").notNull(),
  projectId: uuid("project_id").notNull(),
  queryId: uuid("query_id"),
  provider: text("provider").notNull(),
  model: text("model"),
  status: text("status")
    .$type<"pending" | "running" | "completed" | "failed" | "unavailable">()
    .notNull()
    .default("pending"),
  queryText: text("query_text").notNull(),
  responseText: text("response_text"),
  citations: jsonb("citations").$type<Citation[]>().notNull().default([]),
  rawResponse: jsonb("raw_response"),
  isMock: boolean("is_mock").notNull().default(false),
  latencyMs: integer("latency_ms"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  estimatedCostUsd: num("estimated_cost_usd", 12, 6).notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  startedAt: ts("started_at"),
  completedAt: ts("completed_at"),
  ...timestamps,
});

export const aiAnalysis = pgTable("ai_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiRunId: uuid("ai_run_id").notNull().unique(),
  scanId: uuid("scan_id").notNull(),
  projectId: uuid("project_id").notNull(),
  queryId: uuid("query_id"),
  provider: text("provider").notNull(),
  mentioned: boolean("mentioned").notNull(),
  recommended: boolean("recommended").notNull(),
  position: integer("position"),
  sentiment: text("sentiment").$type<"positive" | "neutral" | "negative">(),
  citation: boolean("citation").notNull().default(false),
  confidence: num("confidence", 4, 3).notNull().default(0),
  evidence: text("evidence"),
  explanation: text("explanation"),
  competitors: jsonb("competitors").$type<AnalysisCompetitorResult[]>().notNull().default([]),
  otherBusinesses: jsonb("other_businesses").$type<OtherBusiness[]>().notNull().default([]),
  analyzer: text("analyzer").$type<"heuristic" | "llm">().notNull().default("heuristic"),
  analyzerModel: text("analyzer_model"),
  score: num("score", 5, 2).notNull().default(0),
  ...timestamps,
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiRunId: uuid("ai_run_id").notNull(),
  scanId: uuid("scan_id").notNull(),
  projectId: uuid("project_id").notNull(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  title: text("title"),
  isOwnDomain: boolean("is_own_domain").notNull().default(false),
  competitorId: uuid("competitor_id"),
  ...timestamps,
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  scanId: uuid("scan_id"),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  action: text("action").notNull(),
  category: text("category").$type<RecommendationCategory>().notNull(),
  priority: text("priority").$type<"high" | "medium" | "low">().notNull(),
  impact: text("impact").$type<"low" | "medium" | "high">().notNull(),
  difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().notNull(),
  status: text("status").$type<"open" | "completed" | "dismissed">().notNull().default("open"),
  source: text("source").$type<"rules" | "ai">().notNull().default("rules"),
  completedAt: ts("completed_at"),
  dismissedAt: ts("dismissed_at"),
  ...timestamps,
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  scanId: uuid("scan_id"),
  userId: uuid("user_id"),
  title: text("title").notNull(),
  periodStart: ts("period_start"),
  periodEnd: ts("period_end"),
  snapshot: jsonb("snapshot").$type<ReportSnapshot>().notNull(),
  ...timestamps,
});

export const usageRecords = pgTable("usage_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id"),
  scanId: uuid("scan_id"),
  kind: text("kind")
    .$type<"query_run" | "provider_call" | "report_generated" | "query_generation" | "analysis_call">()
    .notNull(),
  quantity: integer("quantity").notNull().default(1),
  estimatedCostUsd: num("estimated_cost_usd", 12, 6).notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id"),
  type: text("type").notNull(),
  severity: text("severity").$type<"info" | "success" | "warning" | "critical">().notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  readAt: ts("read_at"),
  ...timestamps,
});

export const freeChecks = pgTable("free_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipHash: text("ip_hash").notNull(),
  businessName: text("business_name").notNull(),
  website: text("website"),
  industry: text("industry").notNull(),
  location: text("location"),
  mode: text("mode").$type<"live" | "mock">().notNull(),
  result: jsonb("result").$type<FreeCheckResult>().notNull(),
  estimatedCostUsd: num("estimated_cost_usd", 12, 6).notNull().default(0),
  ...timestamps,
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: ts("reset_at").notNull(),
});

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: ts("processed_at").notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type Query = typeof queries.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
export type AiAnalysisRow = typeof aiAnalysis.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
