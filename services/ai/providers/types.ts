import type { BusinessContext, Citation, CompetitorContext, ProviderId } from "@/types/domain";

export interface ProviderQueryInput {
  /** The buyer question, sent to the provider exactly as a customer would ask it. */
  query: string;
  /** Context about the monitored business. Real providers never send this upstream. */
  businessContext?: BusinessContext;
  competitors?: CompetitorContext[];
  /** Deterministic seed (mock provider only). */
  seed?: string;
  /** 0..1 visibility bias (mock provider only; used for demo history). */
  mockStrength?: number;
  signal?: AbortSignal;
}

/** Normalized result every provider returns. */
export interface ProviderResult {
  provider: ProviderId;
  query: string;
  response: string;
  citations: Citation[];
  model: string;
  timestamp: string;
  latencyMs: number;
  usage: { inputTokens: number | null; outputTokens: number | null };
  estimatedCostUsd: number;
  isMock: boolean;
  /** Provider payload (trimmed). Stored server-side only. */
  raw?: unknown;
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly model: string;
  readonly isMock: boolean;
  isConfigured(): boolean;
  runQuery(input: ProviderQueryInput): Promise<ProviderResult>;
}

export class ProviderError extends Error {
  readonly provider: ProviderId;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(provider: ProviderId, message: string, options: { retryable?: boolean; status?: number } = {}) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

/** Provider is not configured (missing key) or rejected our credentials. */
export class ProviderUnavailableError extends ProviderError {
  constructor(provider: ProviderId, message: string) {
    super(provider, message, { retryable: false });
    this.name = "ProviderUnavailableError";
  }
}
