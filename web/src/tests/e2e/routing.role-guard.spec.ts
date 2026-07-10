import { expect, test } from '@playwright/test';

async function setSession(context: import('@playwright/test').BrowserContext, role: string) {
  await context.clearCookies();
  await context.addCookies([
    { name: 'eventflow_session', value: 'test', url: 'http://localhost:3000' },
    { name: 'eventflow_role', value: role, url: 'http://localhost:3000' },
  ]);
}

test('rol organizer en /admin → /403', async ({ page, context }) => {
  await setSession(context, 'organizer');
  await page.goto('/admin');
  expect(new URL(page.url()).pathname).toBe('/403');
});

test('rol admin en /admin → accesible (200)', async ({ page, context }) => {
  await setSession(context, 'admin');
  const response = await page.goto('/admin');
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/admin');
});

test('rol adulterado (superadmin) en /admin → /403 (EC-01)', async ({ page, context }) => {
  await setSession(context, 'superadmin');
  await page.goto('/admin');
  expect(new URL(page.url()).pathname).toBe('/403');
});
