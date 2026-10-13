import { CircleX, EyeOff, Layers, ListOrdered } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Container, Section, SectionHeading } from "./container";
import { EXAMPLE_BUSINESS } from "./example-data";

const POINTS = [
  {
    icon: ListOrdered,
    title: "A short list, not a results page",
    body: "AI answers usually name a handful of businesses. Ranking well on Google does not mean you make that list.",
  },
  {
    icon: EyeOff,
    title: "Invisible to rank trackers",
    body: "SEO tools measure positions on search pages. They can’t see what an AI assistant tells your next customer.",
  },
  {
    icon: Layers,
    title: "Different on every platform",
    body: "ChatGPT, Gemini and Perplexity draw on different sources, so you can be recommended on one and missing on another.",
  },
];

export function ProblemSection() {
  return (
    <Section tone="muted" aria-labelledby="problem-title">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
        <div>
          <SectionHeading
            id="problem-title"
            eyebrow="The shift in discovery"
            title="Customers now ask AI who to choose."
            description="Google rankings are no longer the only discovery channel. People increasingly ask AI assistants what to buy, where to go and who to hire, and they get back a few names instead of ten blue links. If your business isn’t one of them, your analytics won’t tell you."
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
          <blockquote className="mt-10 border-l-2 border-primary pl-4 text-[17px] leading-relaxed font-medium text-foreground">
            Google tells you where you rank. AI Search Visibility Monitor tells you whether AI recommends you.
          </blockquote>
        </div>

        <AiAnswerExample />
      </Container>
    </Section>
  );
}

function AiAnswerExample() {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-background shadow-pop">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <span className="text-[13px] font-medium text-muted-foreground">AI assistant</span>
        <Badge variant="demo">Illustrative answer</Badge>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-surface-muted px-4 py-2.5 text-sm text-foreground">
          Who’s the best family dentist near me?
        </p>
        <div className="text-sm leading-relaxed text-foreground">
          <p>Here are a few well-reviewed options nearby:</p>
          <ol className="mt-3 space-y-2.5">
            <AnswerItem rank={1} name="Competitor A" note="praised for weekend hours and kid-friendly care." />
            <AnswerItem rank={2} name="Competitor B" note="modern clinic with strong reviews for gentle treatment." />
            <AnswerItem rank={3} name="Competitor C" note="central location and accepts most insurance plans." />
          </ol>
        </div>
        <p className="flex items-start gap-2 rounded-lg border border-dashed border-border-strong bg-surface px-3 py-2.5 text-[13px] text-muted-foreground">
          <CircleX className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <span>
            <span className="font-medium text-foreground">{EXAMPLE_BUSINESS.name}</span> was not mentioned in this answer.
          </span>
        </p>
      </div>
      <figcaption className="sr-only">
        Illustrative example of an AI answer that recommends three competitors and does not mention the business.
      </figcaption>
    </figure>
  );
}

function AnswerItem({ rank, name, note }: { rank: number; name: string; note: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-muted-foreground tabular">
        {rank}
      </span>
      <span>
        <span className="font-medium">{name}</span> <span className="text-muted-foreground">— {note}</span>
      </span>
    </li>
  );
}
