import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/billing/plans";

import { Container } from "./container";
import { RadarBackdrop } from "./radar-backdrop";

export function FinalCta({
  title = "See how AI sees your business.",
  description = `Run a free check with no signup, or start monitoring with a ${TRIAL_DAYS}-day free trial. No credit card required.`,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section aria-labelledby="final-cta-title" className="py-16 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-14 text-center shadow-card sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
          <RadarBackdrop
            id="cta-radar"
            sweep={false}
            blips={false}
            className="absolute top-1/2 left-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 opacity-60 [mask-image:radial-gradient(circle,black_20%,transparent_65%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 id="final-cta-title" className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground sm:text-[17px]">{description}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="px-6">
                <Link href="/free-ai-visibility-check">
                  Check My AI Visibility
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-6">
                <Link href="/signup">Start Monitoring</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
