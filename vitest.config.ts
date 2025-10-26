/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    exclude: ['**/node_modules/**', '**/build/**'],
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
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          testTimeout: 10000,
          hookTimeout: 10000,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration-*.test.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e-*.test.ts'],
          testTimeout: 120000,
          hookTimeout: 30000,
          env: {
            LOG_LEVEL: 'error',
          },
        },
      },
    ],
  },
});
