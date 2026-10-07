import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, images, webhooks and machine endpoints.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|opengraph-image|robots.txt|sitemap.xml|api/stripe/webhook|api/cron|api/inngest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
