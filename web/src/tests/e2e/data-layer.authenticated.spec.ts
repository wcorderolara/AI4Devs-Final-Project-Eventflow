import { expect, test } from '@playwright/test';

// AC-10 / TS-16: con /users/me respondiendo 200, la sesión expone user y role.
test('sesión autenticada cuando /users/me responde 200', async ({ page, context, baseURL }) => {
  // El backend emite `eventflow_role` junto con la cookie de sesión; sin ella el cliente no consulta
  // `/users/me` (visitante anónimo).
  await context.addCookies([{ name: 'eventflow_role', value: 'organizer', url: baseURL ?? 'http://localhost:3000' }]);
  await page.route('**/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'u1', email: 'a@b.com', name: 'Ana', role: 'organizer', status: 'active', preferredLanguage: 'es-LATAM', phone: null, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z' },
        meta: { correlationId: 'req_e2e_me' },
      }),
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('session-state')).toHaveText('authenticated');
  await expect(page.getByTestId('session-role')).toHaveText('organizer');
});
