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
