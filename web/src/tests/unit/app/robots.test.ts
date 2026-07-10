// @vitest-environment node
import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('robots.ts', () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

  it('permite / y expone sitemap', () => {
    expect(rules?.allow).toContain('/');
    expect(result.sitemap).toContain('/sitemap.xml');
  });

  it('declara Disallow para todas las áreas privadas (VR-08)', () => {
    const disallow = rules?.disallow as string[];
    for (const path of ['/login', '/register', '/forgot-password', '/organizer', '/vendor', '/admin', '/403']) {
      expect(disallow).toContain(path);
    }
  });
});
