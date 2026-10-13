import { FileText, MapPin, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Container, Section, SectionHeading } from "./container";

const EXAMPLES = [
  {
    icon: ShieldCheck,
    title: "Build stronger third-party authority.",
    category: "Authority",
    priority: "High impact",
    why: "AI answers lean on directories, review sites and press. Competitors are cited from sources where you are not listed.",
    action: "Get listed and reviewed on the sources AI cites most in your category.",
  },
  {
    icon: FileText,
    title: "Create a comparison page.",
    category: "Content",
    priority: "Medium impact",
    why: "When buyers ask how options compare, AI answers name competitors and leave you out of the comparison.",
    action: "Publish an honest page comparing your offer with the alternatives buyers consider.",
  },
  {
    icon: MapPin,
    title: "Improve location-specific content.",
    category: "Local",
    priority: "High impact",
    why: "You are mentioned less often in questions that include your city than in general questions.",
    action: "Add clear service-area pages with your location, hours and the services you offer there.",
  },
];

export function RecommendationsSection() {
  return (
    <Section aria-labelledby="recommendations-title">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="recommendations-title"
            eyebrow="Recommendations"
            title="Turn AI visibility into actionable marketing."
            description="Every scan ends with a prioritized list of practical improvements, each tied to the signals we observed in real answers, so you always know why it matters."
          />
          <Badge variant="demo" className="self-start md:self-end">
            Example recommendations
          </Badge>
        </div>

        <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {EXAMPLES.map(({ icon: Icon, title, category, priority, why, action }) => (
            <li key={title} className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge variant="secondary">{category}</Badge>
                  <Badge variant={priority.startsWith("High") ? "warning" : "outline"}>{priority}</Badge>
                </div>
              </div>
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Why: </span>
                {why}
              </p>
              <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Next step: </span>
                {action}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
