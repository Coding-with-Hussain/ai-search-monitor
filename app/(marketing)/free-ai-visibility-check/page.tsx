import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";

import { FreeCheckForm } from "@/components/free-check/free-check-form";
import { env, features } from "@/lib/env";

export const metadata: Metadata = {
  title: "Free AI Visibility Check",
  description:
    "Find out in seconds whether AI assistants like ChatGPT, Gemini and Perplexity mention and recommend your business. Free, no signup.",
  alternates: { canonical: "/free-ai-visibility-check" },
  openGraph: {
    title: "Free AI Visibility Check — Does AI recommend your business?",
    description: "See whether AI assistants recommend your business when customers ask what to buy and who to choose.",
    url: "/free-ai-visibility-check",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", images: ["/twitter-image"] },
};

export default function FreeCheckPage() {
  const simulated = features.mockMode() || !env().FREE_CHECK_LIVE;
  return (
    <div className="bg-grid">
      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Free AI visibility check</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Does AI recommend your business?</h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            We ask AI assistants a few real buyer questions about your kind of business and show whether you&apos;re mentioned,
            recommended, or passed over for someone else.
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {["Free, no signup", "Results in seconds", "Actionable top issue"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CircleCheck className="size-4 text-primary" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <FreeCheckForm simulated={simulated} />
        </div>
      </section>
    </div>
  );
}
