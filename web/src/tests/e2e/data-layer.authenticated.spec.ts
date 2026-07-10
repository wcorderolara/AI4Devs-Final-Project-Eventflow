import { expect, test } from '@playwright/test';

// AC-10 / TS-16: con /auth/me respondiendo 200, la sesión expone user y role.
test('sesión autenticada cuando /auth/me responde 200', async ({ page }) => {
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
        role: 'organizer',
        locale: 'es-LATAM',
      }),
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('session-state')).toHaveText('authenticated');
  await expect(page.getByTestId('session-role')).toHaveText('organizer');
});
