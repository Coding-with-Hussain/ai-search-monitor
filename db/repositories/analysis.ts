import { and, desc, eq, gte, inArray } from "drizzle-orm";

import { type ResultSignals, scoreResult } from "@/services/scoring";
import { PROVIDER_IDS, type ProviderId } from "@/types/domain";

import { db } from "../index";
import { aiAnalysis, aiRuns, type AiAnalysisRow, type AiRun, scans } from "../schema";
import type { AuthorizedProject } from "./projects";

/**
 * Read models over `ai_runs` + `ai_analysis` for the Questions area. Every
 * query is scoped by `project.id` (an AuthorizedProject), so a browser-supplied
 * scan or query id can never read another project's answers.
 */

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/** Outcome of one (question × AI platform) check, as shown in lists. */
export type ResultState = "recommended" | "mentioned" | "not_mentioned" | "failed" | "unavailable" | "pending" | "not_analyzed";

export interface ProviderResult {
  state: ResultState;
  position: number | null;
}

export type ProviderResults = Partial<Record<ProviderId, ProviderResult>>;

function resultState(
  runStatus: AiRun["status"],
  analysis: { mentioned: boolean | null; recommended: boolean | null } | null,
): ResultState {
  if (runStatus === "failed") return "failed";
  if (runStatus === "unavailable") return "unavailable";
  if (runStatus === "pending" || runStatus === "running") return "pending";
  if (!analysis || analysis.mentioned === null) return "not_analyzed";
  if (analysis.recommended) return "recommended";
  return analysis.mentioned ? "mentioned" : "not_mentioned";
}

/**
 * Results of one scan for a page of questions, in ONE query.
 * Returns queryId -> provider -> state/position.
 */
export async function getScanResultsForQueries(
  project: AuthorizedProject,
  scanId: string | null | undefined,
  queryIds: string[],
): Promise<Map<string, ProviderResults>> {
  const out = new Map<string, ProviderResults>();
  if (!scanId || queryIds.length === 0) return out;

  const rows = await db()
    .select({
      queryId: aiRuns.queryId,
      provider: aiRuns.provider,
      status: aiRuns.status,
      mentioned: aiAnalysis.mentioned,
      recommended: aiAnalysis.recommended,
      position: aiAnalysis.position,
    })
    .from(aiRuns)
    .leftJoin(aiAnalysis, and(eq(aiAnalysis.aiRunId, aiRuns.id), eq(aiAnalysis.projectId, project.id)))
    .where(and(eq(aiRuns.projectId, project.id), eq(aiRuns.scanId, scanId), inArray(aiRuns.queryId, queryIds)));

  for (const row of rows) {
    if (!row.queryId || !isProviderId(row.provider)) continue;
    const state = resultState(row.status, row.mentioned === null ? null : { mentioned: row.mentioned, recommended: row.recommended });
    const results = out.get(row.queryId) ?? {};
    results[row.provider] = { state, position: state === "recommended" ? row.position : null };
    out.set(row.queryId, results);
  }
  return out;
}

export interface RunAnalysis {
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
  sentiment: AiAnalysisRow["sentiment"];
  citation: boolean;
  confidence: number;
  evidence: string | null;
  explanation: string | null;
  competitors: AiAnalysisRow["competitors"];
  otherBusinesses: AiAnalysisRow["otherBusinesses"];
  analyzer: AiAnalysisRow["analyzer"];
  analyzerModel: string | null;
}

/** One AI answer for a question in a scan, with its analysis (if any). */
export interface QueryRunDetail {
  runId: string;
  provider: ProviderId;
  model: string | null;
  status: AiRun["status"];
  isMock: boolean;
  responseText: string | null;
  citations: AiRun["citations"];
  error: string | null;
  completedAt: Date | null;
  analysis: RunAnalysis | null;
}

/** Every provider's answer + analysis for one question in one scan (project-scoped). */
export async function getQueryRunsForScan(project: AuthorizedProject, scanId: string, queryId: string): Promise<QueryRunDetail[]> {
  const rows = await db()
    .select({
      runId: aiRuns.id,
      provider: aiRuns.provider,
      model: aiRuns.model,
      status: aiRuns.status,
      isMock: aiRuns.isMock,
      responseText: aiRuns.responseText,
      citations: aiRuns.citations,
      error: aiRuns.error,
      completedAt: aiRuns.completedAt,
      analysisId: aiAnalysis.id,
      mentioned: aiAnalysis.mentioned,
      recommended: aiAnalysis.recommended,
      position: aiAnalysis.position,
      sentiment: aiAnalysis.sentiment,
      citation: aiAnalysis.citation,
      confidence: aiAnalysis.confidence,
      evidence: aiAnalysis.evidence,
      explanation: aiAnalysis.explanation,
      competitors: aiAnalysis.competitors,
      otherBusinesses: aiAnalysis.otherBusinesses,
      analyzer: aiAnalysis.analyzer,
      analyzerModel: aiAnalysis.analyzerModel,
    })
    .from(aiRuns)
    .leftJoin(aiAnalysis, and(eq(aiAnalysis.aiRunId, aiRuns.id), eq(aiAnalysis.projectId, project.id)))
    .where(and(eq(aiRuns.projectId, project.id), eq(aiRuns.scanId, scanId), eq(aiRuns.queryId, queryId)));

  const details: QueryRunDetail[] = [];
  for (const r of rows) {
    if (!isProviderId(r.provider)) continue;
    details.push({
      runId: r.runId,
      provider: r.provider,
      model: r.model,
      status: r.status,
      isMock: r.isMock,
      responseText: r.responseText,
      citations: Array.isArray(r.citations) ? r.citations : [],
      error: r.error,
      completedAt: r.completedAt,
      analysis:
        r.analysisId && r.mentioned !== null && r.recommended !== null
          ? {
              mentioned: r.mentioned,
              recommended: r.recommended,
              position: r.position,
              sentiment: r.sentiment,
              citation: r.citation ?? false,
              confidence: Number(r.confidence ?? 0),
              evidence: r.evidence,
              explanation: r.explanation,
              competitors: Array.isArray(r.competitors) ? r.competitors : [],
              otherBusinesses: Array.isArray(r.otherBusinesses) ? r.otherBusinesses : [],
              analyzer: r.analyzer ?? "heuristic",
              analyzerModel: r.analyzerModel,
            }
          : null,
    });
  }
  return details.sort((a, b) => PROVIDER_IDS.indexOf(a.provider) - PROVIDER_IDS.indexOf(b.provider));
}

/** One completed scan's outcome for a single question. */
export interface QueryHistoryEntry {
  scanId: string;
  mode: "live" | "mock";
  date: Date;
  /** Mean result score across analyzed platforms (null when nothing was analyzed). */
  score: number | null;
  analyzed: number;
  runs: number;
  mentionedIn: number;
  recommendedIn: number;
  bestPosition: number | null;
  providers: Partial<Record<ProviderId, ProviderResult & { score: number | null }>>;
}

/**
 * Recent completed scans that included this question, newest first, with the
 * question's per-platform outcome in each (two small project-scoped queries).
 * `since` limits results to the plan's visible history window.
 */
export async function getQueryScanHistory(
  project: AuthorizedProject,
  queryId: string,
  opts: { limit?: number; since?: Date | null } = {},
): Promise<QueryHistoryEntry[]> {
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 50);
  const scanConds = [eq(scans.projectId, project.id), eq(scans.status, "completed")];
  if (opts.since) scanConds.push(gte(scans.createdAt, opts.since));
  const scanRows = await db()
    .selectDistinct({ id: scans.id, mode: scans.mode, createdAt: scans.createdAt, completedAt: scans.completedAt })
    .from(scans)
    .innerJoin(aiRuns, and(eq(aiRuns.scanId, scans.id), eq(aiRuns.projectId, project.id), eq(aiRuns.queryId, queryId)))
    .where(and(...scanConds))
    .orderBy(desc(scans.createdAt))
    .limit(limit);
  if (scanRows.length === 0) return [];

  const rows = await db()
    .select({
      scanId: aiRuns.scanId,
      provider: aiRuns.provider,
      status: aiRuns.status,
      analysisId: aiAnalysis.id,
      mentioned: aiAnalysis.mentioned,
      recommended: aiAnalysis.recommended,
      position: aiAnalysis.position,
      sentiment: aiAnalysis.sentiment,
      citation: aiAnalysis.citation,
    })
    .from(aiRuns)
    .leftJoin(aiAnalysis, and(eq(aiAnalysis.aiRunId, aiRuns.id), eq(aiAnalysis.projectId, project.id)))
    .where(
      and(
        eq(aiRuns.projectId, project.id),
        eq(aiRuns.queryId, queryId),
        inArray(
          aiRuns.scanId,
          scanRows.map((s) => s.id),
        ),
      ),
    );

  const byScan = new Map<string, typeof rows>();
  for (const row of rows) byScan.set(row.scanId, [...(byScan.get(row.scanId) ?? []), row]);

  return scanRows.map((scan) => {
    const scanRuns = byScan.get(scan.id) ?? [];
    const providers: QueryHistoryEntry["providers"] = {};
    const scores: number[] = [];
    const positions: number[] = [];
    let mentionedIn = 0;
    let recommendedIn = 0;
    for (const r of scanRuns) {
      if (!isProviderId(r.provider)) continue;
      const analyzed = r.status === "completed" && r.analysisId !== null && r.mentioned !== null;
      const state = resultState(r.status, analyzed ? { mentioned: r.mentioned, recommended: r.recommended } : null);
      let score: number | null = null;
      if (analyzed) {
        const signals: ResultSignals = {
          mentioned: Boolean(r.mentioned),
          recommended: Boolean(r.recommended),
          position: r.position,
          sentiment: r.sentiment,
          citation: Boolean(r.citation),
        };
        score = scoreResult(signals);
        scores.push(score);
        if (signals.mentioned) mentionedIn++;
        if (signals.recommended) {
          recommendedIn++;
          if (r.position) positions.push(r.position);
        }
      }
      providers[r.provider] = { state, position: state === "recommended" ? r.position : null, score };
    }
    return {
      scanId: scan.id,
      mode: scan.mode,
      date: scan.completedAt ?? scan.createdAt,
      score: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      analyzed: scores.length,
      runs: scanRuns.length,
      mentionedIn,
      recommendedIn,
      bestPosition: positions.length ? Math.min(...positions) : null,
      providers,
    };
  });
}

const scanRefColumns = {
  id: scans.id,
  status: scans.status,
  mode: scans.mode,
  providers: scans.providers,
  createdAt: scans.createdAt,
  completedAt: scans.completedAt,
};

export type ScanRef = { id: string; status: string; mode: "live" | "mock"; providers: string[]; createdAt: Date; completedAt: Date | null };

/**
 * Latest completed scan without its metrics snapshot (cheap: for list pages
 * that only need the scan id, platforms and date).
 */
export async function getLatestCompletedScanRef(project: AuthorizedProject): Promise<ScanRef | null> {
  if (project.latestScanId) {
    const rows = await db()
      .select(scanRefColumns)
      .from(scans)
      .where(and(eq(scans.id, project.latestScanId), eq(scans.projectId, project.id), eq(scans.status, "completed")))
      .limit(1);
    if (rows[0]) return rows[0];
  }
  const rows = await db()
    .select(scanRefColumns)
    .from(scans)
    .where(and(eq(scans.projectId, project.id), eq(scans.status, "completed")))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** A scan of this project by id (any status), or null — never another project's scan. */
export async function findScanRef(project: AuthorizedProject, scanId: string): Promise<ScanRef | null> {
  const rows = await db()
    .select(scanRefColumns)
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.projectId, project.id)))
    .limit(1);
  return rows[0] ?? null;
}
