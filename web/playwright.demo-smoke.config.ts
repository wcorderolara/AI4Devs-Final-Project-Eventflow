import { defineConfig, devices } from '@playwright/test';

// US-146 · PB-P3-007 — Config dedicada del smoke contra la URL pública Demo (Amplify + App Runner).
//
// Diferencias deliberadas frente a `playwright.config.ts` (E2E mocked-localhost de US-128):
//   - SIN `webServer`: NO levanta Next.js local; el smoke corre contra el entorno YA desplegado
//     (AC-01: nunca localhost ni mocks de frontend).
//   - `baseURL` desde `DEMO_SMOKE_BASE_URL` (frontend Demo). Su validación (VR-01) y el precheck
//     `GET /health` (VR-04) viven en `global-setup.ts`.
//   - `globalTimeout` = 5 min (AC-04): la suite completa debe terminar dentro del presupuesto; si se
//     excede, Playwright aborta con fallo (evita un smoke lento que deje de ser útil pre-demo).
//   - Evidencia en fallo (AC-06): `screenshot`/`trace`/`video` con política `*-on-failure`.
//   - `testDir` aislado (`src/tests/demo-smoke`) → no interfiere con la E2E existente ni con Vitest.
const baseURL = process.env.DEMO_SMOKE_BASE_URL || undefined;

export default defineConfig({
  testDir: './src/tests/demo-smoke',
  testMatch: '**/*.spec.ts',
  globalSetup: './src/tests/demo-smoke/global-setup.ts',
  // AC-04: presupuesto de <5 min para toda la suite (300_000 ms). Timeout por test acotado.
  globalTimeout: 5 * 60 * 1000,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Un reintento en CI absorbe rebote de red del entorno público sin ocultar fallos reales.
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-demo-smoke' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
