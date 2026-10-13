import type { Metadata } from "next";
import Link from "next/link";

import { StatusPage } from "@/components/marketing/status-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const HELPFUL_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/free-ai-visibility-check", label: "Free check" },
];

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="This page isn’t on our radar."
      description="The page you’re looking for doesn’t exist or may have moved. Check the address, or head somewhere useful below."
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/">Go to homepage</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </>
      }
      footer={
        <nav aria-label="Helpful links">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {HELPFUL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="font-medium text-primary underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      }
    />
  );
}
