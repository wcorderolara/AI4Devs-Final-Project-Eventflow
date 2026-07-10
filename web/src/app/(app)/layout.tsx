'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MobileNav,
  ORGANIZER_NAV_ITEMS,
  SkipLink,
  Topbar,
  VENDOR_NAV_ITEMS,
  type NavItem,
} from '@/shared/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('navigation');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isVendor = pathname === '/vendor' || pathname.startsWith('/vendor/');
  const items: NavItem[] = isVendor ? VENDOR_NAV_ITEMS : ORGANIZER_NAV_ITEMS;
  const ariaLabel = isVendor ? t('sidebar.vendor.label') : t('sidebar.organizer.label');

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <Topbar onMenuOpen={() => setMenuOpen(true)} isMenuOpen={menuOpen} />
      <MobileNav
        items={items}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        ariaLabel={ariaLabel}
      />
      <main id="main-content" className="flex flex-1">
        {children}
      </main>
    </div>
  );
}
