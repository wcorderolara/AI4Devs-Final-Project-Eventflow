import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCurrency, formatDate, formatNumber, mapToBcp47 } from '@/shared/i18n/format';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('i18n/format', () => {
  it('mapToBcp47 mapea es-LATAM → es-419 y deja el resto igual', () => {
    expect(mapToBcp47('es-LATAM')).toBe('es-419');
    expect(mapToBcp47('es-ES')).toBe('es-ES');
    expect(mapToBcp47('pt')).toBe('pt');
    expect(mapToBcp47('en')).toBe('en');
  });

  it('formatNumber invoca Intl.NumberFormat con el locale mapeado', () => {
    const original = Intl.NumberFormat;
    const spy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (locale, opts) {
      return new original(locale, opts);
    });
    formatNumber(1234.5, 'es-LATAM');
    expect(spy).toHaveBeenCalledWith('es-419', undefined);
  });

  it('formatDate invoca Intl.DateTimeFormat con el locale mapeado', () => {
    const original = Intl.DateTimeFormat;
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locale, opts) {
      return new original(locale, opts);
    });
    formatDate(new Date('2026-06-15T00:00:00Z'), 'pt');
    expect(spy).toHaveBeenCalledWith('pt', expect.anything());
  });

  it('formatCurrency usa style currency y el locale mapeado', () => {
    const original = Intl.NumberFormat;
    const spy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (locale, opts) {
      return new original(locale, opts);
    });
    formatCurrency(2500, 'MXN', 'es-LATAM');
    expect(spy).toHaveBeenCalledWith(
      'es-419',
      expect.objectContaining({ style: 'currency', currency: 'MXN' }),
    );
  });

  it('formatCurrency con moneda malformada cae a formato genérico sin throw (EC-05)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // `XY` no es un código ISO de 3 letras → Intl lanza RangeError → fallback genérico.
    expect(formatCurrency(100, 'XY', 'en')).toBe('100 XY');
  });

  it('formatCurrency en para USD produce símbolo $', () => {
    expect(formatCurrency(1000, 'USD', 'en')).toContain('$');
  });
});
