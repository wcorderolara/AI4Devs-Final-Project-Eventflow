// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { roleGuardMiddleware } from '@/shared/authorization/roleGuardMiddleware';
import middleware from '@/middleware';

interface Cookies {
  session?: string;
  role?: string;
}

function req(path: string, cookies: Cookies = {}): NextRequest {
  const request = new NextRequest(new URL(path, 'http://localhost:3000'));
  if (cookies.session !== undefined) request.cookies.set('eventflow_session', cookies.session);
  if (cookies.role !== undefined) request.cookies.set('eventflow_role', cookies.role);
  return request;
}

function location(res: ReturnType<typeof roleGuardMiddleware>): { pathname: string; search: string } {
  const loc = res?.headers.get('location');
  if (!loc) throw new Error('expected a redirect response');
  const url = new URL(loc);
  return { pathname: url.pathname, search: url.search };
}

describe('roleGuardMiddleware — 13 reglas AC-02', () => {
  it('R1: rutas públicas → pass-through (null)', () => {
    expect(roleGuardMiddleware(req('/'))).toBeNull();
    expect(roleGuardMiddleware(req('/vendors'))).toBeNull();
    expect(roleGuardMiddleware(req('/vendors/acme'))).toBeNull();
    expect(roleGuardMiddleware(req('/403'))).toBeNull();
  });

  it('R2: (auth) sin sesión → pass-through', () => {
    expect(roleGuardMiddleware(req('/login'))).toBeNull();
    expect(roleGuardMiddleware(req('/register'))).toBeNull();
    expect(roleGuardMiddleware(req('/forgot-password'))).toBeNull();
  });

  it('R3-R4: (auth) con sesión → redirect al dashboard del rol', () => {
    expect(location(roleGuardMiddleware(req('/login', { session: 't', role: 'organizer' }))).pathname).toBe('/organizer');
    expect(location(roleGuardMiddleware(req('/register', { session: 't', role: 'vendor' }))).pathname).toBe('/vendor');
    expect(location(roleGuardMiddleware(req('/forgot-password', { session: 't', role: 'admin' }))).pathname).toBe('/admin');
  });

  it('R5: /organizer sin sesión → /login?from=%2Forganizer', () => {
    const loc = location(roleGuardMiddleware(req('/organizer')));
    expect(loc.pathname).toBe('/login');
    expect(loc.search).toBe('?from=%2Forganizer');
  });

  it('R6: /organizer con sesión (cualquier rol) → pass-through', () => {
    expect(roleGuardMiddleware(req('/organizer', { session: 't', role: 'vendor' }))).toBeNull();
  });

  it('R7-R8: /vendor sin sesión → /login; con sesión → pass-through', () => {
    expect(location(roleGuardMiddleware(req('/vendor'))).pathname).toBe('/login');
    expect(roleGuardMiddleware(req('/vendor', { session: 't', role: 'organizer' }))).toBeNull();
  });

  it('R9: /admin sin sesión → /login?from=%2Fadmin', () => {
    const loc = location(roleGuardMiddleware(req('/admin')));
    expect(loc.pathname).toBe('/login');
    expect(loc.search).toBe('?from=%2Fadmin');
  });

  it('R10: /admin con sesión, rol ≠ admin → /403', () => {
    expect(location(roleGuardMiddleware(req('/admin', { session: 't', role: 'organizer' }))).pathname).toBe('/403');
  });

  it('R11: /admin con sesión admin → pass-through', () => {
    expect(roleGuardMiddleware(req('/admin', { session: 't', role: 'admin' }))).toBeNull();
  });

  it('R12 (EC-01): rol fuera de whitelist → tratado como sin rol; /admin → /403', () => {
    expect(location(roleGuardMiddleware(req('/admin', { session: 't', role: 'superadmin' }))).pathname).toBe('/403');
  });

  it('R13 (EC-02): sesión sin rol → /admin → /403; /organizer → pass-through', () => {
    expect(location(roleGuardMiddleware(req('/admin', { session: 't' }))).pathname).toBe('/403');
    expect(roleGuardMiddleware(req('/organizer', { session: 't' }))).toBeNull();
  });

  it('NT-02: encoding correcto de path anidado', () => {
    const loc = location(roleGuardMiddleware(req('/organizer/events/123')));
    expect(loc.search).toBe('?from=%2Forganizer%2Fevents%2F123');
  });

  it('NT-03: sesión admin → /login → /admin sin loop', () => {
    expect(location(roleGuardMiddleware(req('/login', { session: 't', role: 'admin' }))).pathname).toBe('/admin');
  });

  it('distingue /vendors (público) de /vendor (app)', () => {
    expect(roleGuardMiddleware(req('/vendors'))).toBeNull(); // público
    expect(location(roleGuardMiddleware(req('/vendor'))).pathname).toBe('/login'); // app sin sesión
  });
});

describe('composición del middleware (localeMiddleware + roleGuardMiddleware)', () => {
  it('redirect del role guard tiene prioridad', () => {
    const res = middleware(req('/organizer'));
    expect(res.headers.get('location')).toContain('/login');
  });

  it('pass-through preserva el header x-locale del locale middleware', () => {
    const res = middleware(req('/', { session: 't', role: 'organizer' }));
    expect(res.headers.get('x-middleware-request-x-locale')).toBeTruthy();
  });
});
