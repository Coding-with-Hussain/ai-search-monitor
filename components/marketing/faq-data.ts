import { PLANS, TRIAL_DAYS } from "@/lib/billing/plans";
import { formatNumber } from "@/lib/format";

import { annualDiscountPercent, SCORE_DISCLAIMER, SCORE_NOT_A_RANKING, scheduleSummary, scoreWeightsSentence } from "./plan-copy";

export interface FaqItem {
  id: string;
  question: string;
  /** Plain text: rendered on the page and reused verbatim in FAQPage JSON-LD. */
  answer: string;
  link?: { href: string; label: string };
}

const agency = PLANS.agency;

export const LANDING_FAQ: FaqItem[] = [
  {
    id: "what-is-ai-search-visibility",
    question: "What is AI search visibility?",
    answer:
      "AI search visibility is how often, and how favorably, AI assistants like ChatGPT, Gemini and Perplexity mention your business when people ask them for recommendations, such as “best accountant for freelancers” or “where can I get my bike repaired nearby”. Traditional rank trackers can’t see these answers. AI Search Visibility Monitor asks those questions on your behalf and records what the answers say.",
  },
  {
    id: "which-platforms",
    question: "Which AI platforms do you monitor?",
    answer:
      "ChatGPT (OpenAI), Gemini (Google) and Perplexity. Every monitored question is checked on each platform you enable, so you can see where your business shows up and where it is missing.",
  },
  {
    id: "how-is-the-score-calculated",
    question: "How is the AI Visibility Score calculated?",
    answer: `${scoreWeightsSentence()} Your score is the average across every question and platform you monitor, on a 0–100 scale. ${SCORE_NOT_A_RANKING} ${SCORE_DISCLAIMER}`,
  },
  {
    id: "guarantee",
    question: "Do you guarantee that AI will recommend my business?",
    answer:
      "No. Nobody can guarantee what an AI assistant will say, and anyone who promises that is overselling. We measure what monitored AI answers actually say about you and your competitors, explain the observed signals, and suggest practical improvements you can make.",
  },
  {
    id: "monitoring-frequency",
    question: "How often does monitoring run?",
    answer: `You choose the schedule for each project: ${scheduleSummary()}. You can also run a scan manually at any time within your plan’s monthly query allowance.`,
  },
  {
    id: "free-trial",
    question: "Is there a free trial?",
    answer: `Yes. Every plan starts with a ${TRIAL_DAYS}-day free trial and no credit card is required. You can also run a free AI visibility check without creating an account.`,
    link: { href: "/free-ai-visibility-check", label: "Run a free check" },
  },
  {
    id: "cancel",
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel from the Billing page whenever you like. Your plan stays active until the end of the billing period you have already paid for, and you won’t be charged again.",
  },
  {
    id: "data-privacy",
    question: "What happens to my data?",
    answer:
      "We never sell your data. When live monitoring is on, the buyer questions you monitor are sent to the AI platforms to collect their answers, and we store those answers to calculate your scores. You can delete a project or your entire account at any time from Settings.",
    link: { href: "/privacy", label: "Read the Privacy Policy" },
  },
  {
    id: "agencies",
    question: "Do you work with marketing and SEO agencies?",
    answer: `Yes. The ${agency.name} plan includes ${formatNumber(agency.limits.projects)} projects, ${formatNumber(
      agency.limits.queriesPerMonth,
    )} queries per month, unlimited competitors and white-label reports, so you can monitor and report on AI visibility for many clients from one account.`,
    link: { href: "/pricing", label: "Compare plans" },
  },
];

export const PRICING_FAQ: FaqItem[] = [
  {
    id: "what-counts-as-a-query",
    question: "What counts as a query?",
    answer:
      "One query is one monitored question checked in one scan, across all the AI platforms enabled for that project. For example, 20 questions scanned weekly use roughly 87 queries in a month.",
  },
  {
    id: "query-limit",
    question: "What happens when I reach my monthly query limit?",
    answer:
      "When your allowance runs low, your highest-priority questions are checked first. Once it is used up, scans pause until your allowance resets at the start of the next billing period. You can upgrade at any time to keep monitoring.",
  },
  {
    id: "trial-card",
    question: "Do I need a credit card to start the trial?",
    answer: `No. The ${TRIAL_DAYS}-day free trial starts without a card. Add a payment method only when you decide to continue.`,
  },
  {
    id: "annual-billing",
    question: "How does annual billing work?",
    answer: `Pay once a year and save ${annualDiscountPercent}% compared with paying monthly. Prices on the pricing page are shown per month; with annual billing the yearly total is charged up front.`,
  },
  {
    id: "change-plan",
    question: "Can I switch plans later?",
    answer:
      "Yes. You can upgrade, downgrade or cancel at any time from the Billing page. Billing is handled by Stripe, which takes care of any price difference automatically.",
  },
  {
    id: "payment-methods",
    question: "How do you handle payments?",
    answer:
      "Payments are processed securely by Stripe. We never see or store your full card number.",
  },
];
