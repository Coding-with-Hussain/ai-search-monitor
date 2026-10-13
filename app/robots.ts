import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/** Public marketing pages are crawlable; the signed-in app, APIs and auth flows are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/projects",
        "/settings",
        "/billing",
        "/onboarding",
        "/admin",
        "/api",
        "/auth",
        "/reset-password",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
