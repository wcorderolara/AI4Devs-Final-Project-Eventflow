import { expect, test } from '@playwright/test';

// AC-04 / VR-08 / VR-09: robots.txt con Disallow de áreas privadas; sitemap.xml válido.
test('robots.txt declara Disallow para áreas privadas', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  for (const path of ['/login', '/register', '/forgot-password', '/organizer', '/vendor', '/admin', '/403']) {
    expect(body).toContain(`Disallow: ${path}`);
  }
  expect(body).toContain('Sitemap:');
});

test('sitemap.xml es válido y contiene / y /vendors', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('<urlset');
  expect(body).toContain('/vendors');
  expect(body).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
});
