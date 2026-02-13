import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest config for server-side unit & integration tests.
 * Separate from the React/jsdom config in vitest.config.ts.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/env.test.ts"],
    include: [
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}",
    ],
    testTimeout: 30000,
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
