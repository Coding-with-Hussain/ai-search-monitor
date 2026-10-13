import Link from "next/link";
import type * as React from "react";

import { ThemeToggle } from "@/components/app/theme-toggle";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/lib/site";

/**
 * Split layout for auth pages: form column on the left, calm brand panel on
 * the right (large screens only). Deliberately does not read cookies — pages
 * decide what to render for signed-in users.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex min-w-0 flex-col px-4 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            aria-label={`${siteConfig.shortName} home`}
          >
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        <main id="main" className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>

        <footer className="flex flex-col items-center gap-2 text-xs text-subtle-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}</p>
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-foreground">
              Support
            </a>
          </nav>
        </footer>
      </div>

      <aside className="hidden border-l border-border bg-surface-muted lg:block" aria-label="About AI Visibility">
        <AuthBrandPanel />
      </aside>
    </div>
  );
}
