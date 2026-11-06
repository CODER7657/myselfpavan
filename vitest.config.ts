import { defineConfig } from "vitest/config";

/**
 * One runner for the grading logic and the pipeline tools.
 *
 * Threads rather than forks, and a single worker pool, because this machine has
 * 16 GB and no reason to spend it on a test run. Nothing here touches the
 * network: every test that would call GitHub or a homepage is handed a fake.
 */
export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts", "tools/test/**/*.test.{ts,mjs}"],
    environment: "node",
    pool: "threads",
    testTimeout: 10_000,
    restoreMocks: true,
  },
});
