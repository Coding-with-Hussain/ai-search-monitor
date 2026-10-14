import type { QueryRunDetail, RunAnalysis } from "@/db/repositories/analysis";
import { providerName } from "@/lib/providers-meta";
import type { ProviderId } from "@/types/domain";

/**
 * Pure helpers that turn one question's analyzed answers into plain-language
 * explanations and comparison tables. Everything here describes observed
 * signals in monitored answers; nothing claims causes or guarantees.
 */

type Analyzed = QueryRunDetail & { analysis: RunAnalysis };

export function analyzedRuns(runs: QueryRunDetail[]): Analyzed[] {
  return runs.filter((r): r is Analyzed => r.status === "completed" && r.analysis !== null);
}

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** User-safe description of a run that produced no analysis (never echoes raw provider errors). */
export function runIssue(run: QueryRunDetail): { label: string; detail: string } | null {
  switch (run.status) {
    case "failed": {
      const error = run.error ?? "";
      const reason = /time(d)?\s?out|abort/i.test(error)
        ? "The AI platform took too long to respond."
        : /\b429\b|rate.?limit|quota|overloaded|capacity/i.test(error)
          ? "The AI platform was busy or over its usage limit."
          : /\b40[13]\b|auth|api key|permission/i.test(error)
            ? "The AI platform rejected the request, usually because of an API key or account setting."
            : "The AI platform returned an error.";
      return { label: "Failed", detail: `${reason} This question will be checked again in your next scan.` };
    }
    case "unavailable":
      return {
        label: "Unavailable",
        detail: "This AI platform wasn't available for this scan (for example, it isn't configured yet), so it wasn't asked.",
      };
    case "pending":
    case "running":
      return { label: "In progress", detail: "This answer is still being collected. Refresh in a moment." };
    default:
      return run.analysis ? null : { label: "Not analyzed", detail: "The answer was collected, but it couldn't be analyzed." };
  }
}

// --- Competitor matrix -------------------------------------------------------------------

export interface MatrixCell {
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
}

export interface MatrixRow {
  key: string;
  name: string;
  isYou: boolean;
  cells: Partial<Record<ProviderId, MatrixCell>>;
  bestPosition: number | null;
  mentions: number;
}

export function cellLabel(cell: MatrixCell | undefined): string {
  if (!cell) return "—";
  if (cell.recommended) return cell.position ? `#${cell.position}` : "Recommended";
  if (cell.mentioned) return "Mentioned";
  return "Not mentioned";
}

/** You + each tracked competitor × provider, from the analyzed answers. */
export function competitorMatrix(businessName: string, runs: QueryRunDetail[]): { providers: ProviderId[]; rows: MatrixRow[] } {
  const analyzed = analyzedRuns(runs);
  const providers = analyzed.map((r) => r.provider);
  const you: MatrixRow = { key: "you", name: businessName, isYou: true, cells: {}, bestPosition: null, mentions: 0 };
  const competitors = new Map<string, MatrixRow>();

  for (const run of analyzed) {
    const a = run.analysis;
    you.cells[run.provider] = { mentioned: a.mentioned, recommended: a.recommended, position: a.recommended ? a.position : null };
    for (const c of a.competitors) {
      const row = competitors.get(c.competitorId) ?? {
        key: c.competitorId,
        name: c.name,
        isYou: false,
        cells: {},
        bestPosition: null,
        mentions: 0,
      };
      row.cells[run.provider] = { mentioned: c.mentioned, recommended: c.recommended, position: c.recommended ? c.position : null };
      competitors.set(c.competitorId, row);
    }
  }

  const finalize = (row: MatrixRow) => {
    const cells = Object.values(row.cells);
    const positions = cells.filter((c) => c.recommended && c.position).map((c) => c.position as number);
    row.bestPosition = positions.length ? Math.min(...positions) : null;
    row.mentions = cells.filter((c) => c.mentioned).length;
    return row;
  };

  const rows = [...competitors.values()]
    .map(finalize)
    .sort(
      (a, b) =>
        (a.bestPosition ?? Number.POSITIVE_INFINITY) - (b.bestPosition ?? Number.POSITIVE_INFINITY) ||
        b.mentions - a.mentions ||
        a.name.localeCompare(b.name),
    );
  return { providers, rows: [finalize(you), ...rows] };
}

// --- Other businesses --------------------------------------------------------------------

export interface OtherBusinessSummary {
  name: string;
  bestPosition: number | null;
  appearances: Array<{ provider: ProviderId; position: number | null }>;
}

/** Businesses recommended that are neither you nor a tracked competitor, merged across platforms. */
export function otherBusinesses(runs: QueryRunDetail[]): OtherBusinessSummary[] {
  const map = new Map<string, OtherBusinessSummary>();
  for (const run of analyzedRuns(runs)) {
    for (const b of run.analysis.otherBusinesses) {
      const name = b.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const entry = map.get(key) ?? { name, bestPosition: null, appearances: [] };
      entry.appearances.push({ provider: run.provider, position: b.position });
      if (b.position && (entry.bestPosition === null || b.position < entry.bestPosition)) entry.bestPosition = b.position;
      map.set(key, entry);
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.appearances.length - a.appearances.length ||
      (a.bestPosition ?? Number.POSITIVE_INFINITY) - (b.bestPosition ?? Number.POSITIVE_INFINITY) ||
      a.name.localeCompare(b.name),
  );
}

// --- "What this means" -------------------------------------------------------------------

export interface MeaningPoint {
  tone: "positive" | "negative" | "neutral";
  text: string;
}

export interface Meaning {
  summary: string;
  points: MeaningPoint[];
  /** True when at least one platform did not recommend you (suggest next steps). */
  hasGap: boolean;
}

/** Concise explanation of what the monitored answers show for this question. */
export function explainQuestion(input: { businessName: string; hasWebsite: boolean; runs: QueryRunDetail[] }): Meaning {
  const { businessName: name } = input;
  const analyzed = analyzedRuns(input.runs);
  if (analyzed.length === 0) {
    return {
      summary: "No AI platform returned an answer we could analyze for this question in this scan.",
      points: [],
      hasGap: false,
    };
  }

  const recommended = analyzed.filter((r) => r.analysis.recommended);
  const mentionedOnly = analyzed.filter((r) => r.analysis.mentioned && !r.analysis.recommended);
  const absent = analyzed.filter((r) => !r.analysis.mentioned);
  const pn = (r: Analyzed) => providerName(r.provider);
  const withPosition = (r: Analyzed) => (r.analysis.position ? `${pn(r)} at #${r.analysis.position}` : pn(r));

  let summary: string;
  if (recommended.length === analyzed.length) {
    summary =
      analyzed.length === 1
        ? `${pn(recommended[0])} recommended ${name}${recommended[0].analysis.position ? ` at #${recommended[0].analysis.position}` : ""} for this question.`
        : `All ${analyzed.length} monitored AI platforms recommended ${name}: ${listJoin(recommended.map(withPosition))}.`;
  } else if (recommended.length > 0) {
    summary = `${name} was recommended by ${listJoin(recommended.map(withPosition))}, but not by every platform.`;
  } else if (mentionedOnly.length > 0) {
    summary = `${name} was mentioned by ${listJoin(mentionedOnly.map(pn))}, but no platform recommended it for this question.`;
  } else {
    summary = `None of the monitored AI platforms mentioned ${name} for this question.`;
  }

  const points: MeaningPoint[] = [];
  if (recommended.length > 0 && mentionedOnly.length > 0) {
    points.push({ tone: "neutral", text: `${listJoin(mentionedOnly.map(pn))} mentioned you without recommending you.` });
  }
  if (absent.length > 0 && absent.length < analyzed.length) {
    points.push({ tone: "negative", text: `You didn't appear in the ${listJoin(absent.map(pn))} ${absent.length === 1 ? "answer" : "answers"}.` });
  }

  // Who is listed ahead of you, or recommended where you are not.
  type Rival = { name: string; ahead: string[]; instead: string[]; tracked: boolean };
  const rivals = new Map<string, Rival>();
  const note = (key: string, label: string, provider: string, tracked: boolean, kind: "ahead" | "instead") => {
    const entry = rivals.get(key) ?? { name: label, ahead: [], instead: [], tracked };
    if (!entry[kind].includes(provider)) entry[kind].push(provider);
    rivals.set(key, entry);
  };
  for (const r of analyzed) {
    const youRecommended = r.analysis.recommended;
    const mine = youRecommended ? (r.analysis.position ?? null) : null;
    const classify = (pos: number | null, rec: boolean): "ahead" | "instead" | null => {
      if (!rec) return null;
      if (!youRecommended) return "instead";
      return mine !== null && pos !== null && pos < mine ? "ahead" : null;
    };
    for (const c of r.analysis.competitors) {
      const kind = classify(c.position, c.recommended);
      if (kind) note(`c:${c.competitorId}`, c.name, pn(r), true, kind);
    }
    for (const b of r.analysis.otherBusinesses) {
      const kind = classify(b.position, true);
      if (kind) note(`o:${b.name.toLowerCase()}`, b.name, pn(r), false, kind);
    }
  }
  const rivalList = [...rivals.values()].sort(
    (a, b) => Number(b.tracked) - Number(a.tracked) || b.ahead.length + b.instead.length - (a.ahead.length + a.instead.length),
  );
  for (const rival of rivalList.slice(0, 3)) {
    const label = rival.tracked ? rival.name : `${rival.name} (not a tracked competitor)`;
    const parts = [
      rival.ahead.length ? `was listed ahead of you on ${listJoin(rival.ahead)}` : null,
      rival.instead.length ? `was recommended on ${listJoin(rival.instead)}, where you weren't` : null,
    ].filter(Boolean);
    points.push({ tone: "negative", text: `${label} ${parts.join(" and ")}.` });
  }
  if (rivalList.length > 3) {
    const more = rivalList.length - 3;
    points.push({ tone: "neutral", text: `${more} more ${more === 1 ? "business was" : "businesses were"} also recommended ahead of or instead of you.` });
  }
  if (rivalList.length === 0 && recommended.length > 0) {
    points.push({ tone: "positive", text: "No other business was listed ahead of you in these answers." });
  }

  const cited = analyzed.filter((r) => r.analysis.citation);
  if (!input.hasWebsite) {
    points.push({ tone: "neutral", text: "Add your website in project settings so we can detect when AI answers cite it as a source." });
  } else if (cited.length > 0) {
    points.push({ tone: "positive", text: `Your website was cited as a source by ${listJoin(cited.map(pn))}.` });
  } else {
    points.push({ tone: "negative", text: "Your website wasn't cited as a source in any of these answers." });
  }

  const negative = analyzed.filter((r) => r.analysis.mentioned && r.analysis.sentiment === "negative");
  if (negative.length > 0) {
    points.push({ tone: "negative", text: `${listJoin(negative.map(pn))} described you in a negative tone. Check the evidence below.` });
  }

  return { summary, points, hasGap: recommended.length < analyzed.length || rivalList.length > 0 };
}
