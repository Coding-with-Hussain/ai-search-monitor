import { and, asc, desc, eq, exists, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { notFound } from "@/lib/errors";
import type { BusinessContext, CompetitorContext } from "@/types/domain";

import { db } from "../index";
import { competitors, organizationMembers, type Project, projects } from "../schema";

declare const authorized: unique symbol;

/**
 * A project whose access has been verified for the current user. Child
 * repositories (competitors, queries, scans…) only accept this type, so a
 * browser-supplied projectId can never be used without an ownership check.
 */
export type AuthorizedProject = Project & { readonly [authorized]: true };

const uuid = z.uuid();

function accessCondition(userId: string) {
  return or(
    eq(projects.userId, userId),
    and(
      isNotNull(projects.organizationId),
      exists(
        db()
          .select({ one: sql`1` })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.organizationId, projects.organizationId), eq(organizationMembers.userId, userId))),
      ),
    ),
  );
}

/** Load a project the user may access, or throw NOT_FOUND (never reveal existence). */
export async function getProjectForUser(userId: string, projectId: string): Promise<AuthorizedProject> {
  if (!uuid.safeParse(projectId).success) throw notFound("Project not found.");
  const rows = await db()
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), accessCondition(userId)))
    .limit(1);
  if (!rows[0]) throw notFound("Project not found.");
  return rows[0] as AuthorizedProject;
}

export async function listProjectsForUser(userId: string) {
  return db().select().from(projects).where(accessCondition(userId)).orderBy(desc(projects.createdAt));
}

/** Trusted server contexts only (scan workers, cron) — no user scoping. */
export async function getProjectInternal(projectId: string): Promise<AuthorizedProject | null> {
  const rows = await db().select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return (rows[0] as AuthorizedProject | undefined) ?? null;
}

export async function listCompetitors(project: AuthorizedProject) {
  return db().select().from(competitors).where(eq(competitors.projectId, project.id)).orderBy(asc(competitors.createdAt));
}

export function toBusinessContext(project: Project): BusinessContext {
  return {
    name: project.name,
    website: project.website,
    domain: project.domain,
    industry: project.industry,
    businessType: project.businessType,
    city: project.city,
    country: project.country,
    services: project.services,
    aliases: project.aliases,
    description: project.description,
  };
}

export function toCompetitorContexts(rows: Array<typeof competitors.$inferSelect>): CompetitorContext[] {
  return rows.map((c) => ({ id: c.id, name: c.name, domain: c.domain, aliases: c.aliases }));
}

export function computeNextScanAt(frequency: Project["monitoringFrequency"], from = new Date()): Date | null {
  const day = 86_400_000;
  switch (frequency) {
    case "daily":
      return new Date(from.getTime() + day);
    case "weekly":
      return new Date(from.getTime() + 7 * day);
    case "monthly":
      return new Date(from.getTime() + 30 * day);
    default:
      return null;
  }
}
