import { hashString, seededRandom } from "@/lib/utils";
import type { BusinessContext, Priority, QueryCategory } from "@/types/domain";

/**
 * Buyer-intent question generator.
 *
 * Deterministic and free: builds natural questions from templates per
 * business type, fills them with services / location / competitors, removes
 * duplicates and near-duplicates, then picks a balanced set across categories.
 * (An optional AI-assisted generator can add more variety in live mode; its
 * output goes through the same normalization and dedupe.)
 */

export interface GeneratedQuery {
  text: string;
  category: QueryCategory;
  priority: Priority;
  service: string | null;
}

type Candidate = GeneratedQuery & { template: number };

export interface GeneratorInput {
  business: BusinessContext;
  competitors: string[];
  count: number;
  /** Existing query texts to avoid duplicating. */
  existing?: string[];
}

type Template = { category: QueryCategory; text: string; priority: Priority };

const CATEGORY_PRIORITY_ORDER: QueryCategory[] = [
  "best_of",
  "local",
  "purchase_intent",
  "recommendation",
  "product_service",
  "brand_comparison",
  "problem_based",
  "comparison",
];

const LOCAL: Template[] = [
  { category: "best_of", priority: "high", text: "What are the best {industryPlural} in {city}?" },
  { category: "best_of", priority: "high", text: "Who is the best {industry} in {city}?" },
  { category: "best_of", priority: "medium", text: "What is the top-rated {industry} in {city}, {country}?" },
  { category: "local", priority: "high", text: "Where can I get {service} in {city}?" },
  { category: "local", priority: "medium", text: "Which {industry} near {city} has the best reviews?" },
  { category: "local", priority: "medium", text: "Who offers the best {service} near {city}?" },
  { category: "recommendation", priority: "medium", text: "Can you recommend a good {industry} in {city}?" },
  { category: "recommendation", priority: "medium", text: "Which {industry} in {city} would you recommend for {service}?" },
  { category: "product_service", priority: "high", text: "Which {industry} in {city} is best for {service}?" },
  { category: "product_service", priority: "medium", text: "Who should I choose for {service} in {city}?" },
  { category: "problem_based", priority: "medium", text: "Looking for {service} — which {industry} in {city} should I choose?" },
  { category: "problem_based", priority: "low", text: "Where should I go in {city} if I need {service} quickly?" },
  { category: "purchase_intent", priority: "high", text: "What is the best affordable {industry} in {city}?" },
  { category: "purchase_intent", priority: "medium", text: "What is the typical cost of {service} in {city}, and where should I go?" },
  { category: "purchase_intent", priority: "medium", text: "Which {industry} in {city} offers the best value for {service}?" },
  { category: "comparison", priority: "low", text: "Compare the top {industryPlural} in {city} for {service}." },
  { category: "comparison", priority: "low", text: "What are the most trusted {industryPlural} in {city}?" },
  { category: "brand_comparison", priority: "medium", text: "{business} vs {competitor}: which is better?" },
  { category: "brand_comparison", priority: "medium", text: "What are the best alternatives to {competitor} in {city}?" },
  { category: "brand_comparison", priority: "low", text: "Is {business} a good {industry} in {city}?" },
];

const SAAS: Template[] = [
  { category: "best_of", priority: "high", text: "What is the best {industry} for small businesses?" },
  { category: "best_of", priority: "high", text: "What are the top {industry} tools right now?" },
  { category: "best_of", priority: "medium", text: "What is the best {industry} for startups?" },
  { category: "recommendation", priority: "medium", text: "Which {industry} would you recommend for a growing team?" },
  { category: "recommendation", priority: "medium", text: "What {industry} do most small teams use?" },
  { category: "product_service", priority: "high", text: "What is the best {industry} for {service}?" },
  { category: "product_service", priority: "medium", text: "Which tool is best for {service}?" },
  { category: "problem_based", priority: "medium", text: "What software should I use for {service}?" },
  { category: "problem_based", priority: "low", text: "Our team struggles with {service} — what tool should we use?" },
  { category: "purchase_intent", priority: "high", text: "What is the most affordable {industry} with {service}?" },
  { category: "purchase_intent", priority: "medium", text: "Which {industry} offers the best value for money?" },
  { category: "comparison", priority: "low", text: "Which {industry} is easiest to use?" },
  { category: "comparison", priority: "low", text: "What are the pros and cons of the leading {industry} tools?" },
  { category: "brand_comparison", priority: "medium", text: "{business} vs {competitor}: which {industry} is better?" },
  { category: "brand_comparison", priority: "medium", text: "What are the best alternatives to {competitor}?" },
  { category: "brand_comparison", priority: "low", text: "Is {business} worth it?" },
  { category: "local", priority: "low", text: "What {industry} is popular with companies in {country}?" },
];

const ECOMMERCE: Template[] = [
  { category: "best_of", priority: "high", text: "What are the best {industry} brands?" },
  { category: "best_of", priority: "high", text: "What is the best {service} to buy online?" },
  { category: "recommendation", priority: "medium", text: "Which {industry} brand do you recommend?" },
  { category: "product_service", priority: "high", text: "What is the best {service} for everyday use?" },
  { category: "product_service", priority: "medium", text: "What is the best {service} for beginners?" },
  { category: "problem_based", priority: "medium", text: "I'm looking for durable {service} — which brand should I choose?" },
  { category: "purchase_intent", priority: "high", text: "Where can I buy high-quality {service} online?" },
  { category: "purchase_intent", priority: "medium", text: "What is the best value {service} on a budget?" },
  { category: "comparison", priority: "low", text: "Which {industry} brands have the best quality?" },
  { category: "brand_comparison", priority: "medium", text: "{business} vs {competitor}: which is better?" },
  { category: "brand_comparison", priority: "medium", text: "What are good alternatives to {competitor}?" },
  { category: "brand_comparison", priority: "low", text: "Is {business} a good brand for {service}?" },
  { category: "local", priority: "low", text: "What is the best online store for {industry} in {country}?" },
];

const SERVICES: Template[] = [
  { category: "best_of", priority: "high", text: "What are the best {industryPlural} {inCity}?" },
  { category: "best_of", priority: "high", text: "Who is the best {industry} for small businesses {inCity}?" },
  { category: "recommendation", priority: "medium", text: "Can you recommend a reliable {industry} {inCity}?" },
  { category: "product_service", priority: "high", text: "Who is the best {industry} for {service}?" },
  { category: "product_service", priority: "medium", text: "Which company should I hire for {service} {inCity}?" },
  { category: "problem_based", priority: "medium", text: "I need help with {service} — who should I hire?" },
  { category: "purchase_intent", priority: "high", text: "What is the best affordable {industry} {inCity}?" },
  { category: "purchase_intent", priority: "medium", text: "What is the typical cost of {service}, and who offers the best value?" },
  { category: "comparison", priority: "low", text: "How do the top {industryPlural} {inCity} compare?" },
  { category: "local", priority: "medium", text: "Which {industry} near {city} has the best reviews?" },
  { category: "brand_comparison", priority: "medium", text: "{business} vs {competitor}: who is better?" },
  { category: "brand_comparison", priority: "medium", text: "What are the best alternatives to {competitor}?" },
];

const TEMPLATES: Record<BusinessContext["businessType"], Template[]> = {
  local: LOCAL,
  saas: SAAS,
  ecommerce: ECOMMERCE,
  services: SERVICES,
};

export function normalizeQueryText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    // Keep letters, digits and in-word marks in every script (Urdu, Hindi,
    // CJK, …), not just Latin. Latin accents were folded above.
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["the", "a", "an", "in", "for", "of", "to", "is", "what", "which", "who", "are", "near", "and", "i", "me", "my", "should", "best"]);

function tokens(text: string) {
  return new Set(normalizeQueryText(text).split(" ").filter((t) => t && !STOPWORDS.has(t)));
}

/** Jaccard similarity of meaningful tokens — used to drop near-duplicates. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  // Nothing meaningful to compare: only identical text counts as a duplicate.
  if (ta.size === 0 || tb.size === 0) return normalizeQueryText(a) === normalizeQueryText(b) ? 1 : 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function isNearDuplicate(text: string, others: string[], threshold = 0.85) {
  const n = normalizeQueryText(text);
  return others.some((o) => normalizeQueryText(o) === n || similarity(text, o) >= threshold);
}

export function pluralize(noun: string): string {
  const n = noun.trim();
  if (!n) return n;
  const words = n.split(" ");
  const last = words.pop() as string;
  let plural: string;
  if (/(s|x|z|ch|sh)$/i.test(last)) plural = `${last}es`;
  else if (/[^aeiou]y$/i.test(last)) plural = `${last.slice(0, -1)}ies`;
  else plural = `${last}s`;
  return [...words, plural].join(" ");
}

function cleanIndustry(industry: string) {
  return industry.trim().replace(/\s+/g, " ").toLowerCase();
}

function fill(template: string, vars: Record<string, string | undefined>): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    if (v === undefined || v === "") missing = true;
    return v ?? "";
  });
  if (missing) return null;
  const text = out.replace(/\s+/g, " ").replace(/\s+([?.,])/g, "$1").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Build every candidate question for a business, in a deterministic order. */
export function buildCandidates(input: Omit<GeneratorInput, "count">): Candidate[] {
  const b = input.business;
  const industry = cleanIndustry(b.industry);
  const city = b.city?.trim() || undefined;
  const country = b.country?.trim() || undefined;
  const services = b.services.map((s) => s.trim()).filter(Boolean);
  const competitors = input.competitors.map((c) => c.trim()).filter(Boolean);
  const templates = TEMPLATES[b.businessType] ?? LOCAL;

  const base = {
    industry,
    industryPlural: pluralize(industry),
    city,
    country,
    business: b.name.trim(),
    inCity: city ? `in ${city}` : "for small businesses",
  };

  const out: Candidate[] = [];
  for (const [templateIndex, t] of templates.entries()) {
    const usesService = t.text.includes("{service}");
    const usesCompetitor = t.text.includes("{competitor}");
    const serviceOptions = usesService ? services : [undefined];
    const competitorOptions = usesCompetitor ? competitors : [undefined];
    for (const service of serviceOptions) {
      for (const competitor of competitorOptions) {
        const text = fill(t.text, { ...base, service: service?.toLowerCase(), competitor });
        if (!text) continue;
        // Local queries need a city to be meaningful.
        if (b.businessType === "local" && !city && t.text.includes("{city}")) continue;
        const priority: Priority = usesService && service !== services[0] && t.priority === "high" ? "medium" : t.priority;
        out.push({ text, category: t.category, priority, service: service ?? null, template: templateIndex });
      }
    }
  }
  return out;
}

/** Generate `count` varied, de-duplicated buyer-intent questions. */
export function generateQueries(input: GeneratorInput): GeneratedQuery[] {
  const rng = seededRandom(hashString(`${input.business.name}|${input.business.industry}|${input.business.city ?? ""}`));
  const candidates = buildCandidates(input);

  // Within each category, rotate through templates (highest priority first)
  // so one phrasing is not repeated for every service before others appear.
  const shuffle = <T,>(list: T[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const rank = { high: 0, medium: 1, low: 2 } as const;
  const byCategory = new Map<QueryCategory, Candidate[]>();
  for (const c of candidates) byCategory.set(c.category, [...(byCategory.get(c.category) ?? []), c]);
  for (const [k, list] of byCategory) {
    const byTemplate = new Map<number, Candidate[]>();
    for (const c of list) byTemplate.set(c.template, [...(byTemplate.get(c.template) ?? []), c]);
    const groups = shuffle([...byTemplate.values()].map((g) => shuffle(g))).sort(
      (a, b) => Math.min(...a.map((x) => rank[x.priority])) - Math.min(...b.map((x) => rank[x.priority])),
    );
    const interleaved: Candidate[] = [];
    for (let i = 0; groups.some((g) => i < g.length); i++) {
      for (const g of groups) if (g[i]) interleaved.push(g[i]);
    }
    byCategory.set(k, interleaved);
  }

  const selected: GeneratedQuery[] = [];
  const seen = [...(input.existing ?? [])];
  const order = CATEGORY_PRIORITY_ORDER.filter((c) => byCategory.has(c));
  let progress = true;
  while (selected.length < input.count && progress) {
    progress = false;
    for (const category of order) {
      if (selected.length >= input.count) break;
      const list = byCategory.get(category)!;
      while (list.length) {
        const next = list.shift()!;
        if (isNearDuplicate(next.text, seen)) continue;
        selected.push({ text: next.text, category: next.category, priority: next.priority, service: next.service });
        seen.push(next.text);
        progress = true;
        break;
      }
    }
  }
  return selected;
}
