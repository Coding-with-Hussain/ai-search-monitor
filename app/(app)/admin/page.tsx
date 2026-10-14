import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminTools } from "@/components/admin/admin-tools";
import { PageHeader } from "@/components/app/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/db/repositories/profiles";
import { listProjectsForUser } from "@/db/repositories/projects";
import { requireUser } from "@/lib/auth/session";
import { features, isProduction } from "@/lib/env";
import { PROVIDER_META } from "@/lib/providers-meta";
import { currentScanMode, providerStatuses } from "@/services/ai/providers/registry";

export const metadata: Metadata = { title: "Dev tools", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await requireUser("/admin");
  const profile = await getProfile(user.id);
  if (!features.devTools() || (isProduction() && !profile?.isAdmin)) notFound();

  const [projects, statuses] = await Promise.all([listProjectsForUser(user.id), Promise.resolve(providerStatuses())]);
  const flags: Array<[string, boolean]> = [
    ["Simulation mode", features.mockMode()],
    ["Supabase auth", features.supabase()],
    ["Database", features.database()],
    ["Stripe", features.stripe()],
    ["Stripe webhooks", features.stripeWebhooks()],
    ["Inngest", features.inngest()],
    ["Email (Resend)", features.email()],
    ["Service role key", features.serviceRole()],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Development tools" description="Trigger scans, inspect provider output, run the analyzer and test plan limits." />
      <Alert variant="warning" title="Development only">
        This page is never exposed in production unless ENABLE_DEV_TOOLS=true, and then only to admin users. Tools act on your own account
        and projects only (the scheduler processes all due scans).
      </Alert>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              New scans run in <strong className="text-foreground">{currentScanMode() === "mock" ? "simulation" : "live"}</strong> mode.
            </p>
            <ul className="divide-y divide-border text-sm">
              {statuses.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span>
                    {PROVIDER_META[s.id].name} <span className="text-xs text-subtle-foreground">{s.model}</span>
                  </span>
                  <Badge variant={s.configured ? "success" : "secondary"}>{s.configured ? "Configured" : "Not configured"}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {flags.map(([name, on]) => (
                <li key={name} className="flex items-center justify-between gap-3">
                  <span>{name}</span>
                  <Badge variant={on ? "success" : "secondary"}>{on ? "On" : "Off"}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <AdminTools
        projects={projects.map((p) => ({ id: p.id, name: p.name, isDemo: p.isDemo }))}
        liveProviders={statuses.filter((s) => s.configured).map((s) => s.id)}
        mockMode={features.mockMode()}
        canSetPlan={!isProduction()}
      />
    </div>
  );
}
