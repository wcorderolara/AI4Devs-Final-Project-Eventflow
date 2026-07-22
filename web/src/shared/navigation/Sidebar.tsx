import { useTranslations } from 'next-intl';
import type { NavGroup, NavItem } from './navItems';
import { NavLink } from './NavLink';

interface SidebarProps {
  ariaLabel: string;
  /** Modo plano: lista simple de items sin secciones (organizer/vendor). */
  items?: NavItem[];
  /** Modo agrupado: items divididos en secciones con título (admin). */
  groups?: NavGroup[];
}

/** Sidebar de navegación (desktop). Oculta en mobile (`<MobileNav>` la reutiliza en drawer). */
export function Sidebar({ items, groups, ariaLabel }: SidebarProps) {
  const t = useTranslations('navigation');

  return (
    <nav
      aria-label={ariaLabel}
      className="hidden w-60 shrink-0 border-r border-neutral-200 p-4 lg:block"
    >
      {groups ? (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.titleKey}>
              <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t(group.titleKey)}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {(items ?? []).map((item) => (
            <li key={item.href}>
              <NavLink item={item} />
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
