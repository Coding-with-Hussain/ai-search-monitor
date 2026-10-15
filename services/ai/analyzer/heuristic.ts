import { domainMatches } from "@/lib/domain";
import type { AnalysisCompetitorResult, Citation, OtherBusiness, Sentiment } from "@/types/domain";

import type { AnalysisResult } from "./schema";

/**
 * Deterministic response analyzer.
 *
 * Detects whether a business (and each competitor) is mentioned, whether it
 * is recommended, its position in the recommendation list, sentiment and
 * citation presence — using text structure (numbered/bulleted lists, bold
 * names) and cue words. It is free, fast and reproducible, so it analyzes all
 * simulated responses and serves as the fallback + sanity check for the LLM
 * analyzer.
 */

export interface AnalyzerEntity {
  id?: string;
  name: string;
  aliases?: string[];
  domain?: string | null;
}

export interface AnalyzeInput {
  response: string;
  citations: Citation[];
  business: AnalyzerEntity;
  competitors: Array<AnalyzerEntity & { id: string }>;
}

interface Mention {
  index: number;
  length: number;
}

interface ListItem {
  order: number;
  start: number;
  end: number;
  text: string;
  lead: string;
}

interface EntityOutcome {
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
  sentiment: Sentiment | null;
  cited: boolean;
  evidence: string | null;
  confidence: number;
  viaAlias: boolean;
}

const POSITIVE_CUES = [
  "recommend",
  "top choice",
  "top-rated",
  "top rated",
  "highly rated",
  "highly regarded",
  "highly",
  "best",
  "excellent",
  "outstanding",
  "trusted",
  "reputable",
  "renowned",
  "well-known",
  "well known",
  "well-reviewed",
  "popular",
  "praised",
  "go-to",
  "standout",
  "stands out",
  "leading",
  "great",
  "strong",
  "reliable",
  "experienced",
  "professional",
  "friendly",
  "positive reviews",
  "good value",
  "favorite",
  "favourite",
  "notable",
  "worth considering",
];

const NEGATIVE_CUES = [
  "avoid",
  "complaint",
  "mixed review",
  "mixed experience",
  "negative review",
  "poor",
  "overpriced",
  "expensive",
  "long wait",
  "rude",
  "unprofessional",
  "issues with",
  "problems with",
  "lawsuit",
  "scam",
  "worse",
  "lacks",
  "not recommended",
  "closed",
  "outdated",
  "slow",
];

/** Negative cues strong enough to cancel a recommendation. */
const DISQUALIFYING_CUES = ["avoid", "not recommend", "steer clear", "permanently closed", "scam", "do not go"];

const NON_NAME_LEADS = new Set(
  [
    "consider", "check", "look", "ask", "compare", "read", "visit", "book", "schedule", "make", "choose", "note",
    "tip", "tips", "remember", "factors", "location", "price", "pricing", "cost", "costs", "reviews", "reputation",
    "experience", "services", "qualifications", "insurance", "availability", "specialization", "technology", "hours",
    "budget", "customer", "ease", "features", "integration", "integrations", "support", "scalability", "security",
    "why", "what", "how", "when", "where", "who", "overall", "summary", "conclusion", "final", "bottom", "key",
    "important", "pros", "cons", "best", "here", "these", "this", "also", "if", "for", "search", "use", "try",
    "contact", "verify", "online", "word", "credentials", "convenience", "quality", "value", "patient", "comfort",
  ].map((s) => s.toLowerCase()),
);

const LEGAL_SUFFIX = /[,]?\s+(inc|llc|ltd|limited|co|corp|corporation|gmbh|pvt|plc|llp)\.?$/i;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function nameVariants(entity: AnalyzerEntity): { variant: string; isAlias: boolean; isDomain: boolean }[] {
  const out = new Map<string, { variant: string; isAlias: boolean; isDomain: boolean }>();
  const add = (value: string, isAlias: boolean, isDomain = false) => {
    const v = value.trim();
    if (v.length < 2) return;
    const key = v.toLowerCase();
    if (!out.has(key)) out.set(key, { variant: v, isAlias, isDomain });
  };
  add(entity.name, false);
  const stripped = entity.name.replace(LEGAL_SUFFIX, "");
  if (stripped !== entity.name) add(stripped, false);
  for (const a of entity.aliases ?? []) add(a, true);
  for (const { variant, isAlias } of [...out.values()]) {
    if (variant.includes("&")) add(variant.replace(/&/g, "and"), isAlias);
    if (/\band\b/i.test(variant)) add(variant.replace(/\band\b/gi, "&"), isAlias);
  }
  if (entity.domain) add(entity.domain, true, true);
  return [...out.values()];
}

/**
 * Find mentions of an entity. Case-insensitive, word-boundary aware, tolerant
 * of hyphen/space differences. When the configured name is capitalised,
 * all-lowercase occurrences are ignored ("dental care" ≠ "Dental Care"), which
 * avoids most false positives for generic-sounding business names.
 */
export function findMentions(text: string, entity: AnalyzerEntity): { mentions: Mention[]; viaAlias: boolean } {
  const mentions: Mention[] = [];
  let viaAlias = false;
  for (const { variant, isAlias, isDomain } of nameVariants(entity)) {
    const pattern = variant.split(/\s+/).map(escapeRegExp).join("[\\s\\-]+");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "giu");
    const hasUpper = /\p{Lu}/u.test(variant);
    for (const m of text.matchAll(re)) {
      const matched = m[0];
      if (!isDomain && hasUpper && !/\p{Lu}/u.test(matched)) continue;
      if (mentions.some((x) => m.index! >= x.index && m.index! < x.index + x.length)) continue;
      mentions.push({ index: m.index!, length: matched.length });
      if (isAlias) viaAlias = true;
    }
  }
  mentions.sort((a, b) => a.index - b.index);
  return { mentions, viaAlias: viaAlias && mentions.length > 0 };
}

const ITEM_RE = /^(\s*)(?:#{1,6}\s*)?(?:\*\*)?\s*(?:(\d{1,2})[.)]|[-*•])\s+(.*)$/;

function cleanMarkdown(s: string) {
  return s
    .replace(/\*\*|__/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLead(content: string): string {
  const bold = content.match(/^\s*\*\*(.+?)\*\*/);
  if (bold) return cleanMarkdown(bold[1]).replace(/[:\-–—]\s*$/, "");
  const cleaned = cleanMarkdown(content);
  const cut = cleaned.split(/\s[–—-]\s|:|\(|,|\.\s/)[0] ?? cleaned;
  return cut.slice(0, 80).trim();
}

/** Parse top-level list items (numbered or bulleted) with their full text span. */
export function parseListItems(text: string): ListItem[] {
  const lines = text.split("\n");
  const items: ListItem[] = [];
  let offset = 0;
  let current: ListItem | null = null;
  let baseIndent: number | null = null;

  for (const line of lines) {
    const lineStart = offset;
    offset += line.length + 1;
    const m = line.match(ITEM_RE);
    if (m) {
      const indent = m[1].length;
      if (baseIndent === null) baseIndent = indent;
      if (indent <= baseIndent + 1) {
        if (current) items.push(current);
        current = { order: items.length + 1, start: lineStart, end: lineStart + line.length, text: m[3], lead: extractLead(m[3]) };
        continue;
      }
    }
    if (current) {
      const isContinuation = line.trim() !== "" && (/^\s{2,}/.test(line) || ITEM_RE.test(line));
      if (isContinuation) {
        current.end = lineStart + line.length;
        current.text += ` ${line.trim()}`;
      } else if (line.trim() !== "") {
        items.push(current);
        current = null;
        baseIndent = null;
      }
    }
  }
  if (current) items.push(current);
  return items.map((item, i) => ({ ...item, order: i + 1 }));
}

function looksLikeBusinessName(lead: string) {
  if (!lead || lead.length > 80 || lead.endsWith("?")) return false;
  const words = lead.split(/\s+/);
  if (words.length > 7) return false;
  if (!/^[\p{Lu}\p{N}]/u.test(lead)) return false;
  const first = words[0].toLowerCase().replace(/[^a-z]/g, "");
  if (NON_NAME_LEADS.has(first)) return false;
  return true;
}

function sentences(text: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  const re = /[^.!?\n]+(?:[.!?]+|\n|$)/g;
  for (const m of text.matchAll(re)) {
    if (m[0].trim()) out.push({ start: m.index!, end: m.index! + m[0].length, text: m[0] });
  }
  return out;
}

function countCues(text: string, cues: string[]) {
  const lower = text.toLowerCase();
  return cues.reduce((n, cue) => n + (lower.includes(cue) ? 1 : 0), 0);
}

function sentimentOf(text: string): Sentiment {
  const pos = countCues(text, POSITIVE_CUES);
  const neg = countCues(text, NEGATIVE_CUES);
  const score = pos - neg * 1.5;
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

function truncate(s: string, max = 280) {
  const clean = cleanMarkdown(s);
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function isCited(entity: AnalyzerEntity, citations: Citation[], text: string) {
  if (!entity.domain) return false;
  if (citations.some((c) => domainMatches(c.domain, entity.domain))) return true;
  // The domain (or a subdomain of it) written in the answer, as a whole host:
  // "notexample.com" and "example.com.au" are different sites.
  const host = new RegExp(`(?<![\\p{L}\\p{N}-])${escapeRegExp(entity.domain)}(?![\\p{L}\\p{N}-]|\\.[\\p{L}\\p{N}])`, "iu");
  return host.test(text);
}

type Span = Mention;

/**
 * Drop spans that sit inside a longer span of another entity, so "Bright Smile"
 * is not credited for every "Bright Smile Orthodontics" mention.
 */
function withoutContained(own: Span[], others: Span[]): Span[] {
  return own.filter(
    (m) => !others.some((o) => o.length > m.length && o.index <= m.index && o.index + o.length >= m.index + m.length),
  );
}

function resolveMentions(text: string, entities: Array<{ key: string; entity: AnalyzerEntity }>) {
  const raw = new Map(entities.map(({ key, entity }) => [key, findMentions(text, entity)]));
  const resolved = new Map<string, { mentions: Mention[]; viaAlias: boolean }>();
  for (const [key, found] of raw) {
    const others = [...raw].filter(([k]) => k !== key).flatMap(([, f]) => f.mentions);
    const mentions = withoutContained(found.mentions, others);
    resolved.set(key, { mentions, viaAlias: found.viaAlias && mentions.length > 0 });
  }
  return resolved;
}

interface Context {
  text: string;
  items: ListItem[];
  /** Items whose lead names a business, in order — the recommendation list. */
  subjectItems: { item: ListItem; subjectKey: string }[];
}

function analyzeEntity(
  key: string,
  entity: AnalyzerEntity,
  ctx: Context,
  citations: Citation[],
  firstMentionRank: Map<string, number>,
  found: { mentions: Mention[]; viaAlias: boolean },
): EntityOutcome {
  const { mentions, viaAlias } = found;
  const cited = isCited(entity, citations, ctx.text);
  if (mentions.length === 0) {
    return { mentioned: false, recommended: false, position: null, sentiment: null, cited, evidence: null, confidence: 0.85, viaAlias: false };
  }

  const subjectIdx = ctx.subjectItems.findIndex((s) => s.subjectKey === key);
  const subject = subjectIdx >= 0 ? ctx.subjectItems[subjectIdx].item : null;
  const allSentences = sentences(ctx.text);
  const mentionSentences = allSentences.filter((s) => mentions.some((m) => m.index >= s.start && m.index < s.end));
  const contextText = subject ? subject.text : mentionSentences.map((s) => s.text).join(" ");

  const disqualified = countCues(contextText, DISQUALIFYING_CUES) > 0;
  let recommended: boolean;
  let position: number | null;
  let confidence: number;

  if (subject) {
    recommended = !disqualified;
    position = subjectIdx + 1;
    confidence = 0.9;
  } else if (ctx.subjectItems.length > 0) {
    // There is a recommendation list, but this entity is only mentioned in passing.
    recommended = !disqualified && countCues(contextText, POSITIVE_CUES) > 0;
    position = null;
    confidence = 0.7;
  } else {
    // No list structure: rank by order of first appearance among detected businesses.
    recommended = !disqualified && countCues(contextText, POSITIVE_CUES) > 0;
    position = recommended ? (firstMentionRank.get(key) ?? null) : null;
    confidence = 0.72;
  }
  if (viaAlias) confidence -= 0.1;

  return {
    mentioned: true,
    recommended,
    position,
    sentiment: sentimentOf(contextText),
    cited,
    evidence: truncate(subject ? subject.text : (mentionSentences[0]?.text ?? ctx.text.slice(mentions[0].index, mentions[0].index + 200))),
    confidence: Math.max(0.4, Math.min(0.95, confidence)),
    viaAlias,
  };
}

export function explain(
  businessName: string,
  outcome: Pick<AnalysisResult, "mentioned" | "recommended" | "position" | "sentiment" | "citation">,
  listSize: number,
  leaders: string[],
): string {
  if (!outcome.mentioned) {
    return leaders.length
      ? `${businessName} was not mentioned. The answer recommended ${leaders.slice(0, 3).join(", ")} instead.`
      : `${businessName} was not mentioned in this answer.`;
  }
  const parts: string[] = [];
  if (outcome.recommended && outcome.position) {
    parts.push(`${businessName} was recommended at position #${outcome.position}${listSize ? ` of ${listSize}` : ""}`);
  } else if (outcome.recommended) {
    parts.push(`${businessName} was recommended`);
  } else {
    parts.push(`${businessName} was mentioned but not clearly recommended`);
  }
  if (outcome.sentiment) parts[0] += ` with ${outcome.sentiment} sentiment`;
  parts[0] += ".";
  parts.push(outcome.citation ? "Your website was cited as a source." : "Your website was not cited as a source.");
  return parts.join(" ");
}

export function analyzeHeuristically(input: AnalyzeInput): AnalysisResult {
  const text = input.response ?? "";
  const items = parseListItems(text);

  const entities: Array<{ key: string; entity: AnalyzerEntity }> = [
    { key: "__business__", entity: input.business },
    ...input.competitors.map((c) => ({ key: c.id, entity: c })),
  ];

  // Identify which list items are "about" a business (their lead names one).
  const subjectItems: Context["subjectItems"] = [];
  const others: OtherBusiness[] = [];
  for (const item of items) {
    // The most specific (longest) name in the lead decides whose item it is.
    const inLead = resolveMentions(item.lead, entities);
    const tracked = entities
      .map((e) => ({ ...e, longest: Math.max(0, ...inLead.get(e.key)!.mentions.map((m) => m.length)) }))
      .filter((e) => e.longest > 0)
      .reduce<{ key: string; longest: number } | undefined>((best, e) => (!best || e.longest > best.longest ? e : best), undefined);
    if (tracked) {
      // A business listed twice keeps its first (best) position.
      if (!subjectItems.some((s) => s.subjectKey === tracked.key)) subjectItems.push({ item, subjectKey: tracked.key });
    } else if (looksLikeBusinessName(item.lead)) {
      const key = `other:${item.lead.toLowerCase()}`;
      if (!subjectItems.some((s) => s.subjectKey === key)) subjectItems.push({ item, subjectKey: key });
    }
  }
  subjectItems.forEach((s, i) => {
    if (s.subjectKey.startsWith("other:")) {
      const name = s.item.lead;
      if (!others.some((o) => o.name.toLowerCase() === name.toLowerCase())) others.push({ name, position: i + 1 });
    }
  });

  // First-appearance rank for prose answers without lists.
  const mentionsByKey = resolveMentions(text, entities);
  const firstIndex = entities
    .map(({ key }) => ({ key, idx: mentionsByKey.get(key)!.mentions[0]?.index ?? -1 }))
    .filter((e) => e.idx >= 0)
    .sort((a, b) => a.idx - b.idx);
  const firstMentionRank = new Map(firstIndex.map((e, i) => [e.key, i + 1]));

  const ctx: Context = { text, items, subjectItems };
  const business = analyzeEntity("__business__", input.business, ctx, input.citations, firstMentionRank, mentionsByKey.get("__business__")!);

  const competitors: AnalysisCompetitorResult[] = input.competitors.map((c) => {
    const o = analyzeEntity(c.id, c, ctx, input.citations, firstMentionRank, mentionsByKey.get(c.id)!);
    return {
      competitorId: c.id,
      name: c.name,
      mentioned: o.mentioned,
      recommended: o.recommended,
      position: o.position,
      sentiment: o.sentiment,
      cited: o.cited,
    };
  });

  const leaders = subjectItems
    .filter((s) => s.subjectKey !== "__business__")
    .map((s) => {
      if (s.subjectKey.startsWith("other:")) return s.item.lead;
      return input.competitors.find((c) => c.id === s.subjectKey)?.name ?? s.item.lead;
    });

  const result: AnalysisResult = {
    mentioned: business.mentioned,
    recommended: business.recommended,
    position: business.position,
    sentiment: business.sentiment,
    citation: business.cited,
    confidence: business.confidence,
    evidence: business.evidence ?? (leaders.length ? `Recommended instead: ${leaders.slice(0, 4).join(", ")}.` : truncate(text, 200) || null),
    explanation: "",
    competitors,
    otherBusinesses: others.slice(0, 25),
  };
  result.explanation = explain(input.business.name, result, subjectItems.length, leaders);
  return result;
}
