'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { NavGroup, NavItem } from './navItems';
import { NavLink } from './NavLink';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Modo plano (organizer/vendor). */
  items?: NavItem[];
  /** Modo agrupado (admin). */
  groups?: NavGroup[];
}

/**
 * Drawer de navegación mobile. Headless UI `<Dialog>` aporta focus trap + cierre con `Escape` +
 * overlay clickeable de forma nativa (AC-07 / WCAG 2.1 AA).
 */
export function MobileNav({ items, groups, isOpen, onClose, ariaLabel }: MobileNavProps) {
  const t = useTranslations('navigation');
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-y-0 left-0 flex w-64 max-w-[80vw]">
        <DialogPanel className="flex w-full flex-col overflow-y-auto bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('mobile.close')}
            className="mb-4 self-end rounded p-2 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <nav aria-label={ariaLabel}>
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
        </DialogPanel>
      </div>
    </Dialog>
  );
}
