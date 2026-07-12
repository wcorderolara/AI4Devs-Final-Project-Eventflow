import { expect, test } from '@playwright/test';

// AC-10 / TS-15: con /users/me respondiendo 401, la sesión es anónima.
test('sesión anónima cuando /users/me responde 401', async ({ page }) => {
  await page.route('**/users/me', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'No session' } }),
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('session-state')).toHaveText('anonymous');
});
