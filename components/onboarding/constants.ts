import { AppWindow, BriefcaseBusiness, type LucideIcon, MapPin, ShoppingBag } from "lucide-react";

import type { BusinessType, MonitoringFrequency } from "@/types/domain";

import type { OnboardingInput } from "./schema";

export type StepId = "business" | "services" | "competitors" | "monitoring";

export interface WizardStep {
  id: StepId;
  label: string;
  title: string;
  description: string;
  /** Top-level form fields validated before leaving the step. */
  fields: Array<keyof OnboardingInput>;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "business",
    label: "Business",
    title: "Tell us about your business",
    description: "AI assistants describe businesses by name, category and location. This is how we recognise yours in their answers.",
    fields: ["name", "website", "industry", "businessType", "country", "city"],
  },
  {
    id: "services",
    label: "Services",
    title: "What do customers buy from you?",
    description: "Add the products or services people ask about. We use them to write realistic buyer questions.",
    fields: ["services"],
  },
  {
    id: "competitors",
    label: "Competitors",
    title: "Who do you compete with?",
    description: "We track how often AI answers mention them alongside you, or instead of you. This step is optional.",
    fields: ["competitors"],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    title: "AI monitoring preferences",
    description: "Choose what to monitor and how often. You can change all of this later in project settings.",
    fields: ["monitoring", "runFirstScan"],
  },
];

export const BUSINESS_TYPE_OPTIONS: Array<{ value: BusinessType; label: string; description: string; icon: LucideIcon }> = [
  {
    value: "local",
    label: "Local business",
    description: "Customers visit you or you serve a local area, like a clinic, restaurant or trade.",
    icon: MapPin,
  },
  { value: "saas", label: "SaaS", description: "Software sold online, usually by subscription.", icon: AppWindow },
  { value: "ecommerce", label: "E-commerce", description: "Products sold through an online store.", icon: ShoppingBag },
  {
    value: "services",
    label: "Services & agencies",
    description: "Professional or B2B services, like agencies, consultants and firms.",
    icon: BriefcaseBusiness,
  },
];

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = Object.fromEntries(
  BUSINESS_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<BusinessType, string>;

export const SERVICE_PLACEHOLDER: Record<BusinessType, string> = {
  local: "e.g. teeth whitening, emergency dentist",
  saas: "e.g. invoicing software, expense tracking",
  ecommerce: "e.g. running shoes, trail running shoes",
  services: "e.g. SEO audits, paid search management",
};

/** Common industries offered as suggestions (users can type anything). Singular nouns read best in questions. */
export const INDUSTRY_SUGGESTIONS = [
  "Dentist",
  "Orthodontist",
  "Medical clinic",
  "Chiropractor",
  "Physical therapy clinic",
  "Veterinary clinic",
  "Law firm",
  "Accounting firm",
  "Financial advisor",
  "Insurance agency",
  "Real estate agency",
  "Restaurant",
  "Cafe",
  "Hotel",
  "Gym",
  "Hair salon",
  "Beauty salon",
  "Plumber",
  "Electrician",
  "Roofing contractor",
  "HVAC contractor",
  "Auto repair shop",
  "Cleaning service",
  "Moving company",
  "Landscaping company",
  "Wedding photographer",
  "Tutoring service",
  "Driving school",
  "Travel agency",
  "Marketing agency",
  "Web design agency",
  "IT services",
  "Recruitment agency",
  "CRM software",
  "Project management software",
  "Accounting software",
  "HR software",
  "Online clothing store",
  "Skincare brand",
  "Furniture store",
  "Pet supplies store",
];

export const COUNTRY_SUGGESTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Portugal",
  "India",
  "Singapore",
  "United Arab Emirates",
  "South Africa",
  "Brazil",
  "Mexico",
  "Japan",
];

export const FREQUENCY_LABEL: Record<MonitoringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "Manual only",
};

/** Approximate automatic scans per month, for usage estimates. */
export const SCANS_PER_MONTH: Record<MonitoringFrequency, number> = {
  daily: 30,
  weekly: 4,
  monthly: 1,
  manual: 0,
};
