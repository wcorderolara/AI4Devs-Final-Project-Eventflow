import { describe, expect, it } from 'vitest';
import { createMessageFallback, deepMerge, loadMessages } from '@/shared/i18n/request';

describe('i18n/request', () => {
  it('deepMerge combina override sobre base y conserva claves ausentes', () => {
    const base = { common: { a: '1', b: '2' }, nav: { x: '10' } };
    const override = { common: { b: 'dos' } };
    expect(deepMerge(base, override)).toEqual({
      common: { a: '1', b: 'dos' },
      nav: { x: '10' },
    });
  });

  it('loadMessages(es-LATAM) devuelve el catálogo base completo', () => {
    const messages = loadMessages('es-LATAM') as Record<string, Record<string, string>>;
    expect(messages.common?.welcome).toBe('Bienvenido a EventFlow');
  });

  it('loadMessages(pt) mergea sobre es-LATAM con traducciones pt', () => {
    const messages = loadMessages('pt') as Record<string, Record<string, string>>;
    expect(messages.common?.welcome).toBe('Bem-vindo ao EventFlow');
    // Clave presente en ambos: usa la de pt.
    expect(messages.navigation?.login).toBe('Entrar');
  });

  it('getMessageFallback en dev devuelve clave anotada [locale] namespace.key', () => {
    const fallback = createMessageFallback('pt', true);
    expect(fallback({ key: 'title', namespace: 'events.create' })).toBe('[pt] events.create.title');
  });

  it('getMessageFallback en prod devuelve la ruta de la clave sin anotar', () => {
    const fallback = createMessageFallback('pt', false);
    expect(fallback({ key: 'title', namespace: 'events.create' })).toBe('events.create.title');
  });
});
