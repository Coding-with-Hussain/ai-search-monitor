import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

for (const file of [".env.test.local", ".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) config({ path: full, quiet: true });
}

process.env.AI_VISIBILITY_MOCK_MODE = "true";
process.env.MOCK_LATENCY_MS = "0";
process.env.SCAN_CONCURRENCY = "4";
// Integration tests must never spend money: no live AI provider calls, even
// when a developer's .env.local holds real keys.
for (const key of ["OPENAI_API_KEY", "GOOGLE_AI_API_KEY", "PERPLEXITY_API_KEY", "RESEND_API_KEY", "STRIPE_SECRET_KEY"]) {
  process.env[key] = "";
}
