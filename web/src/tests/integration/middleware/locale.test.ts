// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { localeMiddleware, resolveLocale } from '@/middleware';

function makeRequest(options: { cookie?: string; acceptLanguage?: string }): NextRequest {
  const headers = new Headers();
  if (options.acceptLanguage !== undefined) {
    headers.set('accept-language', options.acceptLanguage);
  }
  const req = new NextRequest('http://localhost:3000/', { headers });
  if (options.cookie !== undefined) {
    req.cookies.set('eventflow_locale', options.cookie);
  }
  return req;
}

describe('localeMiddleware / resolveLocale', () => {
  it('cookie válida → la usa', () => {
    expect(resolveLocale(makeRequest({ cookie: 'pt' }))).toBe('pt');
  });

  it('cookie inválida + Accept-Language pt → pt (EC-01)', () => {
    expect(resolveLocale(makeRequest({ cookie: 'zh-CN', acceptLanguage: 'pt-PT,pt;q=0.9' }))).toBe(
      'pt',
    );
  });

  it('sin cookie ni header → es-LATAM', () => {
    expect(resolveLocale(makeRequest({}))).toBe('es-LATAM');
  });

  it('Accept-Language vacío/malformado → es-LATAM sin throw (EC-03/NT-02)', () => {
    expect(resolveLocale(makeRequest({ acceptLanguage: '' }))).toBe('es-LATAM');
  });

  it('Accept-Language sin match en whitelist → es-LATAM (AC-07)', () => {
    expect(resolveLocale(makeRequest({ acceptLanguage: 'fr,de;q=0.9' }))).toBe('es-LATAM');
  });

  it('Accept-Language en → en (AC-06)', () => {
    expect(resolveLocale(makeRequest({ acceptLanguage: 'en-US,en;q=0.8' }))).toBe('en');
  });

  it('localeMiddleware propaga el locale resuelto en el header x-locale', () => {
    const res = localeMiddleware(makeRequest({ cookie: 'pt' }));
    // Next codifica los request headers reenviados como `x-middleware-request-*`.
    expect(res.headers.get('x-middleware-request-x-locale')).toBe('pt');
  });
});
