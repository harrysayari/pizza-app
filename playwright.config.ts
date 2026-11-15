import { defineConfig, devices } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: 'webkit',
      use: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI && !process.env.E2E_PORT,
  },
});
