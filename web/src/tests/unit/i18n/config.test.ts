import { describe, expect, it } from 'vitest';
import {
  cookieName,
  defaultLocale,
  isSupportedLocale,
  localeLabels,
  locales,
} from '@/shared/i18n/config';

describe('i18n/config', () => {
  it('expone los 4 locales soportados', () => {
    expect(locales).toEqual(['es-LATAM', 'es-ES', 'pt', 'en']);
  });

  it('default locale es es-LATAM', () => {
    expect(defaultLocale).toBe('es-LATAM');
  });

  it('cookieName es eventflow_locale', () => {
    expect(cookieName).toBe('eventflow_locale');
  });

  it('localeLabels cubre todos los locales con nombre nativo', () => {
    for (const locale of locales) {
      expect(localeLabels[locale]).toBeTruthy();
    }
  });

  it('isSupportedLocale valida contra la whitelist', () => {
    expect(isSupportedLocale('pt')).toBe(true);
    expect(isSupportedLocale('es-LATAM')).toBe(true);
    expect(isSupportedLocale('zh-CN')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});
