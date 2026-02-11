import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/seeds/**/*.test.ts', 'tests/integration/**/*.{test,spec}.ts', 'tests/integration/**/*.integration.test.ts'],
    deps: {
      inline: ['drizzle-zod', 'drizzle-orm', 'pg'],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
