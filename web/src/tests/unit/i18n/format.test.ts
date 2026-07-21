import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Locale } from '@/shared/i18n/config';
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

  it('formatCurrency degrada locale no soportado al default (es-LATAM) sin throw', () => {
    // El helper es defensivo: recibe `string` widened y normaliza a la whitelist.
    const out = formatCurrency(1000, 'USD', 'zh' as unknown as Locale);
    // Sin excepciones y con dígitos presentes.
    expect(out).toMatch(/1[.,]?000/);
  });

  describe('QA-001 — 5 currencies × 4 locales (US-083 AC-01/AC-02)', () => {
    const CURRENCIES = ['GTQ', 'EUR', 'MXN', 'COP', 'USD'] as const;
    const LOCALES: Locale[] = ['es-LATAM', 'es-ES', 'pt', 'en'];

    for (const currency of CURRENCIES) {
      for (const locale of LOCALES) {
        it(`formatea ${currency} en ${locale} sin lanzar y contiene los dígitos del monto`, () => {
          // Monto entero para ser estable ante monedas de 0 decimales (COP en ICU) y variantes
          // de agrupamiento por locale (`1,234`, `1.234`, `1 234`, `1234`).
          const out = formatCurrency(1234, currency, locale);
          expect(out).toMatch(/1[^\d]?234/);
          // El identificador de moneda aparece como símbolo nativo o como código ISO
          // (ambos son formatos válidos que emite ICU).
          const symbolByCurrency = {
            GTQ: /Q/,
            EUR: /€|EUR/,
            MXN: /\$|MXN/,
            COP: /\$|COP/,
            USD: /\$|USD/,
          } as const satisfies Record<(typeof CURRENCIES)[number], RegExp>;
          expect(out).toMatch(symbolByCurrency[currency]);
        });
      }
    }
  });

  describe('QA-001 — edge cases (EC-02/EC-03/EC-04)', () => {
    it('EC-02: amount = 0 se formatea con dos decimales', () => {
      const out = formatCurrency(0, 'GTQ', 'es-LATAM');
      // Espera "0.00" o "0,00" o "Q0.00" (según variante ICU).
      expect(out).toMatch(/0[.,]00/);
    });

    it('EC-03: amount negativo preserva signo', () => {
      const out = formatCurrency(-500, 'GTQ', 'es-LATAM');
      // Puede aparecer como "-Q500.00", "-Q 500,00" o "Q-500.00" según ICU. Basta con verificar
      // que el signo negativo o los paréntesis contables estén presentes.
      expect(out).toMatch(/-|\(/);
      expect(out).toMatch(/500/);
    });

    it('EC-04: amount con muchos decimales se redondea a 2', () => {
      const out = formatCurrency(1.239, 'USD', 'en');
      // ICU redondea 1.239 → 1.24 por default (banker's rounding no aplica a currency).
      expect(out).toMatch(/1[.,]24/);
    });

    it('permite override de opciones (maximumFractionDigits: 0) para vistas IA', () => {
      const out = formatCurrency(1234.56, 'USD', 'en', { maximumFractionDigits: 0 });
      // Sin decimales.
      expect(out).toMatch(/1[,.]?235/);
      expect(out).not.toMatch(/\./);
    });
  });

  describe('formatCurrency — AC-01 (símbolo nativo)', () => {
    it('GTQ en es-LATAM muestra Q', () => {
      expect(formatCurrency(500, 'GTQ', 'es-LATAM')).toContain('Q');
    });

    it('EUR en es-ES muestra €', () => {
      expect(formatCurrency(500, 'EUR', 'es-ES')).toContain('€');
    });

    it('USD en en muestra $', () => {
      expect(formatCurrency(1000, 'USD', 'en')).toContain('$');
    });
  });
});
