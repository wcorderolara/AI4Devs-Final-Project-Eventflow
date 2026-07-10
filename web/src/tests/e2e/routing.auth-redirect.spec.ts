import { expect, test } from '@playwright/test';

// AC-08: con sesión, /login redirige al dashboard del rol.
const roles: Array<{ role: string; dashboard: string }> = [
  { role: 'organizer', dashboard: '/organizer' },
  { role: 'vendor', dashboard: '/vendor' },
  { role: 'admin', dashboard: '/admin' },
];

for (const { role, dashboard } of roles) {
  test(`sesión ${role} en /login → ${dashboard}`, async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([
      { name: 'eventflow_session', value: 'test', url: 'http://localhost:3000' },
      { name: 'eventflow_role', value: role, url: 'http://localhost:3000' },
    ]);
    await page.goto('/login');
    expect(new URL(page.url()).pathname).toBe(dashboard);
  });
}
