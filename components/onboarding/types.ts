import type { MonitoringFrequency, ProviderId } from "@/types/domain";

/** A monitoring frequency as offered by the wizard, with plan availability. */
export interface FrequencyOption {
  value: MonitoringFrequency;
  label: string;
  allowed: boolean;
  /** Name of the first plan that unlocks this frequency (when not allowed). */
  requiredPlan: string | null;
}

/** Server-computed configuration for the onboarding wizard (no secrets). */
export interface WizardConfig {
  planName: string;
  /** Competitors per project on the current plan. `null` = unlimited. */
  competitorLimit: number | null;
  frequencyOptions: FrequencyOption[];
  queriesPerMonth: number;
  remainingQueries: number;
  defaults: {
    frequency: MonitoringFrequency;
    queryCount: number;
    providers: ProviderId[];
  };
  mockMode: boolean;
  isFirstProject: boolean;
}

/** Returned by `createProjectAction`. */
export interface CreateProjectResult {
  projectId: string;
  scanStarted: boolean;
  scanId: string | null;
  /** User-facing note, e.g. why the first scan did not start or was limited. */
  note: string | null;
}
