import { expect, test, type Page } from '@playwright/test';

// US-008 (PB-P4-001 / QA-002, TS-04) — E2E del flujo OAuth Google con backend interceptado
// (patrón del repo: `page.route`). Cubre: presencia/accesibilidad del botón en /login, login
// server-driven exitoso (AC-01) y aviso neutro de cancelación (EC-02). El flujo real usa el
// MockOAuthProvider del backend; aquí se simula la redirección server-driven a nivel de red.
test.use({ locale: 'es-419' });

function organizerEnvelope() {
  return {
    data: {
      id: 'a1b2c3d4-0000-4000-8000-000000000009',
      email: 'demo.google@eventflow.demo',
      name: 'Demo Google',
      role: 'organizer',
      status: 'active',
      preferredLanguage: 'es-LATAM',
      phone: null,
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    },
    meta: { correlationId: 'req_e2e_google' },
  };
}

async function mockMe(page: Page): Promise<void> {
  await page.route('**/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(organizerEnvelope()),
    }),
  );
}

test('AC-01: el botón "Continuar con Google" inicia el flujo y loguea (server-driven)', async ({ page }) => {
  // El inicio del flujo (GET /api/v1/auth/google) es una navegación top-level: se intercepta y se
  // simula la redirección server-driven final al dashboard del rol, emitiendo cookies de sesión.
  await page.route('**/api/v1/auth/google', (route) =>
    route.fulfill({
      status: 302,
      headers: {
        location: '/organizer',
        'set-cookie': ['eventflow_session=e2e-google; Path=/', 'eventflow_role=organizer; Path=/'].join('\n'),
      },
    }),
  );
  await mockMe(page);

  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Continuar con Google' });
  await expect(button).toBeVisible();
  await button.click();

  await page.waitForURL('**/organizer');
  expect(new URL(page.url()).pathname).toBe('/organizer');
});

test('EC-02: cancelación del consentimiento muestra aviso neutro en /login', async ({ page }) => {
  await mockMe(page);
  await page.goto('/login?oauth=cancelled');
  await expect(
    page.getByText('No fue posible iniciar sesión con Google', { exact: false }),
  ).toBeVisible();
});

test('a11y: el botón de Google tiene un nombre accesible y es enfocable por teclado', async ({ page }) => {
  await mockMe(page);
  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Continuar con Google' });
  await expect(button).toBeVisible();
  await button.focus();
  await expect(button).toBeFocused();
});
