import type * as React from "react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Container, Eyebrow } from "./container";

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

/** Shared layout for the privacy policy and terms: header, table of contents, readable prose. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  /** ISO date of the last revision. */
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <section className="border-b border-border">
        <Container className="py-14 sm:py-20">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated <time dateTime={updated}>{formatDate(updated)}</time>
          </p>
          <div className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">{intro}</div>
        </Container>
      </section>

      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <p className="text-xs font-semibold text-muted-foreground">On this page</p>
          <ol className="mt-3 space-y-1.5 border-l border-border">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="-ml-px block border-l border-transparent py-0.5 pl-3 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-3xl">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className={cn("scroll-mt-24", i > 0 && "mt-12")}>
              <h2 id={`${s.id}-title`} className="text-xl font-semibold tracking-tight text-foreground">
                {s.title}
              </h2>
              <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {s.content}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
