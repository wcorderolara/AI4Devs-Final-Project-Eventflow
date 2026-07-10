import type { NavItem } from './navItems';
import { NavLink } from './NavLink';

/** Sidebar de navegación (desktop). Oculta en mobile (`<MobileNav>` la reutiliza en drawer). */
export function Sidebar({ items, ariaLabel }: { items: NavItem[]; ariaLabel: string }) {
  return (
    <nav
      aria-label={ariaLabel}
      className="hidden w-60 shrink-0 border-r border-neutral-200 p-4 lg:block"
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
