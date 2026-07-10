import { expect, test } from '@playwright/test';

// AC-07/AC-09: en mobile la sidebar está oculta; la hamburguesa abre el drawer <MobileNav>.
test.use({ viewport: { width: 375, height: 700 } });

test('mobile: hamburguesa abre el drawer con los items', async ({ page, context }) => {
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

  // Drawer cerrado: no hay dialog.
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Open menu' }).click();

  // El panel del drawer (fixed) es visible con los items; el div externo role=dialog tiene
  // tamaño 0 (sus hijos son position:fixed), por eso se asserta el link del panel directamente.
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Events' })).toBeVisible();
});
