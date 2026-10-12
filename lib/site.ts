/** Public site configuration used by metadata, sitemap and structured data. */
export const siteConfig = {
  name: "AI Search Visibility Monitor",
  shortName: "AI Visibility",
  tagline: "Visibility inside AI.",
  description:
    "Track how ChatGPT, Gemini and Perplexity mention your business when customers ask what to buy, where to go, and who to choose.",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supportEmail: "support@aivisibility.app",
};
