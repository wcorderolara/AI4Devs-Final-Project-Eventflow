// US-040 (PB-P1-024 / QA-001) — Unit tests del helper slug.
// AC-03 / D5: slug se deriva de business_name con normalización NFD, minúsculas, sin caracteres
// no permitidos; los conflictos se resuelven con sufijo numérico incremental.
import { describe, it, expect } from 'vitest';
import { pickNextSlug, slugify } from '../../src/modules/vendor-management/application/slugify.js';

describe('US-040 slugify()', () => {
  it('normaliza minúsculas + espacios → guiones', () => {
    expect(slugify('Acme Catering')).toBe('acme-catering');
  });

  it('remueve diacríticos (NFD)', () => {
    expect(slugify('Fotografía Éxito')).toBe('fotografia-exito');
    expect(slugify('Ñoño Ñandú')).toBe('nono-nandu');
  });

  it('remueve caracteres no permitidos y colapsa guiones', () => {
    expect(slugify('  Acme &  Co.! ')).toBe('acme-co');
    expect(slugify('Weddings @ 2026')).toBe('weddings-2026');
  });

  it('recorta a 80 caracteres máximo', () => {
    const long = 'A'.repeat(120);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });

  it('devuelve fallback determinista para nombres sin caracteres alfanuméricos', () => {
    expect(slugify('***')).toBe('vendor');
    expect(slugify('   ')).toBe('vendor');
  });
});

describe('US-040 pickNextSlug()', () => {
  it('devuelve el base cuando no hay colisión', () => {
    expect(pickNextSlug('acme-catering', [])).toBe('acme-catering');
    expect(pickNextSlug('acme-catering', ['other-slug'])).toBe('acme-catering');
  });

  it('devuelve -2 cuando el base está tomado', () => {
    expect(pickNextSlug('acme-catering', ['acme-catering'])).toBe('acme-catering-2');
  });

  it('avanza hasta el siguiente sufijo libre', () => {
    expect(
      pickNextSlug('acme-catering', ['acme-catering', 'acme-catering-2', 'acme-catering-3']),
    ).toBe('acme-catering-4');
  });

  it('salta huecos en la secuencia (usa el siguiente disponible)', () => {
    expect(pickNextSlug('acme', ['acme', 'acme-4'])).toBe('acme-2');
  });
});
