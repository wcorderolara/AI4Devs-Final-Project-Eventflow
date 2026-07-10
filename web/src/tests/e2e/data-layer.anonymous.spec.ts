import { expect, test } from '@playwright/test';

// AC-10 / TS-15: con /auth/me respondiendo 401, la sesión es anónima.
test('sesión anónima cuando /auth/me responde 401', async ({ page }) => {
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'No session' } }),
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('session-state')).toHaveText('anonymous');
});
