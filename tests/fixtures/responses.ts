import type { Citation } from "@/types/domain";

/**
 * Deterministic AI-answer fixtures used by analyzer, metrics and pipeline tests.
 * Modeled on real assistant output styles (numbered lists, bold names, prose).
 */

export const BUSINESS = { name: "ABC Dental", domain: "abcdental.com", aliases: [] as string[] };

export const COMPETITORS = [
  { id: "c-xyz", name: "XYZ Dental", domain: "xyzdental.com", aliases: [] as string[] },
  { id: "c-smile", name: "Smile Clinic", domain: "smileclinic.pk", aliases: [] as string[] },
  { id: "c-care", name: "Dental Care Lahore", domain: "dentalcarelahore.com", aliases: [] as string[] },
];

/** The example from the product spec: prose list, ABC Dental second. */
export const PROSE_RECOMMENDATION = {
  query: "What are the best dental clinics in Lahore?",
  response:
    "Some notable options include XYZ Dental, ABC Dental, and Smile Clinic. ABC Dental is highly rated for implants and has excellent reviews, while XYZ Dental is a popular choice for families.",
  citations: [
    { url: "https://abcdental.com/implants", title: "ABC Dental – Implants", domain: "abcdental.com" },
    { url: "https://www.yelp.com/search?find_desc=dentist+lahore", title: "Yelp", domain: "yelp.com" },
  ] satisfies Citation[],
};

export const NUMBERED_LIST = {
  query: "Who is the best dental clinic in Lahore for braces?",
  response: [
    "Here are some of the most frequently recommended options in Lahore:",
    "",
    "1. **XYZ Dental** — Known for experienced orthodontists and modern equipment.",
    "2. **Smile Clinic** — Popular for clear aligners and friendly staff.",
    "3. **ABC Dental** — Often described as a top choice for transparent pricing.",
    "4. **Bright Dental Studio** — Well-reviewed family practice.",
    "",
    "Tip: compare recent reviews before booking.",
  ].join("\n"),
  citations: [{ url: "https://xyzdental.com/", title: "XYZ Dental", domain: "xyzdental.com" }] satisfies Citation[],
};

export const NOT_MENTIONED = {
  query: "What is the best affordable dentist in Lahore?",
  response: [
    "Good affordable options in Lahore include:",
    "",
    "- **XYZ Dental**: competitive pricing and payment plans.",
    "- **Prime Dental Care**: budget-friendly checkups.",
    "- **City Dental Hospital**: wide range of services.",
    "",
    "For quality dental care in Lahore, always check credentials.",
  ].join("\n"),
  citations: [] as Citation[],
};

export const NEGATIVE_MENTION = {
  query: "Which dental clinic in Lahore should I avoid?",
  response: [
    "1. **Smile Clinic** — excellent reviews and a trusted team.",
    "2. **ABC Dental** — some patients report long wait times and complaints about billing, so you may want to avoid it for urgent care.",
  ].join("\n"),
  citations: [] as Citation[],
};

export const HEADING_LIST = {
  query: "Best dental implant clinic in Lahore?",
  response: [
    "### 1. Smile Clinic",
    "Specialist implant surgeons with strong outcomes.",
    "",
    "### 2. ABC Dental",
    "Highly regarded for implants; visit abcdental.com for pricing.",
  ].join("\n"),
  citations: [] as Citation[],
};
