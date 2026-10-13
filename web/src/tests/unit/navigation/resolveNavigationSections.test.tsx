import { render, screen } from '@testing-library/react';
import { Calendar } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { AppSidebar } from '@/shared/design-system';
import {
  getRoleNavigation,
  isNavItemActive,
  resolveNavigationSections,
  type NavItem,
} from '@/shared/navigation';

const item: NavItem = {
  href: '/organizer/events',
  labelKey: 'sidebar.organizer.events',
  icon: Calendar,
  allowedRoles: ['organizer'],
};
const labels: Record<string, string> = { 'sidebar.organizer.events': 'Eventos' };
const t = (key: string): string => labels[key] ?? key;

function renderSidebar(pathname: string) {
  const sections = resolveNavigationSections([{ items: [item] }], pathname, t);
  return render(<AppSidebar ariaLabel="Navegación" sections={sections} />);
}

describe('resolveNavigationSections', () => {
  it('aplica aria-current="page" cuando el path coincide', () => {
    renderSidebar('/organizer/events');
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute('aria-current', 'page');
  });

  it('no aplica aria-current cuando el path no coincide', () => {
    renderSidebar('/organizer/profile');
    expect(screen.getByRole('link', { name: 'Eventos' })).not.toHaveAttribute('aria-current');
  });

  it('traduce los títulos de sección sólo cuando existen (admin agrupado, organizer plano)', () => {
    const admin = resolveNavigationSections(getRoleNavigation('admin')!.sections, '/admin', t);
    expect(admin.every((section) => typeof section.label === 'string')).toBe(true);
    const organizer = resolveNavigationSections(
      getRoleNavigation('organizer')!.sections,
      '/organizer',
      t,
    );
    expect(organizer).toHaveLength(1);
    expect(organizer[0]).not.toHaveProperty('label');
  });
});

describe('isNavItemActive', () => {
  it('`exact` exige el pathname completo; sin `exact` vale el prefijo de ruta', () => {
    const home: NavItem = { ...item, href: '/organizer', exact: true };
    expect(isNavItemActive('/organizer', home)).toBe(true);
    expect(isNavItemActive('/organizer/events', home)).toBe(false);
    expect(isNavItemActive('/organizer/events/ev-1', item)).toBe(true);
    expect(isNavItemActive('/organizer/events-archive', item)).toBe(false);
  });
});
