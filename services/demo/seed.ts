import { eq } from "drizzle-orm";

import { db } from "@/db";
import type { AuthorizedProject } from "@/db/repositories/projects";
import { projects, scans } from "@/db/schema";
import { createProjectWithSetup } from "@/services/projects/service";
import { createScan, runScanToCompletion } from "@/services/scans/pipeline";

/**
 * Create the clearly-labelled "ABC Dental" demo project for a user, with a
 * weekly history of SIMULATED scans (mode = 'mock', trigger = 'seed').
 * Every scan runs through the real pipeline; only the AI answers are simulated.
 * Used by `npm run seed` and the development tools page.
 */
export async function seedDemoProject(options: {
  userId: string;
  name?: string;
  weeks?: number;
  onScan?: (info: { date: Date; score: number | null; status: string }) => void;
}): Promise<AuthorizedProject> {
  const { userId, weeks = 10 } = options;
  const project = await createProjectWithSetup(
    userId,
    {
      name: options.name ?? "ABC Dental",
      website: "https://abcdental.com",
      industry: "Dental Clinic",
      businessType: "local",
      country: "Pakistan",
      city: "Lahore",
      description: "Family and cosmetic dental clinic in Lahore.",
      services: ["Dental implants", "Braces", "Teeth whitening", "Root canal", "Dental checkups"],
      competitors: [
        { name: "XYZ Dental", website: "https://xyzdental.com" },
        { name: "Smile Clinic", website: "https://smileclinic.pk" },
        { name: "Dental Care Lahore", website: "https://dentalcarelahore.com" },
      ],
      monitoring: { generateQueries: true, frequency: "weekly", queryCount: 40, providers: ["chatgpt", "gemini", "perplexity"] },
      runFirstScan: false,
    },
    { isDemo: true, skipEntitlements: true },
  );

  // Gradually improving visibility so the history chart tells a story, while
  // a competitor stays ahead (so "See why" has something to explain).
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    const progress = weeks > 1 ? (weeks - 1 - i) / (weeks - 1) : 1;
    const strength = Math.round((0.3 + progress * 0.2 + (i % 3 === 0 ? -0.015 : 0.01)) * 100) / 100;
    const createdAt = new Date(now - i * 7 * 86_400_000 - 3_600_000);
    const [fresh] = await db().select().from(projects).where(eq(projects.id, project.id));
    const scan = await createScan({
      project: fresh as AuthorizedProject,
      userId,
      trigger: "seed",
      mode: "mock",
      mockStrength: strength,
      skipEntitlements: true,
      createdAt,
    });
    await runScanToCompletion(scan.id);
    const [done] = await db().select().from(scans).where(eq(scans.id, scan.id));
    options.onScan?.({ date: createdAt, score: done?.score ?? null, status: done?.status ?? "unknown" });
  }
  const [final] = await db().select().from(projects).where(eq(projects.id, project.id));
  return final as AuthorizedProject;
}
