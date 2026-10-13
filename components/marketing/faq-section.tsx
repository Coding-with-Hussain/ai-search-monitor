import { siteConfig } from "@/lib/site";

import { Container, Section, SectionHeading } from "./container";
import type { FaqItem } from "./faq-data";
import { FaqList } from "./faq-list";

export function FaqSection({
  items,
  title = "Frequently asked questions",
  description = "Straight answers about how AI search visibility monitoring works.",
  tone = "default",
}: {
  items: FaqItem[];
  title?: string;
  description?: string;
  tone?: "default" | "muted";
}) {
  return (
    <Section tone={tone} aria-labelledby="faq-title" id="faq">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <SectionHeading id="faq-title" eyebrow="FAQ" title={title} description={description} />
          <p className="mt-6 text-sm text-muted-foreground">
            Still have a question?
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="mt-1 block w-fit font-medium text-primary underline-offset-4 hover:underline"
            >
              {siteConfig.supportEmail}
            </a>
          </p>
        </div>
        <FaqList items={items} />
      </Container>
    </Section>
  );
}
