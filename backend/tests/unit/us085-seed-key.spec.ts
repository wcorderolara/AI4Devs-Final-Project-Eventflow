// US-085 QA-001 — Unit: SeedKey determinismo (BR-SEED-001).
import { describe, expect, it } from 'vitest';
import { seedEmail, seedKey } from '../../src/modules/seed-demo/domain/seed-key.js';

describe('US-085 — SeedKey', () => {
  it('es determinista', () => {
    expect(seedKey('category', 'wedding')).toBe('category:wedding');
    expect(seedKey('category', 'wedding')).toBe(seedKey('category', 'wedding'));
  });

  it('rechaza componentes vacíos', () => {
    expect(() => seedKey('', 'x')).toThrow();
    expect(() => seedKey('d', '')).toThrow();
  });

  it('seedEmail es determinista y sin PII real', () => {
    expect(seedEmail('organizer', 0)).toBe('organizer0@seed.eventflow.test');
    expect(seedEmail('vendor', 3)).toContain('@seed.eventflow.test');
  });
});
