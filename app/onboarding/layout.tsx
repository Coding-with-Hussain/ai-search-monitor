import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type * as React from "react";

import { ThemeToggle } from "@/components/app/theme-toggle";
import { UpgradeProvider } from "@/components/billing/upgrade-dialog";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Set up monitoring",
  robots: { index: false, follow: false },
};

/**
 * Focused, distraction-free shell for project setup (outside the app
 * sidebar). "Exit" goes to the dashboard without forcing new users straight
 * back into onboarding.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/onboarding");

  return (
    <UpgradeProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Logo />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard?from=onboarding">
                  <X aria-hidden="true" />
                  Exit
                </Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
      </div>
    </UpgradeProvider>
  );
}
