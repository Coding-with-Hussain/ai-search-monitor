import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": root,
  // `server-only` throws outside the React Server Components environment.
  "server-only": path.resolve(root, "tests/support/empty.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/support/unit-setup.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/support/integration-setup.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // Tests share one database; run files sequentially.
          fileParallelism: false,
        },
      },
    ],
  },
});
