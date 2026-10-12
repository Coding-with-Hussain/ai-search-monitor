import { siteConfig } from "@/lib/site";

export interface NavItem {
  href: string;
  label: string;
}

/** Primary navigation shown in the marketing header (desktop + mobile menu). */
export const MARKETING_NAV: NavItem[] = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/free-ai-visibility-check", label: "Free check" },
  { href: "/demo", label: "Demo" },
  { href: "/about", label: "About" },
];

export const FOOTER_COLUMNS: Array<{ title: string; links: NavItem[] }> = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/free-ai-visibility-check", label: "Free AI visibility check" },
      { href: "/demo", label: "Demo dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: `mailto:${siteConfig.supportEmail}`, label: "Contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Start free trial" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

/** True when `pathname` is `href` or one of its sub-pages. */
export function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
