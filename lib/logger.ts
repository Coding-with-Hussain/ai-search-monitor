/**
 * Minimal structured logger. Emits one JSON line per event so logs are easy to
 * search in Vercel / any log drain. Never pass secrets in `data`; keys that
 * look sensitive are redacted defensively.
 */

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE = /(key|secret|token|password|authorization|cookie)/i;

function threshold(): number {
  const level = (process.env.LOG_LEVEL as Level | undefined) ?? (process.env.NODE_ENV === "test" ? "warn" : "info");
  return order[level] ?? order.info;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  if (order[level] < threshold()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(redact(data ?? {}) as object) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => emit("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
