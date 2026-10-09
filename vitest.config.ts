import { defineConfig } from 'vitest/config';

const BROWSER_TEST_TIMEOUT_MS = process.env.CI ? 180_000 : 60_000;

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'lcov'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          globalSetup: ['test/e2e/global-setup.ts'],
          testTimeout: BROWSER_TEST_TIMEOUT_MS,
          hookTimeout: BROWSER_TEST_TIMEOUT_MS,
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'crash',
          include: ['test/crash/**/*.test.ts'],
          testTimeout: BROWSER_TEST_TIMEOUT_MS,
        },
      },
    ],
  },
});
