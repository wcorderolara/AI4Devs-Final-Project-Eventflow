import { expect, test, type Page, type BrowserContext } from '@playwright/test';

// US-005 / QA-003 — E2E del logout real para los 3 roles (reemplaza layouts.logout-placeholder de
// US-107): click "Cerrar sesión" en el UserMenu → POST /auth/logout (204 + Set-Cookie de
// limpieza) → estado del cliente purgado → aterrizaje en /login (AC-01/AC-02).
test.use({ locale: 'es-419' });

function meEnvelope(role: 'organizer' | 'vendor' | 'admin') {
  return {
    data: {
      id: 'a1b2c3d4-0000-4000-8000-00000000000a',
      email: `${role}@eventflow.demo`,
      name: `Ana ${role}`,
      role,
      status: 'active',
      preferredLanguage: 'es-LATAM',
      phone: null,
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    },
    meta: { correlationId: 'req_e2e_me' },
  };
}

async function seedSession(context: BrowserContext, page: Page, role: 'organizer' | 'vendor' | 'admin'): Promise<void> {
  await context.addCookies([
    { name: 'eventflow_session', value: 'e2e-session', url: 'http://localhost:3000' },
    { name: 'eventflow_role', value: role, url: 'http://localhost:3000' },
  ]);
  await page.route('**/users/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(meEnvelope(role)) }),
  );
  await page.route('**/auth/logout', (route) =>
    route.fulfill({
      status: 204,
      // Limpieza de las cookies de sesión y de rol (equivalente a los Set-Cookie del backend real).
      headers: { 'set-cookie': 'eventflow_session=; Path=/; Max-Age=0\neventflow_role=; Path=/; Max-Age=0' },
    }),
  );
}

for (const role of ['organizer', 'vendor', 'admin'] as const) {
  test(`AC-01/AC-02: logout de ${role} → POST /auth/logout y aterriza en /login`, async ({ page, context }) => {
    await seedSession(context, page, role);
    await page.goto(`/${role}`);

    const logoutRequest = page.waitForRequest((req) => req.url().includes('/auth/logout') && req.method() === 'POST');
    // El clic puede llegar antes de que el menú esté interactivo (hidratación bajo carga): se
    // reintenta abrirlo hasta que aparezca la opción, en lugar de esperar un menú que nunca abre.
    const logoutItem = page.getByRole('menuitem', { name: 'Cerrar sesión' });
    await expect(async () => {
      await page.getByRole('button', { name: /Ana/ }).click();
      await expect(logoutItem).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await logoutItem.click();
    await logoutRequest;

    await expect(page).toHaveURL(/\/login/);
    // AC-03 (cliente): la cookie de sesión quedó limpiada.
    const cookies = await context.cookies('http://localhost:3000');
    expect(cookies.find((c) => c.name === 'eventflow_session')?.value ?? '').toBe('');
  });
}
