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
    exclude: ['**/node_modules/**', '**/build/**'],
  },
  // @ts-expect-error - projects is valid Vitest option
  projects: [
    {
      name: 'unit',
      test: {
        include: ['tests/unit/**/*.test.ts'],
        testTimeout: 10000,
        hookTimeout: 10000,
        teardownTimeout: 10000,
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/',
            'build/',
            'tests/',
            '*.config.ts',
            '*.config.js',
          ],
        },
      },
    },
    {
      name: 'integration',
      test: {
        include: ['tests/integration-*.test.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
        teardownTimeout: 10000,
      },
    },
    {
      name: 'e2e',
      test: {
        include: ['tests/e2e-*.test.ts'],
        testTimeout: 120000,
        hookTimeout: 30000,
        teardownTimeout: 10000,
        env: {
          LOG_LEVEL: 'error',
        },
      },
    },
  ],
});
