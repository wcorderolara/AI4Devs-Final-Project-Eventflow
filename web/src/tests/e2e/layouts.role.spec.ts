import { type BrowserContext, expect, type Page, test } from '@playwright/test';

async function authAs(context: BrowserContext, role: string) {
  await context.addCookies([
    { name: 'eventflow_session', value: 'test', url: 'http://localhost:3000' },
    { name: 'eventflow_role', value: role, url: 'http://localhost:3000' },
  ]);
}

async function mockMe(page: Page, role: string) {
  await page.route('**/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'u1', email: 'a@b.com', name: 'Ana', role, status: 'active', preferredLanguage: 'en', phone: null, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z' },
        meta: { correlationId: 'req_e2e_me' },
      }),
    }),
  );
}

test('organizer layout: sidebar Events/Notifications/Profile', async ({ page, context }) => {
  await authAs(context, 'organizer');
  await mockMe(page, 'organizer');
  await page.goto('/organizer');
  await expect(page.getByRole('link', { name: 'Events' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
});

test('vendor layout: sidebar Dashboard/Portfolio/Quotes/Reviews', async ({ page, context }) => {
  await authAs(context, 'vendor');
  await mockMe(page, 'vendor');
  await page.goto('/vendor');
  await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quotes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reviews' })).toBeVisible();
});

test('admin layout: sidebar Vendor approval/Users', async ({ page, context }) => {
  await authAs(context, 'admin');
  await mockMe(page, 'admin');
  await page.goto('/admin');
  await expect(page.getByRole('link', { name: 'Vendor approval' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
});
