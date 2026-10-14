import Link from "next/link";

import { SettingsSection } from "./settings-section";

const STORED = [
  { title: "Account details", body: "Your name, email address, company name and settings." },
  {
    title: "Business information",
    body: "The businesses, websites, products, competitors and buyer questions you add to projects.",
  },
  {
    title: "Monitoring results",
    body: "The AI answers we collect for your questions, the observed signals we extract (mentions, recommendations, sources) and your score history and reports.",
  },
  { title: "Usage records", body: "How many queries and reports you use, so we can apply your plan's allowances." },
  {
    title: "Billing references",
    body: "Your plan and Stripe customer reference. Card details are handled by Stripe and never stored by us.",
  },
];

/** What we store about the account, with a link to the privacy policy. */
export function PrivacySection({ supportEmail }: { supportEmail: string }) {
  return (
    <SettingsSection
      id="privacy"
      title="Data & privacy"
      description={
        <>
          What we keep for your account. Read the{" "}
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-2">
            privacy policy
          </Link>{" "}
          for details on how it&apos;s used and protected.
        </>
      }
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        {STORED.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-surface-muted/50 p-3.5">
            <dt className="text-[13px] font-medium text-foreground">{item.title}</dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
        Deleting your account permanently removes this data from our service. Stripe keeps its own billing records, such as
        invoices, as required for accounting. For a copy of your data or any privacy question, email{" "}
        <a href={`mailto:${supportEmail}`} className="font-medium text-foreground underline underline-offset-2">
          {supportEmail}
        </a>
        .
      </p>
    </SettingsSection>
  );
}
