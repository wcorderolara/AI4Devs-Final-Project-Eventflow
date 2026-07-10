import { defineConfig, devices } from '@playwright/test';

// US-103: un único proyecto chromium y un smoke sobre `/`. Matrices multi-browser → Future.
// US-125 (PB-P0-015): `baseURL` parametrizable por `E2E_BASE_URL` (EC-04) — nunca apunta a
// producción por defecto (SEC); artefactos retenidos solo en fallo para diagnóstico.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
