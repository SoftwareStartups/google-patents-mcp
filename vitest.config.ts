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
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e-real-api.test.ts'],
  },
});
