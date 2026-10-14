"use client";

import Link from "next/link";
import { useState } from "react";

import {
  adminGenerateQueriesAction,
  adminInspectProviderAction,
  adminRecalculateAction,
  adminRunAnalysisAction,
  adminRunSchedulerAction,
  adminSeedDemoAction,
  adminSetPlanAction,
  adminTriggerScanAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { PLAN_IDS, PLANS } from "@/lib/billing/plans";
import { PROVIDER_META } from "@/lib/providers-meta";
import { PROVIDER_IDS, type ProviderId } from "@/types/domain";

import { JsonBlock, ToolCard } from "./tool-card";

export interface AdminProject {
  id: string;
  name: string;
  isDemo: boolean;
}

export function AdminTools({
  projects,
  liveProviders,
  mockMode,
  canSetPlan,
}: {
  projects: AdminProject[];
  liveProviders: ProviderId[];
  mockMode: boolean;
  canSetPlan: boolean;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [output, setOutput] = useState<Record<string, unknown>>({});
  const show = (key: string) => (data: unknown) => setOutput((o) => ({ ...o, [key]: data }));

  const scan = useServerAction(adminTriggerScanAction, { successMessage: "Scan started", onSuccess: show("scan") });
  const generate = useServerAction(adminGenerateQueriesAction, { onSuccess: show("generate") });
  const seed = useServerAction(adminSeedDemoAction, { successMessage: "Demo project created", onSuccess: show("seed") });
  const inspect = useServerAction(adminInspectProviderAction, { onSuccess: show("inspect") });
  const analysis = useServerAction(adminRunAnalysisAction, { onSuccess: show("analysis") });
  const recalc = useServerAction(adminRecalculateAction, { onSuccess: show("recalc") });
  const plan = useServerAction(adminSetPlanAction, { successMessage: "Plan updated", onSuccess: show("plan") });
  const scheduler = useServerAction(adminRunSchedulerAction, { onSuccess: show("scheduler") });

  const [simulate, setSimulate] = useState(true);
  const [count, setCount] = useState(5);
  const [provider, setProvider] = useState<ProviderId>("chatgpt");
  const [inspectMode, setInspectMode] = useState<"mock" | "live">("mock");
  const [query, setQuery] = useState("What is the best dental clinic in Lahore?");
  const [response, setResponse] = useState("1. **XYZ Dental** — popular for implants.\n2. **ABC Dental** — highly rated and affordable.");
  const [businessName, setBusinessName] = useState("ABC Dental");
  const [businessDomain, setBusinessDomain] = useState("abcdental.com");
  const [competitors, setCompetitors] = useState("XYZ Dental\nSmile Clinic");
  const [useLlm, setUseLlm] = useState(false);
  const [planId, setPlanId] = useState<(typeof PLAN_IDS)[number]>("growth");
  const [status, setStatus] = useState<"trialing" | "active" | "canceled">("active");
  const [trialDays, setTrialDays] = useState(14);

  const noProject = !projectId;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 sm:max-w-md">
        <Label htmlFor="admin-project">Project</Label>
        <NativeSelect id="admin-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={projects.length === 0}>
          {projects.length === 0 && <option value="">No projects — seed a demo project below</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.isDemo ? " (demo)" : ""}
            </option>
          ))}
        </NativeSelect>
        {projectId && (
          <Link href={`/projects/${projectId}`} className="text-xs text-primary hover:underline">
            Open project
          </Link>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ToolCard title="Trigger scan" description="Create a scan for the selected project and process it in the background.">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={simulate || mockMode} onCheckedChange={setSimulate} disabled={mockMode} aria-label="Simulate AI answers" />
            Simulated answers {mockMode && <span className="text-xs text-muted-foreground">(simulation mode is on)</span>}
          </label>
          <Button onClick={() => scan.execute({ projectId, simulate: simulate || mockMode })} loading={scan.pending} disabled={noProject}>
            Run scan
          </Button>
          <JsonBlock value={output.scan} />
        </ToolCard>

        <ToolCard title="Generate queries" description="Add more de-duplicated buyer questions to the selected project.">
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-count">How many</Label>
              <Input id="admin-count" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24" />
            </div>
            <Button onClick={() => generate.execute({ projectId, count })} loading={generate.pending} disabled={noProject}>
              Generate
            </Button>
          </div>
          <JsonBlock value={output.generate} />
        </ToolCard>

        <ToolCard title="Seed demo data" description="Create an “ABC Dental (Demo)” project for your account with 6 weeks of simulated scans.">
          <Button variant="outline" onClick={() => seed.execute()} loading={seed.pending}>
            Seed demo project
          </Button>
          <JsonBlock value={output.seed} />
        </ToolCard>

        <ToolCard title="Recalculate score" description="Re-score the latest completed scan from stored analysis (no provider calls).">
          <Button variant="outline" onClick={() => recalc.execute({ projectId })} loading={recalc.pending} disabled={noProject}>
            Recalculate
          </Button>
          <JsonBlock value={output.recalc} />
        </ToolCard>

        <ToolCard title="Inspect provider result" description="Run one question against a provider and view the normalized result.">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-provider">Provider</Label>
              <NativeSelect id="admin-provider" value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
                {PROVIDER_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PROVIDER_META[id].name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-mode">Mode</Label>
              <NativeSelect id="admin-mode" value={inspectMode} onChange={(e) => setInspectMode(e.target.value as "mock" | "live")}>
                <option value="mock">Simulated</option>
                <option value="live" disabled={!liveProviders.includes(provider)}>
                  Live {liveProviders.includes(provider) ? "" : "(not configured)"}
                </option>
              </NativeSelect>
            </div>
          </div>
          <Label htmlFor="admin-query">Question</Label>
          <Input id="admin-query" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button
            onClick={() => inspect.execute({ projectId: projectId || undefined, provider, mode: inspectMode, query })}
            loading={inspect.pending}
          >
            Run query
          </Button>
          <JsonBlock value={output.inspect} />
        </ToolCard>

        <ToolCard title="Run analysis" description="Paste an AI answer and see what the analyzer extracts.">
          <Label htmlFor="admin-response">AI answer</Label>
          <Textarea id="admin-response" rows={5} value={response} onChange={(e) => setResponse(e.target.value)} />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-bname">Business name</Label>
              <Input id="admin-bname" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-bdomain">Business domain</Label>
              <Input id="admin-bdomain" value={businessDomain} onChange={(e) => setBusinessDomain(e.target.value)} />
            </div>
          </div>
          <Label htmlFor="admin-competitors">Competitors (one per line)</Label>
          <Textarea id="admin-competitors" rows={3} value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={useLlm} onCheckedChange={setUseLlm} disabled={mockMode} aria-label="Also run LLM analysis" />
            Also run AI-assisted analysis {mockMode && <span className="text-xs text-muted-foreground">(off in simulation mode)</span>}
          </label>
          <Button
            onClick={() =>
              analysis.execute({
                response,
                businessName,
                businessDomain,
                competitors: competitors.split("\n").map((s) => s.trim()).filter(Boolean),
                useLlm,
              })
            }
            loading={analysis.pending}
          >
            Analyze
          </Button>
          <JsonBlock value={output.analysis} />
        </ToolCard>

        <ToolCard title="Set my plan" description="Switch your own subscription to test limits and gated features (development only).">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-plan">Plan</Label>
              <NativeSelect id="admin-plan" value={planId} onChange={(e) => setPlanId(e.target.value as (typeof PLAN_IDS)[number])}>
                {PLAN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PLANS[id].name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-status">Status</Label>
              <NativeSelect id="admin-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="canceled">Canceled</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-trial">Trial days left</Label>
              <Input id="admin-trial" type="number" min={-30} max={60} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} disabled={status !== "trialing"} />
            </div>
          </div>
          <Button variant="outline" onClick={() => plan.execute({ plan: planId, status, trialDays })} loading={plan.pending} disabled={!canSetPlan}>
            Apply
          </Button>
          <JsonBlock value={output.plan} />
        </ToolCard>

        <ToolCard title="Run scheduler now" description="Create scans for due projects and resume queued or stalled scans (all users).">
          <Button variant="outline" onClick={() => scheduler.execute()} loading={scheduler.pending}>
            Run scheduler
          </Button>
          <JsonBlock value={output.scheduler} />
        </ToolCard>
      </div>
    </div>
  );
}
