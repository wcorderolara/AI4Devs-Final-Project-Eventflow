// @vitest-environment node
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';

describe('sitemap.ts', () => {
  const entries = sitemap();
  const urls = entries.map((entry) => new URL(entry.url).pathname);

  it('incluye al menos / y /vendors (VR-09)', () => {
    expect(urls).toContain('/');
    expect(urls).toContain('/vendors');
  });

  it('cada entry tiene url absoluta válida', () => {
    for (const entry of entries) {
      expect(() => new URL(entry.url)).not.toThrow();
    }
  });
});
