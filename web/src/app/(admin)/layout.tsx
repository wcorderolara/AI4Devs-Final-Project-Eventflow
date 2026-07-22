'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ADMIN_NAV_GROUPS, MobileNav, Sidebar, SkipLink, Topbar } from '@/shared/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('navigation');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const ariaLabel = t('sidebar.admin.label');

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <Topbar onMenuOpen={() => setMenuOpen(true)} isMenuOpen={menuOpen} />
      <MobileNav
        groups={ADMIN_NAV_GROUPS}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        ariaLabel={ariaLabel}
      />
      <div className="flex flex-1">
        <Sidebar groups={ADMIN_NAV_GROUPS} ariaLabel={ariaLabel} />
        <main id="main-content" className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
