import type * as React from "react";

import { Container, Eyebrow } from "./container";

/** Header band for secondary marketing pages (features, pricing, about, legal). */
export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,black_30%,transparent_100%)]"
      />
      <Container className="relative py-16 text-center sm:py-24">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-pretty text-muted-foreground">{description}</p>
        )}
        {actions && <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">{actions}</div>}
        {children}
      </Container>
    </section>
  );
}
