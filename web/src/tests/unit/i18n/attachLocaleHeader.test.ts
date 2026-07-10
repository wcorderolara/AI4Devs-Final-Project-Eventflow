import { afterEach, describe, expect, it } from 'vitest';
import { attachLocaleHeader } from '@/shared/i18n/attachLocaleHeader';

afterEach(() => {
  // Limpia la cookie entre tests (jsdom).
  document.cookie = 'eventflow_locale=; path=/; max-age=0';
});

describe('i18n/attachLocaleHeader', () => {
  it('server: usa el locale explícito y lo mapea a BCP-47', () => {
    expect(attachLocaleHeader('es-LATAM')).toEqual({ 'Accept-Language': 'es-419' });
    expect(attachLocaleHeader('pt')).toEqual({ 'Accept-Language': 'pt' });
  });

  it('cliente: lee la cookie eventflow_locale', () => {
    document.cookie = 'eventflow_locale=pt; path=/';
    expect(attachLocaleHeader()).toEqual({ 'Accept-Language': 'pt' });
  });

  it('cliente con cookie inválida cae al default (es-419)', () => {
    document.cookie = 'eventflow_locale=zh-CN; path=/';
    expect(attachLocaleHeader()).toEqual({ 'Accept-Language': 'es-419' });
  });

  it('sin cookie ni locale cae al default (es-419)', () => {
    expect(attachLocaleHeader()).toEqual({ 'Accept-Language': 'es-419' });
  });
});
