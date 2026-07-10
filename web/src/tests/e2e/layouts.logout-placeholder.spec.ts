import { expect, test } from '@playwright/test';

// AC-06/AC-09: click "Cerrar sesión" (placeholder) → redirige a /login (limpia cookie de rol UX).
test('logout placeholder redirige a /login', async ({ page, context }) => {
  await context.addCookies([
    { name: 'eventflow_session', value: 'test', url: 'http://localhost:3000' },
    { name: 'eventflow_role', value: 'organizer', url: 'http://localhost:3000' },
  ]);
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
        role: 'organizer',
        locale: 'en',
      }),
    }),
  );
  await page.goto('/organizer');

  await page.getByRole('button', { name: /Ana/ }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();

  await expect(page).toHaveURL(/\/login/);
});
