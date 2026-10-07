import { logger } from "@/lib/logger";
import { sleep } from "@/lib/utils";
import type { ProviderId } from "@/types/domain";

import { ProviderError, ProviderUnavailableError } from "./providers/types";

interface PostJsonOptions {
  provider: ProviderId;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

/**
 * POST JSON to a provider with a timeout and bounded retries on transient
 * failures (429 / 5xx / network). Auth failures surface as
 * ProviderUnavailableError so the scan can mark the provider unavailable and
 * continue. Error messages never include request headers (API keys).
 */
export async function postJson<T = unknown>({
  provider,
  url,
  headers,
  body,
  timeoutMs = 60_000,
  retries = 2,
  signal,
}: PostJsonOptions): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    attempt++;
    try {
      const timeout = AbortSignal.timeout(timeoutMs);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (res.ok) return (await res.json()) as T;

      const text = (await res.text()).slice(0, 500);
      if (res.status === 401 || res.status === 403) {
        throw new ProviderUnavailableError(provider, `Authentication failed (HTTP ${res.status}). Check the API key.`);
      }
      const retryable = res.status === 429 || res.status >= 500;
      throw new ProviderError(provider, `HTTP ${res.status}: ${text}`, { retryable, status: res.status });
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof ProviderError
          ? error.retryable
          : !(error instanceof DOMException && error.name === "AbortError" && signal?.aborted);
      if (!retryable || attempt > retries) break;
      const delay = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      logger.warn("provider.retry", { provider, attempt, delayMs: delay, error: (error as Error).message });
      await sleep(delay);
    }
  }
  if (lastError instanceof ProviderError) throw lastError;
  throw new ProviderError(provider, (lastError as Error)?.message ?? "Unknown provider error", { retryable: true });
}
