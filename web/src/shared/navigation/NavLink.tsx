'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { SidebarItem } from '@/shared/design-system';
import type { NavItem } from './navItems';
import { isNavItemActive } from './useNavigationSections';

/**
 * Link de navegación con `aria-current="page"` y estado activo cuando el pathname coincide.
 *
 * PB-P2-029: la apariencia y la accesibilidad las aporta ahora `SidebarItem` del design system
 * (tokens `sidebar.item.*`, mínimo táctil de 44 px y señal de activo independiente del color).
 * Este wrapper conserva la API previa —`{ item }` con clave i18n y `LucideIcon`— y resuelve la
 * traducción y la ruta activa, que el design system no puede conocer.
 */
export function NavLink({ item }: { item: NavItem }): React.JSX.Element {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const Icon = item.icon;

  return (
    <SidebarItem
      item={{
        href: item.href,
        label: t(item.labelKey),
        icon: <Icon aria-hidden="true" />,
        active: isNavItemActive(pathname, item),
      }}
    />
  );
}
