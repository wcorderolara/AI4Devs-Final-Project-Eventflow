'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { NavItem } from './navItems';
import { NavLink } from './NavLink';

/**
 * Drawer de navegación mobile. Headless UI `<Dialog>` aporta focus trap + cierre con `Escape` +
 * overlay clickeable de forma nativa (AC-07 / WCAG 2.1 AA).
 */
export function MobileNav({
  items,
  isOpen,
  onClose,
  ariaLabel,
}: {
  items: NavItem[];
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
}) {
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
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </nav>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
