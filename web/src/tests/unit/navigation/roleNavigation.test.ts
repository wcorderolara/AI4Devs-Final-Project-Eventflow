import { describe, expect, it } from 'vitest';
import type { Role } from '@/shared/authorization';
import {
  ADMIN_NAV_ITEMS,
  getRoleNavigation,
  navigationHrefsForRole,
  ORGANIZER_NAV_ITEMS,
  VENDOR_NAV_ITEMS,
} from '@/shared/navigation';

/**
 * Matriz de aislamiento entre roles sobre el modelo de navegación, sin DOM. Es el contrato que
 * `AuthenticatedShell` renderiza: si un destino se cuela aquí, se cuela en la sidebar y en el
 * drawer a la vez.
 */

const ROLES: Role[] = ['organizer', 'vendor', 'admin'];

describe('getRoleNavigation', () => {
  it('organizer → sección plana con sus destinos aprobados', () => {
    const nav = getRoleNavigation('organizer');
    expect(nav?.role).toBe('organizer');
    expect(nav?.sections).toHaveLength(1);
    expect(nav?.sections[0]?.titleKey).toBeUndefined();
    expect(navigationHrefsForRole('organizer')).toEqual([
      '/organizer',
      '/organizer/events',
      '/organizer/vendors',
      '/organizer/notifications',
      '/organizer/profile',
    ]);
  });

  it('vendor → sección plana con sus destinos aprobados', () => {
    expect(navigationHrefsForRole('vendor')).toEqual([
      '/vendor',
      '/vendor/profile',
      '/vendor/portfolio',
      '/vendor/services',
      '/vendor/quotes',
      '/vendor/reviews',
      '/vendor/notifications',
    ]);
  });

  it('admin → secciones agrupadas, todas con al menos un destino visible', () => {
    const nav = getRoleNavigation('admin');
    expect(nav?.sections.length).toBeGreaterThan(1);
    expect(nav?.sections.every((section) => section.titleKey && section.items.length > 0)).toBe(
      true,
    );
    expect(navigationHrefsForRole('admin')).toEqual(ADMIN_NAV_ITEMS.map((item) => item.href));
  });

  it.each(ROLES)('cada destino visible para %s declara ese rol en allowedRoles', (role) => {
    const nav = getRoleNavigation(role);
    const items = nav?.sections.flatMap((section) => section.items) ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.allowedRoles.includes(role))).toBe(true);
  });

  it('ningún rol ve destinos de otro rol (matriz de exclusión)', () => {
    const byRole = {
      organizer: navigationHrefsForRole('organizer'),
      vendor: navigationHrefsForRole('vendor'),
      admin: navigationHrefsForRole('admin'),
    };

    // Admin: ni gestión de eventos de organizer, ni recursos propios de vendor.
    expect(byRole.admin.some((href) => href.startsWith('/organizer'))).toBe(false);
    expect(byRole.admin.some((href) => href.startsWith('/vendor'))).toBe(false);
    // Organizer y vendor: ninguna entrada de administración (aprobación, categorías, moderación,
    // métricas, seed, auditoría).
    expect(byRole.organizer.some((href) => href.startsWith('/admin'))).toBe(false);
    expect(byRole.vendor.some((href) => href.startsWith('/admin'))).toBe(false);
    // Organizer ↔ vendor: sin solapamiento de destinos.
    expect(byRole.organizer.filter((href) => byRole.vendor.includes(href))).toEqual([]);
  });

  it('rol ausente o no soportado → sin navegación (nunca cae a organizer)', () => {
    expect(getRoleNavigation(null)).toBeNull();
    expect(getRoleNavigation(undefined)).toBeNull();
    expect(getRoleNavigation('superadmin' as Role)).toBeNull();
    expect(navigationHrefsForRole(null)).toEqual([]);
  });

  it('los modelos base declaran allowedRoles en todas sus entradas', () => {
    const all = [...ORGANIZER_NAV_ITEMS, ...VENDOR_NAV_ITEMS, ...ADMIN_NAV_ITEMS];
    expect(all.every((item) => item.allowedRoles.length > 0)).toBe(true);
  });
});
