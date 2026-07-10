'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './navItems';

/** Link de navegación con `aria-current="page"` y clase activa cuando el pathname coincide. */
export function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const Icon = item.icon;
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded px-3 py-2 text-sm ${
        active ? 'bg-primary-50 font-medium text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {t(item.labelKey)}
    </Link>
  );
}
