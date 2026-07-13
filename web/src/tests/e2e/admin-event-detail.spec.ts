// US-016 / QA-004 — E2E smoke del detalle admin de un evento (read-only + a11y).
//
// Precondiciones (fuera del control del spec):
// 1. Seed provisiona un usuario admin y al menos un evento `active` propiedad de un organizer.
// 2. Backend expone `GET /api/v1/admin/events/:id` (US-016) con la sesión admin válida.
// 3. Ambiente demo con `E2E_DEMO_READY=true` (misma política que US-015 / QA-002).
//
// En el CI base se salta este spec para evitar flakiness (misma política que US-015).
import { expect, test } from '@playwright/test';

const demoReady = process.env.E2E_DEMO_READY === 'true';
const eventId = process.env.E2E_DEMO_ADMIN_EVENT_ID ?? '';
const softDeletedEventId = process.env.E2E_DEMO_ADMIN_SOFT_DELETED_EVENT_ID ?? '';

test.describe('US-016 QA-004 — Detalle admin de evento (read-only)', () => {
  test.skip(!demoReady, 'Requiere E2E_DEMO_READY=true (admin demo + seed corrido)');

  test('AC-01/AC-03: admin abre el detalle de un evento activo y ve badge "Modo lectura"', async ({ page }) => {
    test.skip(!eventId, 'Requiere E2E_DEMO_ADMIN_EVENT_ID');
    await page.goto(`/admin/events/${eventId}`);

    // AC-03: badge "Modo lectura" presente.
    const badge = page.getByTestId('admin-event-read-only-badge');
    await expect(badge).toBeVisible();

    // Viewer visible.
    await expect(page.getByTestId('admin-event-viewer')).toBeVisible();

    // Inputs son read-only (`aria-readonly="true"`).
    const firstReadOnly = page.locator('input[readonly]').first();
    await expect(firstReadOnly).toHaveAttribute('aria-readonly', 'true');

    // No hay controles primarios de edición/cancelación (AC-03).
    await expect(page.getByRole('button', { name: /(editar|cancelar|eliminar|edit|cancel|delete)/i })).toHaveCount(0);
  });

  test('EC-01: admin lee evento soft-deleted y ve banner "Eliminado"', async ({ page }) => {
    test.skip(!softDeletedEventId, 'Requiere E2E_DEMO_ADMIN_SOFT_DELETED_EVENT_ID');
    await page.goto(`/admin/events/${softDeletedEventId}`);

    const banner = page.getByTestId('admin-event-deleted-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('role', 'status');
    await expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
