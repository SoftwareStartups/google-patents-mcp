import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
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
    test: {
      name: 'integration',
      include: ['tests/integration-*.test.ts'],
      testTimeout: 30000,
      hookTimeout: 30000,
      teardownTimeout: 10000,
    },
  },
  {
    test: {
      name: 'e2e',
      include: ['tests/e2e-*.test.ts'],
      testTimeout: 120000,
      hookTimeout: 30000,
      teardownTimeout: 10000,
      env: {
        LOG_LEVEL: 'error',
      },
    },
  },
]);

