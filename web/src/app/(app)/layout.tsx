'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell, Badge } from '@/shared/design-system';
import {
  MobileNav,
  ORGANIZER_NAV_ITEMS,
  Sidebar,
  SkipLink,
  Topbar,
  VENDOR_NAV_ITEMS,
  type NavItem,
} from '@/shared/navigation';

const DRAWER_ID = 'app-mobile-nav';

/**
 * Shell autenticado de `organizer` y `vendor`.
 *
 * PB-P2-029: adopta `AppShell` y **suma la `AppSidebar` de desktop**, que faltaba en este route
 * group (UI-DEC-008 exige sidebar en desktop y drawer en mobile para los tres roles; hasta ahora
 * sólo `(admin)` la tenía). Desktop y mobile consumen el mismo modelo (`ORGANIZER_NAV_ITEMS` /
 * `VENDOR_NAV_ITEMS`), sin rutas nuevas ni cambios de permisos ni de guards.
 */
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
  const workspace = isVendor ? t('workspace.vendor') : t('workspace.organizer');

  return (
    <AppShell
      skipLink={<SkipLink />}
      topBar={
        <Topbar onMenuOpen={() => setMenuOpen(true)} isMenuOpen={menuOpen} drawerId={DRAWER_ID} />
      }
      sidebar={
        <Sidebar
          items={items}
          ariaLabel={ariaLabel}
          header={<Badge variant="role">{workspace}</Badge>}
        />
      }
      drawer={
        <MobileNav
          items={items}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          ariaLabel={ariaLabel}
          panelId={DRAWER_ID}
        />
      }
      // Se conserva la caja de contenido previa (`flex flex-1`): las vistas de este group ya
      // aportan su propio padding.
      mainClassName="flex"
    >
      {children}
    </AppShell>
  );
}
