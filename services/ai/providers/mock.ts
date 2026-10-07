import { hashString, seededRandom, sleep } from "@/lib/utils";
import type { BusinessContext, Citation, CompetitorContext, ProviderId } from "@/types/domain";

import type { AIProvider, ProviderQueryInput, ProviderResult } from "./types";

/**
 * Deterministic simulation provider.
 *
 * Produces realistic AI-style answers (ranked lists, short rationales,
 * citations) WITHOUT calling any external API. The same (provider, query,
 * business, seed) always yields the same text, so tests and demos are stable.
 * Results are flagged `isMock: true` and every scan that uses this provider is
 * stored with `mode = 'mock'` and labelled "Simulation" in the UI.
 *
 * The analyzer and scoring engine process these responses exactly like real
 * provider output — nothing downstream is faked.
 */

const PROVIDER_BIAS: Record<ProviderId, number> = {
  chatgpt: 0.06,
  gemini: -0.08,
  perplexity: 0,
};

const CITATION_RATE: Record<ProviderId, number> = {
  chatgpt: 0.55,
  gemini: 0.7,
  perplexity: 1,
};

const DIRECTORIES: Record<BusinessContext["businessType"], string[]> = {
  local: ["google.com", "yelp.com", "tripadvisor.com", "facebook.com", "yellowpages.com", "reddit.com"],
  saas: ["g2.com", "capterra.com", "reddit.com", "trustradius.com", "producthunt.com", "techradar.com"],
  ecommerce: ["reddit.com", "trustpilot.com", "youtube.com", "amazon.com", "rtings.com", "wirecutter.com"],
  services: ["clutch.co", "linkedin.com", "upwork.com", "trustpilot.com", "reddit.com", "goodfirms.co"],
};

const HEALTH_DIRECTORIES = ["healthgrades.com", "practo.com", "zocdoc.com"];

const LOCAL_PREFIXES = ["Prime", "City", "Bright", "Premier", "Family", "Modern", "Elite", "Central", "Advanced", "Green Valley"];
const LOCAL_SUFFIXES = ["Care", "Centre", "Studio", "Associates", "Group", "House", "Experts", "Partners"];
const BRAND_SYLLABLES = ["Nova", "Lumen", "Orbit", "Pilot", "Vector", "Atlas", "Beacon", "Summit", "Harbor", "Kite", "Quill", "Ember"];
const BRAND_ENDINGS = ["HQ", "ly", "Desk", "Hub", "Works", "Labs", "Stack", "Flow"];

const POSITIVE_REASONS = [
  "consistently strong patient and customer reviews",
  "experienced specialists and transparent pricing",
  "a modern setup and a reputation for reliable results",
  "friendly staff and convenient booking",
  "a long track record and many positive testimonials",
  "clear communication and good value for money",
];

const SAAS_REASONS = [
  "an intuitive interface that small teams pick up quickly",
  "strong automation features and solid integrations",
  "competitive pricing with a generous free tier",
  "reliable customer support and good documentation",
  "powerful reporting that scales as you grow",
];

const NEGATIVE_NOTES = [
  "though some reviews mention long wait times",
  "although a few customers report mixed experiences with follow-up",
  "but it is often described as expensive",
];

interface Candidate {
  name: string;
  domain: string | null;
  strength: number;
  kind: "business" | "competitor" | "other";
}

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function industryNoun(business: BusinessContext) {
  const words = business.industry.trim().split(/\s+/);
  return titleCase(words.slice(0, 2).join(" "));
}

function otherBusinessNames(business: BusinessContext, rng: () => number, count: number): string[] {
  const names = new Set<string>();
  const noun = industryNoun(business);
  let guard = 0;
  while (names.size < count && guard++ < 50) {
    if (business.businessType === "local" || business.businessType === "services") {
      const pattern = Math.floor(rng() * 3);
      const prefix = LOCAL_PREFIXES[Math.floor(rng() * LOCAL_PREFIXES.length)];
      const suffix = LOCAL_SUFFIXES[Math.floor(rng() * LOCAL_SUFFIXES.length)];
      const city = business.city ? titleCase(business.city) : "Metro";
      const name =
        pattern === 0 ? `${prefix} ${noun}` : pattern === 1 ? `${city} ${noun} ${suffix}` : `${prefix} ${noun} ${suffix}`;
      names.add(name);
    } else {
      const a = BRAND_SYLLABLES[Math.floor(rng() * BRAND_SYLLABLES.length)];
      const b = BRAND_ENDINGS[Math.floor(rng() * BRAND_ENDINGS.length)];
      names.add(`${a}${b}`);
    }
  }
  return [...names];
}

function slugDomain(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
}

/** Baseline strength for the monitored business when no override is given. */
export function defaultMockStrength(business: Pick<BusinessContext, "name">) {
  return 0.42 + ((hashString(business.name.toLowerCase()) % 1000) / 1000) * 0.28;
}

export function buildMockResponse(
  provider: ProviderId,
  input: ProviderQueryInput,
): { text: string; citations: Citation[] } {
  const business = input.businessContext;
  const query = input.query;
  if (!business) {
    return {
      text: "There are several well-reviewed options. Compare recent reviews, pricing and credentials before deciding.",
      citations: [],
    };
  }

  const seedKey = `${provider}|${query.toLowerCase()}|${business.name.toLowerCase()}|${input.seed ?? ""}`;
  const rng = seededRandom(hashString(seedKey));
  const lowerQuery = query.toLowerCase();
  const competitors: CompetitorContext[] = input.competitors ?? [];

  const strength = Math.max(
    0.05,
    Math.min(0.95, (input.mockStrength ?? defaultMockStrength(business)) + PROVIDER_BIAS[provider]),
  );

  // Queries that name a brand explicitly almost always mention it.
  const namesBusiness = lowerQuery.includes(business.name.toLowerCase());

  const candidates: Candidate[] = [
    {
      name: business.name,
      domain: business.domain ?? null,
      strength: namesBusiness ? 2 : strength + (rng() - 0.5) * 0.5,
      kind: "business",
    },
  ];

  for (const c of competitors) {
    const base = 0.35 + ((hashString(c.name.toLowerCase()) % 1000) / 1000) * 0.45;
    const named = lowerQuery.includes(c.name.toLowerCase());
    candidates.push({
      name: c.name,
      domain: c.domain ?? null,
      strength: named ? 1.9 : base + (rng() - 0.5) * 0.5,
      kind: "competitor",
    });
  }

  const tracked = candidates.map((c) => c.name.toLowerCase());
  for (const name of otherBusinessNames(business, rng, 5)) {
    const lower = name.toLowerCase();
    // Never invent a name that overlaps a tracked business (it would read as a mention).
    if (tracked.some((t) => lower.includes(t) || t.includes(lower))) continue;
    candidates.push({ name, domain: slugDomain(name), strength: 0.25 + rng() * 0.45, kind: "other" });
  }

  candidates.sort((a, b) => b.strength - a.strength);
  const listSize = 4 + Math.floor(rng() * 3); // 4–6 recommendations
  // A candidate below the inclusion threshold is not mentioned even if the list has room.
  const listed = candidates.filter((c) => c.strength > 0.32).slice(0, listSize);
  const isSaas = business.businessType === "saas" || business.businessType === "ecommerce";
  const reasons = isSaas ? SAAS_REASONS : POSITIVE_REASONS;

  const where = business.city ? ` in ${titleCase(business.city)}` : "";
  const intros = [
    `Here are some of the most frequently recommended options${where}, based on reviews, reputation and services offered:`,
    `Several options stand out${where}. These are commonly recommended:`,
    `Based on reputation, reviews and specialization, here are good choices to consider${where}:`,
  ];
  const outros = [
    "Before deciding, compare recent reviews, ask about pricing up front and check credentials.",
    "Availability and pricing can change, so it is worth contacting a couple of options directly.",
    "Tip: look for recent reviews that mention your specific needs.",
  ];

  const lines: string[] = [intros[Math.floor(rng() * intros.length)], ""];
  listed.forEach((c, i) => {
    const reason = reasons[Math.floor(rng() * reasons.length)];
    const negative = rng() < 0.12 ? `, ${NEGATIVE_NOTES[Math.floor(rng() * NEGATIVE_NOTES.length)]}` : "";
    const highlight = i === 0 ? "Often described as a top choice, known for" : "Known for";
    lines.push(`${i + 1}. **${c.name}** — ${highlight} ${reason}${negative}.`);
  });
  lines.push("", outros[Math.floor(rng() * outros.length)]);

  // Citations: directories plus the websites of some listed businesses.
  const citations: Citation[] = [];
  if (rng() < CITATION_RATE[provider]) {
    const dirs = [...DIRECTORIES[business.businessType]];
    if (/dent|clinic|doctor|health|medical|physio|hospital/i.test(business.industry)) dirs.unshift(...HEALTH_DIRECTORIES);
    const dirCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < dirCount; i++) {
      const domain = dirs[Math.floor(rng() * dirs.length)];
      if (citations.some((c) => c.domain === domain)) continue;
      const slug = encodeURIComponent(lowerQuery.replace(/[^a-z0-9]+/g, "-").slice(0, 60));
      citations.push({ url: `https://${domain}/search/${slug}`, title: `${titleCase(business.industry)} — ${domain}`, domain });
    }
    for (const c of listed) {
      if (!c.domain) continue;
      // Stronger entities are more likely to have their own site cited.
      if (rng() < 0.15 + Math.min(0.6, c.strength * 0.55)) {
        citations.push({ url: `https://${c.domain}/`, title: c.name, domain: c.domain });
      }
    }
  }

  return { text: lines.join("\n"), citations };
}

export class MockProvider implements AIProvider {
  readonly isMock = true;
  readonly model: string;
  readonly displayName: string;

  constructor(
    readonly id: ProviderId,
    private readonly latencyMs = 0,
  ) {
    this.model = `simulated-${id}`;
    this.displayName = `${id} (simulation)`;
  }

  isConfigured() {
    return true;
  }

  async runQuery(input: ProviderQueryInput): Promise<ProviderResult> {
    const started = Date.now();
    if (this.latencyMs > 0) {
      const jitter = (hashString(input.query) % 100) / 100;
      await sleep(Math.round(this.latencyMs * (0.6 + jitter * 0.8)));
    }
    const { text, citations } = buildMockResponse(this.id, input);
    return {
      provider: this.id,
      query: input.query,
      response: text,
      citations,
      model: this.model,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      usage: { inputTokens: null, outputTokens: null },
      estimatedCostUsd: 0,
      isMock: true,
      raw: { simulated: true },
    };
  }
}
