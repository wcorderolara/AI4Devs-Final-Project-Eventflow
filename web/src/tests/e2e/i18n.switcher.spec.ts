import { expect, test } from '@playwright/test';

// AC-11 / AC-05: el switcher persiste la cookie y re-renderiza la página en el nuevo locale.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'eventflow_locale', value: 'es-LATAM', url: 'http://localhost:3000' },
  ]);
});

test('cambiar idioma vía switcher persiste cookie y re-renderiza', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('Bienvenido a EventFlow')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');

  await page.getByRole('combobox').selectOption('en');

  await expect(page.getByText('Welcome to EventFlow')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const cookies = await context.cookies();
  const localeCookie = cookies.find((c) => c.name === 'eventflow_locale');
  expect(localeCookie?.value).toBe('en');
});
