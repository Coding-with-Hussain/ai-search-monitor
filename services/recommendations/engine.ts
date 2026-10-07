import { providerName } from "@/lib/providers-meta";
import type { BusinessContext, Priority, RecommendationCategory, ScanMetrics } from "@/types/domain";

/**
 * Rules-based recommendation engine.
 *
 * Each rule looks for a specific, evidenced gap in the scan metrics and
 * produces a concrete action. Recommendations describe *observed signals* in
 * monitored answers — they never claim to guarantee AI recommendations.
 * Every recommendation has a stable `key` so re-running a scan updates it
 * (keeping the user's completed/dismissed status) instead of duplicating it.
 */

export interface RecommendationDraft {
  key: string;
  title: string;
  description: string;
  reason: string;
  evidence: string | null;
  action: string;
  category: RecommendationCategory;
  priority: Priority;
  impact: "low" | "medium" | "high";
  difficulty: "easy" | "medium" | "hard";
}

export interface RecommendationInput {
  business: BusinessContext;
  metrics: ScanMetrics;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const IMPACT_RANK = { high: 0, medium: 1, low: 2 } as const;

const fmt = (n: number) => `${Math.round(n)}%`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const REVIEW_DOMAINS = ["google.com", "yelp.com", "tripadvisor.com", "trustpilot.com", "healthgrades.com", "facebook.com", "g2.com", "capterra.com", "clutch.co"];

export function generateRecommendations({ business, metrics }: RecommendationInput): RecommendationDraft[] {
  const out: RecommendationDraft[] = [];
  const o = metrics.overall;
  const city = business.city?.trim();
  const topCompetitor = [...metrics.competitors].sort((a, b) => b.metrics.score - a.metrics.score)[0];
  const services = business.services.filter(Boolean);
  const mainService = services[0] ?? business.industry;

  if (metrics.runsSucceeded === 0) return out;

  // R1 — Barely visible anywhere.
  if (o.mentionRate < 15) {
    out.push({
      key: "baseline-footprint",
      title: "Establish a clear AI footprint for your business",
      description:
        "AI assistants rarely mention your business today. They tend to recommend businesses they can identify consistently across the web.",
      reason: `Your business was mentioned in ${fmt(o.mentionRate)} of ${o.runs} monitored AI answers.`,
      evidence: topCompetitor
        ? `${topCompetitor.name} was mentioned in ${fmt(topCompetitor.metrics.mentionRate)} of the same answers.`
        : null,
      action: `Make sure your website clearly states your business name, what you do (${services.slice(0, 3).join(", ") || business.industry})${city ? `, and that you serve ${city}` : ""}. Add an About page, Organization${business.businessType === "local" ? "/LocalBusiness" : ""} structured data, and keep your name, address and contact details identical on every listing.`,
      category: "website",
      priority: "high",
      impact: "high",
      difficulty: "medium",
    });
  }

  // R2 — Weak in local / best-of questions (local businesses).
  const localCats = metrics.categories.filter((c) => c.key === "local" || c.key === "best_of");
  const localRuns = localCats.reduce((s, c) => s + c.runs, 0);
  if (business.businessType === "local" && city && localRuns >= 3) {
    const rate = localCats.reduce((s, c) => s + c.mentionRate * c.runs, 0) / localRuns;
    if (rate < 50) {
      out.push({
        key: "local-best-of",
        title: `Improve visibility in local “best ${business.industry.toLowerCase()} in ${city}” questions`,
        description: `Questions like “best ${business.industry.toLowerCase()} in ${city}” are high-intent. Your business is rarely part of these answers.`,
        reason: `You appeared in ${fmt(rate)} of monitored local and “best-of” answers.`,
        evidence: localCats[0]?.bestCompetitor
          ? `${localCats[0].bestCompetitor.name} appeared in ${fmt(localCats[0].bestCompetitor.mentionRate)} of ${localCats[0].label.toLowerCase()} answers.`
          : null,
        action: `Create a dedicated ${city} page for ${mainService.toLowerCase()} (and each core service) explaining your expertise, the areas of ${city} you serve, experience, pricing guidance and FAQs. Keep your Google Business Profile complete and link it from the page.`,
        category: "local_seo",
        priority: rate < 25 ? "high" : "medium",
        impact: "high",
        difficulty: "medium",
      });
    }
  }

  // R3 — Service-level gaps vs. the best competitor.
  const serviceGaps = metrics.services
    .filter((s) => s.runs >= 2 && s.bestCompetitor && s.bestCompetitor.mentionRate - s.mentionRate >= 20)
    .sort((a, b) => b.bestCompetitor!.mentionRate - b.mentionRate - (a.bestCompetitor!.mentionRate - a.mentionRate))
    .slice(0, 3);
  for (const s of serviceGaps) {
    const gap = s.bestCompetitor!.mentionRate - s.mentionRate;
    out.push({
      key: `service-gap:${slug(s.label)}`,
      title: `Improve visibility for ${s.label.toLowerCase()} searches`,
      description: `Buyers asking about ${s.label.toLowerCase()} see competitors more often than you.`,
      reason: `Competitors appear in ${fmt(s.bestCompetitor!.mentionRate)} of monitored ${s.label.toLowerCase()} answers while your business appears in ${fmt(s.mentionRate)}.`,
      evidence: `${s.bestCompetitor!.name} leads this topic across ${s.queries} monitored question${s.queries === 1 ? "" : "s"}.`,
      action: `Create a comprehensive ${s.label.toLowerCase()} page${city ? ` for ${city}` : ""}: who it is for, process, results or case studies, pricing guidance and FAQs. Strengthen third-party references that mention you for ${s.label.toLowerCase()} (reviews, directories, partner sites).`,
      category: "services",
      priority: gap >= 40 ? "high" : "medium",
      impact: gap >= 40 ? "high" : "medium",
      difficulty: "medium",
    });
  }

  // R4 — Own website rarely cited; third-party sources dominate.
  const thirdParty = metrics.topSources.filter((s) => !s.isOwnDomain && !s.competitorName).slice(0, 3);
  if (o.citationRate < 25 && thirdParty.length > 0 && business.domain) {
    out.push({
      key: "third-party-sources",
      title: "Get present on the sources AI answers cite most",
      description:
        "Answers that cite sources lean on a small set of websites. Being accurately represented there is one of the clearest observed signals.",
      reason: `Your website was cited in ${fmt(o.citationRate)} of monitored answers. Frequently cited sources: ${thirdParty.map((s) => `${s.domain} (${fmt(s.share)})`).join(", ")}.`,
      evidence: "Frequently cited sources in your monitored responses — correlation, not proof of cause.",
      action: `Claim and complete your profiles on ${thirdParty.map((s) => s.domain).join(", ")}. Use the same business name, description and contact details everywhere, add photos and services, and encourage recent customer reviews where relevant.`,
      category: "citations",
      priority: o.citationRate < 10 ? "high" : "medium",
      impact: "medium",
      difficulty: "easy",
    });
  }

  // R5 — Competitor gets cited more (authority gap).
  const authorityLeader = [...metrics.competitors].sort((a, b) => b.metrics.citationRate - a.metrics.citationRate)[0];
  if (authorityLeader && authorityLeader.metrics.citationRate - o.citationRate >= 15) {
    out.push({
      key: "authority-gap",
      title: "Build stronger third-party authority",
      description: `${authorityLeader.name}'s website is cited by AI answers more often than yours.`,
      reason: `${authorityLeader.name} was cited in ${fmt(authorityLeader.metrics.citationRate)} of answers; your site in ${fmt(o.citationRate)}.`,
      evidence: null,
      action: `Earn credible mentions: ${business.businessType === "local" ? "local publications, professional associations, community sponsorships and reputable directories" : "industry publications, review platforms, partner integrations and expert roundups"}. Publish original, citable content (data, guides, FAQs) on your own site.`,
      category: "authority",
      priority: "medium",
      impact: "high",
      difficulty: "hard",
    });
  }

  // R6 — Mentioned but not recommended.
  if (o.mentions >= 3 && o.recommendations / Math.max(1, o.mentions) < 0.6) {
    out.push({
      key: "mentions-to-recommendations",
      title: "Turn mentions into recommendations",
      description: "AI answers know your business but often stop short of recommending it.",
      reason: `You were mentioned in ${o.mentions} answers but recommended in ${o.recommendations}.`,
      evidence: null,
      action:
        "Make your strengths easy to quote: publish specific proof points (years of experience, certifications, results, guarantees), customer testimonials and case studies, and state clearly who you are best for.",
      category: "brand",
      priority: "medium",
      impact: "medium",
      difficulty: "medium",
    });
  }

  // R7 — Low position in recommendation lists.
  if (o.recommendations >= 3 && o.averagePosition !== null && o.averagePosition > 3) {
    out.push({
      key: "low-position",
      title: "Move up in AI recommendation lists",
      description: "When you are recommended, you usually appear below competitors.",
      reason: `Your average position is #${o.averagePosition} across ${o.recommendations} recommendations.`,
      evidence: topCompetitor?.metrics.averagePosition
        ? `${topCompetitor.name} averages #${topCompetitor.metrics.averagePosition}.`
        : null,
      action: `Publish transparent comparison content (for example “How to choose a ${business.industry.toLowerCase()}${city ? ` in ${city}` : ""}”) that explains your differentiators honestly, and keep reviews and ratings current on major platforms.`,
      category: "content",
      priority: o.averagePosition > 5 ? "high" : "medium",
      impact: "medium",
      difficulty: "medium",
    });
  }

  // R8 — Negative sentiment.
  const negShare = o.mentions ? o.sentiment.negative / o.mentions : 0;
  if (o.sentiment.negative >= 1 && negShare >= 0.15) {
    const reviewSources = metrics.topSources.filter((s) => REVIEW_DOMAINS.includes(s.domain)).map((s) => s.domain);
    out.push({
      key: "negative-sentiment",
      title: "Address the negative signals AI repeats",
      description: "Some answers describe your business negatively, which discourages buyers even when you are listed.",
      reason: `${o.sentiment.negative} of ${o.mentions} mentions carried negative sentiment.`,
      evidence: null,
      action: `Review recent feedback${reviewSources.length ? ` on ${reviewSources.join(", ")}` : ""}, respond publicly and professionally, fix recurring issues, and invite satisfied customers to share recent experiences.`,
      category: "reviews",
      priority: "high",
      impact: "high",
      difficulty: "medium",
    });
  }

  // R9 — Weak on a specific provider.
  for (const p of metrics.providers) {
    if (p.status === "unavailable" || p.runs < 3) continue;
    if (o.score - p.score >= 15) {
      const tips: Record<string, string> = {
        gemini:
          "Gemini answers are often grounded in Google Search. Keep your Google Business Profile complete, gather recent Google reviews, and make sure your key pages are indexed.",
        chatgpt:
          "ChatGPT answers draw on broad web coverage. Earn mentions in reputable publications and directories and make sure your site is crawlable (no blocked AI/search crawlers).",
        perplexity:
          "Perplexity cites the pages it uses. Publish clear, up-to-date pages that directly answer buyer questions, with specific facts it can quote.",
      };
      out.push({
        key: `provider-gap:${p.provider}`,
        title: `Improve visibility on ${providerName(p.provider)}`,
        description: `${providerName(p.provider)} recommends you less often than other assistants do.`,
        reason: `Your ${providerName(p.provider)} score is ${Math.round(p.score)} vs ${Math.round(o.score)} overall (mention rate ${fmt(p.mentionRate)}).`,
        evidence: "Observed in monitored answers; providers weigh sources differently.",
        action: tips[p.provider] ?? "Strengthen the sources this assistant relies on.",
        category: p.provider === "gemini" ? "local_seo" : "brand",
        priority: o.score - p.score >= 25 ? "high" : "medium",
        impact: "medium",
        difficulty: "medium",
      });
    }
  }

  // R10 — Losing comparison / brand-comparison questions.
  const comparison = metrics.categories.filter((c) => c.key === "brand_comparison" || c.key === "comparison");
  const compRuns = comparison.reduce((s, c) => s + c.runs, 0);
  if (compRuns >= 3 && topCompetitor) {
    const rate = comparison.reduce((s, c) => s + c.mentionRate * c.runs, 0) / compRuns;
    if (rate < 60) {
      out.push({
        key: "comparison-pages",
        title: "Create honest comparison pages",
        description: "Buyers comparing options are close to a decision; answers to these questions often skip you.",
        reason: `You appeared in ${fmt(rate)} of monitored comparison questions.`,
        evidence: `${topCompetitor.name} is the competitor most often recommended overall.`,
        action: `Publish a “${business.name} vs ${topCompetitor.name}” page and a “best ${business.industry.toLowerCase()}${city ? ` in ${city}` : ""}” buyer's guide with fair, factual comparisons (pricing, services, who each option suits).`,
        category: "content",
        priority: rate < 30 ? "high" : "medium",
        impact: "medium",
        difficulty: "easy",
      });
    }
  }

  // R11 — Category gaps not covered above.
  const covered = new Set(["local", "best_of", "brand_comparison", "comparison"]);
  const weakCategory = metrics.categories
    .filter((c) => !covered.has(c.key) && c.runs >= 3 && c.mentionRate < 30)
    .sort((a, b) => a.mentionRate - b.mentionRate)[0];
  if (weakCategory) {
    out.push({
      key: `category-gap:${weakCategory.key}`,
      title: `Answer more “${weakCategory.label.toLowerCase()}” questions`,
      description: `AI answers to ${weakCategory.label.toLowerCase()} questions rarely include you.`,
      reason: `You appeared in ${fmt(weakCategory.mentionRate)} of ${weakCategory.runs} monitored ${weakCategory.label.toLowerCase()} answers.`,
      evidence: weakCategory.bestCompetitor
        ? `${weakCategory.bestCompetitor.name} appeared in ${fmt(weakCategory.bestCompetitor.mentionRate)}.`
        : null,
      action: `Add an FAQ section and short guides on your site that directly answer these questions in plain language, naming your business, services${city ? ` and ${city}` : ""}.`,
      category: "content",
      priority: "medium",
      impact: "medium",
      difficulty: "easy",
    });
  }

  // R12 — Machine-readable website basics (always useful, low priority).
  if (business.domain && o.citationRate < 40) {
    out.push({
      key: "website-structure",
      title: "Make your website easy for AI systems to understand",
      description: "Clear, structured pages make it easier for AI systems and search engines to describe you accurately.",
      reason: `Your site was cited in ${fmt(o.citationRate)} of monitored answers.`,
      evidence: null,
      action:
        "Add schema.org structured data (Organization/LocalBusiness, Service, FAQPage), use descriptive page titles and headings per service, publish an up-to-date sitemap, and avoid hiding key information inside images or PDFs.",
      category: "website",
      priority: "low",
      impact: "medium",
      difficulty: "easy",
    });
  }

  return out.sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact],
  );
}
