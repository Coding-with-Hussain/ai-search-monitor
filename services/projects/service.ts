import { and, count, eq, inArray } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import { updateProfile } from "@/db/repositories/profiles";
import {
  type AuthorizedProject,
  computeNextScanAt,
  listCompetitors,
  toBusinessContext,
} from "@/db/repositories/projects";
import { insertQueries, listQueryTexts } from "@/db/repositories/queries";
import { competitors, projects } from "@/db/schema";
import { assertCanAddCompetitors, assertCanCreateProject, getEntitlements } from "@/lib/billing/entitlements";
import { getPlan } from "@/lib/billing/plans";
import { extractDomain, normalizeWebsite } from "@/lib/domain";
import { conflict, planLimitError, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { competitorInputSchema, createProjectSchema, updateProjectSchema } from "@/schemas/project";
import { generateQueries } from "@/services/queries/generator";
import type { MonitoringFrequency } from "@/types/domain";

type CreateProjectData = z.output<typeof createProjectSchema>;
type UpdateProjectData = z.output<typeof updateProjectSchema>;
type CompetitorInput = z.output<typeof competitorInputSchema>;

function assertFrequencyAllowed(planId: string, frequency: MonitoringFrequency) {
  const plan = getPlan(planId);
  if (!plan.limits.monitoringFrequencies.includes(frequency)) {
    throw planLimitError(`${frequency[0].toUpperCase()}${frequency.slice(1)} monitoring is available on Pro and Agency plans.`, {
      limit: "frequency",
      used: 0,
      max: 0,
      plan: plan.id,
    });
  }
}

export async function createProjectWithSetup(
  userId: string,
  data: CreateProjectData,
  opts: { isDemo?: boolean; skipEntitlements?: boolean } = {},
): Promise<AuthorizedProject> {
  if (!opts.skipEntitlements) {
    const ent = await assertCanCreateProject(userId);
    const max = ent.plan.limits.competitorsPerProject;
    if (max !== null && data.competitors.length > max) {
      throw planLimitError(`Your ${ent.plan.name} plan allows ${max} competitors per project. Remove some or upgrade.`, {
        limit: "competitors",
        used: data.competitors.length,
        max,
        plan: ent.plan.id,
      });
    }
    assertFrequencyAllowed(ent.plan.id, data.monitoring.frequency);
  }

  const website = normalizeWebsite(data.website);
  const uniqueCompetitors = dedupeCompetitors(data.competitors);

  const project = await db().transaction(async (tx) => {
    const [created] = await tx
      .insert(projects)
      .values({
        userId,
        name: data.name,
        website,
        domain: extractDomain(website),
        industry: data.industry,
        businessType: data.businessType,
        country: data.country ?? null,
        city: data.city ?? null,
        description: data.description ?? null,
        services: data.services,
        providers: data.monitoring.providers,
        monitoringFrequency: data.monitoring.frequency,
        monitoringEnabled: data.monitoring.frequency !== "manual",
        nextScanAt: computeNextScanAt(data.monitoring.frequency),
        isDemo: opts.isDemo ?? false,
      })
      .returning();

    if (uniqueCompetitors.length) {
      await tx.insert(competitors).values(
        uniqueCompetitors.map((c) => {
          const site = normalizeWebsite(c.website);
          return { projectId: created.id, name: c.name, website: site, domain: extractDomain(site) };
        }),
      );
    }
    return created as AuthorizedProject;
  });

  if (data.monitoring.generateQueries) {
    const generated = generateQueries({
      business: toBusinessContext(project),
      competitors: uniqueCompetitors.map((c) => c.name),
      count: data.monitoring.queryCount,
    });
    await insertQueries(project, generated);
  }

  await updateProfile(userId, { onboardingCompletedAt: new Date() });
  logger.info("project.created", { projectId: project.id, userId, competitors: uniqueCompetitors.length });
  return project;
}

function dedupeCompetitors(list: CompetitorInput[]) {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function updateProjectSettings(userId: string, project: AuthorizedProject, data: UpdateProjectData) {
  const ent = await getEntitlements(userId);
  if (data.monitoringFrequency !== project.monitoringFrequency) assertFrequencyAllowed(ent.plan.id, data.monitoringFrequency);
  const website = normalizeWebsite(data.website);
  const frequencyChanged = data.monitoringFrequency !== project.monitoringFrequency || data.monitoringEnabled !== project.monitoringEnabled;
  await db()
    .update(projects)
    .set({
      name: data.name,
      website,
      domain: extractDomain(website),
      industry: data.industry,
      businessType: data.businessType,
      country: data.country ?? null,
      city: data.city ?? null,
      description: data.description ?? null,
      services: data.services,
      aliases: data.aliases,
      providers: data.providers,
      monitoringFrequency: data.monitoringFrequency,
      monitoringEnabled: data.monitoringEnabled && data.monitoringFrequency !== "manual",
      ...(frequencyChanged
        ? {
            nextScanAt:
              data.monitoringEnabled && data.monitoringFrequency !== "manual"
                ? computeNextScanAt(data.monitoringFrequency, project.lastScanAt ?? new Date())
                : null,
          }
        : {}),
    })
    .where(eq(projects.id, project.id));
}

export async function addCompetitor(userId: string, project: AuthorizedProject, input: CompetitorInput) {
  await assertCanAddCompetitors(userId, project.id, 1);
  const existing = await listCompetitors(project);
  if (existing.some((c) => c.name.toLowerCase() === input.name.trim().toLowerCase())) {
    throw conflict(`${input.name} is already being tracked.`);
  }
  if (input.name.trim().toLowerCase() === project.name.toLowerCase()) {
    throw validationError("A competitor can't have the same name as your business.");
  }
  const site = normalizeWebsite(input.website);
  const [row] = await db()
    .insert(competitors)
    .values({ projectId: project.id, name: input.name.trim(), website: site, domain: extractDomain(site) })
    .returning();
  return row;
}

export async function removeCompetitor(project: AuthorizedProject, competitorId: string) {
  await db().delete(competitors).where(and(eq(competitors.projectId, project.id), eq(competitors.id, competitorId)));
}

export async function competitorCount(project: AuthorizedProject) {
  const [row] = await db().select({ n: count() }).from(competitors).where(eq(competitors.projectId, project.id));
  return Number(row?.n ?? 0);
}

/** Generate more questions for an existing project (skips duplicates). */
export async function regenerateQueries(project: AuthorizedProject, howMany: number) {
  const [existingTexts, comps] = await Promise.all([listQueryTexts(project), listCompetitors(project)]);
  const generated = generateQueries({
    business: toBusinessContext(project),
    competitors: comps.map((c) => c.name),
    count: howMany,
    existing: existingTexts,
  });
  const inserted = await insertQueries(project, generated);
  return inserted.length;
}

export async function deleteProject(userId: string, project: AuthorizedProject) {
  // Only the owner may delete (organization members cannot).
  await db().delete(projects).where(and(eq(projects.id, project.id), eq(projects.userId, userId)));
  logger.info("project.deleted", { projectId: project.id, userId });
}

export async function deleteProjects(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  await db().delete(projects).where(and(eq(projects.userId, userId), inArray(projects.id, ids)));
}
