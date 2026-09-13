import { defineConfig, devices } from '@playwright/test';

/**
 * ReWorth Playwright config — golden paths under e2e/web/.
 * Specs skip when API healthz is not 200 (default CI stays green).
 * Force run with API up: pnpm test:e2e
 * Optional: E2E=1 in CI after seeding staging + starting API.
 */
export default defineConfig({
  testDir: './e2e/web',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
