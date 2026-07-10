import { expect, test } from '@playwright/test';

// AC-06: anonymous es redirigido de (app) y (admin) a /login?from=<encoded>.
const cases: Array<{ path: string; from: string }> = [
  { path: '/organizer', from: '%2Forganizer' },
  { path: '/organizer/events', from: '%2Forganizer%2Fevents' },
  { path: '/vendor', from: '%2Fvendor' },
  { path: '/admin', from: '%2Fadmin' },
  { path: '/admin/vendors', from: '%2Fadmin%2Fvendors' },
];

for (const { path, from } of cases) {
  test(`anonymous en ${path} → /login?from=${from}`, async ({ page }) => {
    await page.goto(path);
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.search).toBe(`?from=${from}`);
  });
}
