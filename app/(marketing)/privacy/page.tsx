import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { marketingMetadata } from "@/components/marketing/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = marketingMetadata({
  title: "Privacy Policy",
  description:
    "What data AI Search Visibility Monitor collects, how monitored questions are processed by AI platforms, how long we keep data and how to delete it.",
  path: "/privacy",
});

const UPDATED = "2026-10-12";
const email = siteConfig.supportEmail;

const SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <>
        <p>
          This policy explains what information {siteConfig.name} (“we”, “us”) collects when you use our website and
          service, why we collect it, and the choices you have. We collect only what we need to monitor your AI search
          visibility, and we never sell your personal data.
        </p>
        <p>
          If you have questions at any time, email us at <a href={`mailto:${email}`}>{email}</a>.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Information we collect",
    content: (
      <>
        <ul>
          <li>
            <strong>Account information:</strong> your email address and name. Passwords are handled by our
            authentication provider and stored only in hashed form; we never see them in plain text.
          </li>
          <li>
            <strong>Business information you enter:</strong> business name, website, industry, location, services and
            the competitors you choose to track.
          </li>
          <li>
            <strong>Monitored questions:</strong> the buyer questions generated for your projects or added by you.
          </li>
          <li>
            <strong>AI answers and analysis:</strong> the answers returned by AI platforms, the sources they cite, and
            our analysis of them (mentions, recommendations, position, sentiment and scores).
          </li>
          <li>
            <strong>Usage information:</strong> how many queries, scans and reports you use, which we need to apply plan
            limits, plus product analytics described below.
          </li>
          <li>
            <strong>Billing information:</strong> payments are processed by Stripe. We store your Stripe customer and
            subscription identifiers and your plan status. We never receive or store your card number.
          </li>
          <li>
            <strong>Free check and abuse prevention:</strong> when you use the free AI visibility check we store the
            business details you enter and a one-way hash of your IP address so we can limit abuse.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use-data",
    title: "How we use information",
    content: (
      <ul>
        <li>To run the service: generate questions, run scans, calculate scores and produce recommendations and reports.</li>
        <li>To manage your account, subscription, plan limits and billing.</li>
        <li>To send the emails you have chosen to receive, plus essential account and billing messages.</li>
        <li>To keep the service secure, prevent abuse and fix problems.</li>
        <li>To understand, in aggregate, which features are used so we can improve the product.</li>
      </ul>
    ),
  },
  {
    id: "ai-processing",
    title: "AI query processing",
    content: (
      <>
        <p>
          When live monitoring is enabled, the questions you monitor are sent to the APIs of{" "}
          <strong>OpenAI (ChatGPT)</strong>, <strong>Google (Gemini)</strong> and <strong>Perplexity</strong>, for the
          platforms you have turned on for each project. These are generic buyer questions, such as “best family
          dentist in Portland”. They do not include your email address, name or other account details.
        </p>
        <p>
          We store the raw answers we receive so we can calculate your scores, show evidence for every result and let
          you compare scans over time. To analyze an answer we may also send its text, together with your business and
          competitor names, to an AI model. AI providers process these requests under their own API terms and privacy
          policies.
        </p>
        <p>
          When live monitoring is not enabled (for example in demo projects or simulation mode), answers are simulated
          and nothing is sent to AI platforms. Simulated results are always clearly labeled in the product.
        </p>
      </>
    ),
  },
  {
    id: "monitoring",
    title: "Monitoring behavior",
    content: (
      <p>
        Scans run on the schedule you choose for each project (for example weekly or monthly) or when you start one
        manually. You control the frequency in your project settings, can switch a project to manual-only monitoring at
        any time, and can pause or delete individual questions. Each scan counts toward your plan’s monthly query
        allowance.
      </p>
    ),
  },
  {
    id: "analytics-cookies",
    title: "Analytics and cookies",
    content: (
      <>
        <p>
          We use product analytics to understand how features are used, for example when a scan is started or a report
          is generated. Analytics events are tied to a random identifier stored in your browser, not used for
          advertising, and never sold.
        </p>
        <p>
          We use essential cookies to keep you signed in and secure your session, and your browser’s local storage to
          remember preferences such as light or dark mode. We do not use advertising or cross-site tracking cookies.
        </p>
      </>
    ),
  },
  {
    id: "email",
    title: "Email",
    content: (
      <p>
        We send essential messages about your account and billing. Weekly reports and alerts (such as visibility drops
        or competitor overtakes) are optional and can be turned off at any time in your notification settings.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Service providers and sharing",
    content: (
      <>
        <p>We share information only with providers that help us run the service, and only for that purpose:</p>
        <ul>
          <li>Infrastructure, database and authentication hosting.</li>
          <li>Stripe for payments and subscription management.</li>
          <li>OpenAI, Google and Perplexity for AI answers when live monitoring is enabled.</li>
          <li>An email delivery provider for reports, alerts and account messages.</li>
          <li>A product analytics provider, if analytics is enabled.</li>
        </ul>
        <p>
          We do not sell or rent your personal data, and we do not share it with advertisers. We may disclose
          information if required by law.
        </p>
      </>
    ),
  },
  {
    id: "retention-deletion",
    title: "Data retention and deletion",
    content: (
      <>
        <p>
          We keep your data for as long as your account is active. You can delete a project or your entire account at
          any time from Settings. Deletion cascades: deleting a project removes its questions, competitors, scans, AI
          answers, analysis, recommendations and reports, and deleting your account removes all of your projects and
          profile data.
        </p>
        <p>
          We may retain limited billing records where the law requires it. Deleted data may persist in encrypted backups
          for a short period until those backups expire.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <p>
        All traffic is encrypted in transit with HTTPS. Access to your data is restricted to your account and checked on
        every request, API keys and secrets stay on our servers, and payment details are handled entirely by Stripe. No
        system is perfectly secure, so please use a strong, unique password and contact us if you notice anything
        unusual.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    content: (
      <p>
        Depending on where you live, you may have the right to access, correct, export or delete your personal data, or
        to object to certain processing. You can do most of this yourself in Settings. For anything else, email{" "}
        <a href={`mailto:${email}`}>{email}</a> and we will respond within a reasonable time.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: <p>The service is intended for businesses and is not directed at children under 16.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this policy as the service evolves. We will change the date at the top of this page and, for
        significant changes, notify you by email or in the product. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Questions or requests about privacy: <a href={`mailto:${email}`}>{email}</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <p>
          In short: we collect what we need to monitor your AI search visibility, we send only generic buyer questions to
          AI platforms, we never sell your data, and you can delete everything at any time.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
