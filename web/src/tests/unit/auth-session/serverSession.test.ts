// Claims de sesión resueltos en el servidor para las superficies públicas.
// Misma fuente que `roleGuardMiddleware`: presencia de `eventflow_session` + rol whitelisted.
import { beforeEach, describe, expect, it, vi } from 'vitest';
// `vi.mock` se iza por encima de los imports: el módulo se carga ya con `next/headers` mockeado.
import { getServerSessionClaims } from '@/shared/auth-session/serverSession';

const store = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (store.has(name) ? { name, value: store.get(name) } : undefined),
  }),
}));

beforeEach(() => store.clear());

describe('getServerSessionClaims', () => {
  it('sin cookies → anónimo', () => {
    expect(getServerSessionClaims()).toEqual({ isAuthenticated: false, role: null });
  });

  it.each(['organizer', 'vendor', 'admin'] as const)('sesión + rol %s → autenticado', (role) => {
    store.set('eventflow_session', 'opaque');
    store.set('eventflow_role', role);
    expect(getServerSessionClaims()).toEqual({ isAuthenticated: true, role });
  });

  it('rol fuera de la whitelist → anónimo (no se confía en el valor crudo)', () => {
    store.set('eventflow_session', 'opaque');
    store.set('eventflow_role', 'superadmin');
    expect(getServerSessionClaims()).toEqual({ isAuthenticated: false, role: null });
  });

  it('rol sin sesión → anónimo: la cookie de rol no es HTTP-only y sola no afirma nada', () => {
    store.set('eventflow_role', 'admin');
    expect(getServerSessionClaims()).toEqual({ isAuthenticated: false, role: null });
  });

  it('sesión sin rol → anónimo', () => {
    store.set('eventflow_session', 'opaque');
    expect(getServerSessionClaims()).toEqual({ isAuthenticated: false, role: null });
  });

  it('falla en seguro si el contexto de request no está disponible', async () => {
    const headers = await import('next/headers');
    const spy = vi.spyOn(headers, 'cookies').mockImplementation(() => {
      throw new Error('fuera de un request');
    });
    expect(getServerSessionClaims()).toEqual({ isAuthenticated: false, role: null });
    spy.mockRestore();
  });
});
