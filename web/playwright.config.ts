import { defineConfig, devices } from '@playwright/test';

// US-103: un único proyecto chromium y un smoke sobre `/`. Matrices multi-browser → Future.
// US-125 (PB-P0-015): `baseURL` parametrizable por `E2E_BASE_URL` (EC-04) — nunca apunta a
// producción por defecto (SEC); artefactos retenidos solo en fallo para diagnóstico.
// US-128 (PB-P2-016 · OPS-001): `retries` acotados en CI (1) y ninguno en local para no
// enmascarar flakiness durante desarrollo; reporter `list` + `html` (US-128 · AC-03/VR-04)
// con `open: 'never'` para ejecución headless. Los artefactos trace/screenshot/video ya
// están en `use.*` con política `only-on-failure`/`retain-on-failure`.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
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
