// US-015 / QA-002 — E2E smoke del badge "Completed" en dashboard con cambio de locale.
//
// Precondiciones (fuera del control del spec):
// 1. El seed de US-087 provisiona un evento `active` con `event_date = today - 3 días` (SEED-001).
// 2. El backend expone la sesión demo (login determinista o autoridad de demo).
// 3. `JOBS_ENABLED=true` en la réplica principal y el job ha corrido al menos una vez, o el
//    seed generó un evento ya `completed` con `auto_completed=true` (US-087 lo garantiza).
//
// Estas precondiciones son operativas del entorno demo; en el CI base este spec se salta con
// `test.skip` a menos que `E2E_DEMO_READY=true` lo habilite. La razón: el suite base sólo
// levanta `web` (sin backend real y sin seed), y una prueba condicional que dependa de
// backend real sería flaky (US-125 política).
import { expect, test } from '@playwright/test';

const LOCALES = [
  { locale: 'es-LATAM', completedLabel: 'Completado' },
  { locale: 'es-ES', completedLabel: 'Completado' },
  { locale: 'pt', completedLabel: 'Concluído' },
  { locale: 'en', completedLabel: 'Completed' },
] as const;

const demoReady = process.env.E2E_DEMO_READY === 'true';

test.describe('US-015 QA-002 — Badge Completed en dashboard demo', () => {
  test.skip(!demoReady, 'Requiere E2E_DEMO_READY=true (backend demo + seed corrido)');

  for (const { locale, completedLabel } of LOCALES) {
    test(`AC-06: badge "Completed" visible en ${locale}`, async ({ page, context }) => {
      await context.addCookies([{ name: 'eventflow_locale', value: locale, url: page.url() || 'http://localhost:3000' }]);
      await page.goto('/organizer/events');
      // El dashboard lista eventos con el `EventStatusBadge`. Al menos uno debe mostrarse
      // como "Completed" traducido al locale actual.
      const badge = page.getByRole('status', { name: new RegExp(completedLabel, 'i') });
      await expect(badge.first()).toBeVisible();
    });
  }
});
