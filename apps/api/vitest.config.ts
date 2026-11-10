import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup-env.ts'],
    // e2e suites share one test database.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
