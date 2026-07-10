import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Calendar } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { NavLink } from '@/shared/navigation';
import type { NavItem } from '@/shared/navigation';

const pathname = vi.hoisted(() => ({ value: '/organizer/events' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

const messages = { navigation: { sidebar: { organizer: { events: 'Eventos' } } } };
const item: NavItem = { href: '/organizer/events', labelKey: 'sidebar.organizer.events', icon: Calendar };

function renderNavLink() {
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={messages}>
      <NavLink item={item} />
    </NextIntlClientProvider>,
  );
}

describe('<NavLink>', () => {
  it('aplica aria-current="page" cuando el path coincide', () => {
    pathname.value = '/organizer/events';
    renderNavLink();
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute('aria-current', 'page');
  });

  it('no aplica aria-current cuando el path no coincide', () => {
    pathname.value = '/organizer/profile';
    renderNavLink();
    expect(screen.getByRole('link', { name: 'Eventos' })).not.toHaveAttribute('aria-current');
  });
});
