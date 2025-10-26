import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    testTimeout: 120000, // 2 minutes for real API calls
    hookTimeout: 30000,
    teardownTimeout: 10000,
    include: ['tests/e2e-real-api.test.ts'],
    env: {
      LOG_LEVEL: 'error', // Suppress logs during e2e tests
    },
  },
});

