// Resolución role-aware de los CTA públicos (screen Stitch «EventFlow - Inicio»).
// El punto de estos tests no es la ruta concreta sino la regla: quien ya tiene sesión nunca
// recibe una invitación a iniciarla de nuevo, y el mapa `rol → destino` vive en un solo sitio.
import { describe, expect, it } from 'vitest';
import type { SessionClaims } from '@/shared/authorization';
import { roleHome, ROLE_HOME } from '@/shared/navigation/roleHome';
import {
  getPublicHeaderCtas,
  getPublicHeroCtas,
  getPublicVendorCta,
  PUBLIC_NAV_LINKS,
  PUBLIC_SECTION_ID,
} from '@/shared/navigation/publicNavigation';

const anonymous: SessionClaims = { isAuthenticated: false, role: null };
const organizer: SessionClaims = { isAuthenticated: true, role: 'organizer' };
const vendor: SessionClaims = { isAuthenticated: true, role: 'vendor' };
const admin: SessionClaims = { isAuthenticated: true, role: 'admin' };

/** Destinos realmente montados en el App Router. Un CTA no puede apuntar fuera de esta lista. */
const REAL_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/vendors',
  '/organizer',
  '/organizer/events',
  '/vendor',
  '/vendor/quotes',
  '/admin',
  '/admin/metrics',
]);

function assertRealDestination(href: string): void {
  const hashAt = href.indexOf('#');
  if (hashAt !== -1) {
    // El ancla debe ser absoluta (`/#seccion`): el header vive también en `/vendors`, donde
    // una relativa apuntaría a una sección inexistente de esa página.
    expect(href.slice(0, hashAt), `${href} debe ser absoluta`).toBe('/');
    expect(Object.values(PUBLIC_SECTION_ID)).toContain(href.slice(hashAt + 1));
    return;
  }
  expect(REAL_ROUTES, `${href} no es una ruta montada`).toContain(href);
}

describe('roleHome — mapa único de workspaces', () => {
  it('resuelve los tres roles a rutas montadas', () => {
    expect(roleHome('organizer')).toBe('/organizer');
    expect(roleHome('vendor')).toBe('/vendor');
    expect(roleHome('admin')).toBe('/admin');
    for (const href of Object.values(ROLE_HOME)) assertRealDestination(href);
  });
});

describe('getPublicHeaderCtas', () => {
  it('anónimo: ofrece crear cuenta e iniciar sesión', () => {
    const { primary, secondary } = getPublicHeaderCtas(anonymous);
    expect(primary.href).toBe('/register');
    expect(secondary?.href).toBe('/login');
  });

  it.each([
    ['organizer', organizer, '/organizer'],
    ['vendor', vendor, '/vendor'],
    ['admin', admin, '/admin'],
  ] as const)('%s: una sola acción, hacia su workspace', (_role, claims, expected) => {
    const { primary, secondary } = getPublicHeaderCtas(claims);
    expect(primary.href).toBe(expected);
    // Nada de «Iniciar sesión» ni «Crear cuenta» para quien ya tiene sesión.
    expect(secondary).toBeUndefined();
  });

  it('una sesión sin rol reconocible se trata como anónima', () => {
    const { primary } = getPublicHeaderCtas({ isAuthenticated: true, role: null });
    expect(primary.href).toBe('/register');
  });

  it('un rol sin sesión no basta para considerar autenticado', () => {
    const { primary, secondary } = getPublicHeaderCtas({ isAuthenticated: false, role: 'admin' });
    expect(primary.href).toBe('/register');
    expect(secondary?.href).toBe('/login');
  });
});

describe('getPublicHeroCtas', () => {
  it('anónimo: alta + directorio público (no un segundo login)', () => {
    const { primary, secondary } = getPublicHeroCtas(anonymous);
    expect(primary.href).toBe('/register');
    expect(secondary.href).toBe('/vendors');
  });

  it.each([
    ['organizer', organizer, '/organizer', '/organizer/events'],
    ['vendor', vendor, '/vendor', '/vendor/quotes'],
    ['admin', admin, '/admin', '/admin/metrics'],
  ] as const)('%s: par de destinos de su propio workspace', (_r, claims, primary, secondary) => {
    const ctas = getPublicHeroCtas(claims);
    expect(ctas.primary.href).toBe(primary);
    expect(ctas.secondary.href).toBe(secondary);
    expect(ctas.primary.href).toBe(ROLE_HOME[claims.role!]);
  });

  it('ningún destino resuelto apunta a una ruta inexistente', () => {
    for (const claims of [anonymous, organizer, vendor, admin]) {
      const { primary, secondary } = getPublicHeroCtas(claims);
      assertRealDestination(primary.href);
      assertRealDestination(secondary.href);
      assertRealDestination(getPublicVendorCta(claims).href);
    }
  });
});

describe('getPublicVendorCta', () => {
  it('anónimo: alta como proveedor', () => {
    expect(getPublicVendorCta(anonymous).href).toBe('/register');
  });

  it('autenticado: su propio workspace, no un registro repetido', () => {
    expect(getPublicVendorCta(vendor).href).toBe('/vendor');
    expect(getPublicVendorCta(organizer).href).toBe('/organizer');
  });
});

describe('PUBLIC_NAV_LINKS', () => {
  it('sólo enlaza anclas de secciones reales o rutas montadas', () => {
    expect(PUBLIC_NAV_LINKS.length).toBeGreaterThan(0);
    for (const link of PUBLIC_NAV_LINKS) assertRealDestination(link.href);
  });

  it('no incluye los destinos de Stitch que EventFlow no tiene', () => {
    const hrefs = PUBLIC_NAV_LINKS.map((link) => link.href).join(' ');
    expect(hrefs).not.toMatch(/pricing|precios|solutions|soluciones|blog|careers|press/i);
  });
});
