'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell, Badge } from '@/shared/design-system';
import { ADMIN_NAV_GROUPS, MobileNav, Sidebar, SkipLink, Topbar } from '@/shared/navigation';

const DRAWER_ID = 'admin-mobile-nav';

/**
 * Shell autenticado de `admin`.
 *
 * PB-P2-029: adopta `AppShell`; la sidebar agrupada y el drawer pasan a los componentes del
 * design system y comparten el mismo `ADMIN_NAV_GROUPS`. Sin cambios de rutas, grupos, guards ni
 * densidad del contenido (`p-6` se conserva).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('navigation');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const ariaLabel = t('sidebar.admin.label');

  return (
    <AppShell
      skipLink={<SkipLink />}
      topBar={
        <Topbar onMenuOpen={() => setMenuOpen(true)} isMenuOpen={menuOpen} drawerId={DRAWER_ID} />
      }
      sidebar={
        <Sidebar
          groups={ADMIN_NAV_GROUPS}
          ariaLabel={ariaLabel}
          header={<Badge variant="role">{t('workspace.admin')}</Badge>}
        />
      }
      drawer={
        <MobileNav
          groups={ADMIN_NAV_GROUPS}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          ariaLabel={ariaLabel}
          panelId={DRAWER_ID}
        />
      }
      mainClassName="p-6"
    >
      {children}
    </AppShell>
  );
}
