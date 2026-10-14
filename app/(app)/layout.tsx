import type { Metadata } from "next";
import Link from "next/link";
import type * as React from "react";

import { AppNav } from "@/components/app/app-nav";
import { MobileNav } from "@/components/app/mobile-nav";
import { SimulationBadge } from "@/components/app/simulation-badge";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UsageMeter } from "@/components/app/usage-meter";
import { UserMenu } from "@/components/app/user-menu";
import { Logo } from "@/components/brand/logo";
import { UpgradeProvider } from "@/components/billing/upgrade-dialog";
import { ensureUserRecords } from "@/db/repositories/profiles";
import { listProjectsForUser } from "@/db/repositories/projects";
import { getEntitlements, getUsageSummary } from "@/lib/billing/entitlements";
import { requireUser } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { daysUntil } from "@/lib/format";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await ensureUserRecords(user);
  const [projects, ent] = await Promise.all([listProjectsForUser(user.id), getEntitlements(user.id)]);
  const usage = await getUsageSummary(user.id, ent);
  const showDevTools = features.devTools() && (process.env.NODE_ENV !== "production" || Boolean(profile?.isAdmin));
  const trialDaysLeft = ent.isTrial ? daysUntil(ent.trialEndsAt) : null;

  const navProjects = projects.map((p) => ({ id: p.id, name: p.name, isDemo: p.isDemo, score: p.latestScore }));
  const meter = (
    <UsageMeter used={usage.queriesUsed} limit={usage.queriesLimit} planName={ent.plan.name} isTrial={ent.isTrial} trialDaysLeft={trialDaysLeft} />
  );

  return (
    <UpgradeProvider>
      <div className="flex min-h-dvh">
        <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface/60 px-3 py-4 lg:flex">
          <Link href="/dashboard" className="px-2">
            <Logo />
          </Link>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AppNav projects={navProjects} showDevTools={showDevTools} />
          </div>
          {meter}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
            <MobileNav projects={navProjects} showDevTools={showDevTools} footer={meter} />
            <Link href="/dashboard" className="lg:hidden">
              <Logo compact />
            </Link>
            <div className="ml-auto flex items-center gap-1.5">
              {features.mockMode() && <SimulationBadge label="Simulation mode" className="hidden sm:inline-flex" />}
              {!ent.active && (
                <Link href="/billing" className="hidden rounded-md bg-danger-soft px-2 py-1 text-xs font-medium text-danger-text sm:inline">
                  Subscription inactive
                </Link>
              )}
              <ThemeToggle />
              <UserMenu name={profile?.fullName ?? user.fullName} email={user.email} />
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </UpgradeProvider>
  );
}
