'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/shared/auth-session';
import type { Role } from '@/shared/authorization';
import {
  AppShell,
  AppSidebar,
  Badge,
  MobileNavigationDrawer,
  MobileNavigationTrigger,
  NotificationButton,
  TopBar,
} from '@/shared/design-system';
import { LanguageSelector } from '@/shared/i18n';
import { Logo } from './Logo';
import { getRoleNavigation, resolveNavigationSections } from './roleNavigation';
import { SidebarAccount } from './SidebarAccount';
import { SkipLink } from './SkipLink';
import { UserMenu } from './UserMenu';

/** `id` del panel del drawer. Sólo se monta un shell autenticado a la vez, así que es estable. */
const DRAWER_ID = 'app-mobile-nav';

/**
 * Shell autenticado compartido por `organizer`, `vendor` y `admin` (UI-DEC-008: un solo shell;
 * UI-DEC-009: sin temas por rol — sólo cambian navegación, badge de workspace y contenido).
 *
 * Sustituye la composición que estaba duplicada en `(app)/layout.tsx` y `(admin)/layout.tsx`, y
 * corrige el punto que motivó esta tarea: **el rol ya no se deduce de la URL**. Antes `(app)`
 * elegía el menú con `pathname.startsWith('/vendor')`, así que la navegación dependía del
 * destino y no de quién había iniciado sesión.
 *
 * Resolución del rol (en este orden):
 * 1. `useSession().role` — lo que el backend afirmó en `GET /users/me`. Es la autoridad.
 * 2. `initialRole` — el claim UX de la cookie `eventflow_role`, leído en el servidor por el
 *    layout. Cubre el primer render y el tiempo que tarda la sesión en hidratarse, de modo que
 *    el HTML del servidor ya trae la navegación correcta: no hay flash con opciones de otro rol
 *    ni parpadeo de la sidebar. Es la misma señal que ya usa `roleGuardMiddleware` para dejar
 *    entrar a la ruta, así que no añade una segunda fuente de verdad.
 * 3. Sin ninguna de las dos → `null` ⇒ shell sin navegación. **Nunca** se cae a `organizer`.
 *
 * Cuando la sesión responde de forma definitiva que no hay rol (401 / rol no soportado), la
 * navegación desaparece: se falla cerrado. El claim de cookie sólo se mantiene mientras la
 * sesión está cargando o ha fallado de forma transitoria (red / 5xx), para no vaciar la sidebar
 * ante un error recuperable.
 *
 * Nada de esto es autorización: el backend valida cada request y el middleware protege el
 * routing aunque la URL se escriba a mano (ADR-FE-003).
 *
 * Es la única capa entre la aplicación y `design-system/navigation`: aquí se inyectan sesión,
 * i18n y ruta activa; la presentación (sidebar, drawer, top bar) la aporta el design system.
 */
export interface AuthenticatedShellProps {
  /**
   * Rol resuelto en el servidor desde la cookie `eventflow_role`. `null` si no hay claim válido.
   * No se usa para autorizar: sólo para pintar el primer render sin esperar a la sesión.
   */
  initialRole: Role | null;
  /** Clases del `<main>`; cada route group conserva la densidad de contenido que ya tenía. */
  mainClassName?: string;
  children: React.ReactNode;
}

export function AuthenticatedShell({
  initialRole,
  mainClassName,
  children,
}: AuthenticatedShellProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const { role: sessionRole, isLoading, isError } = useSession();

  // Navegar cierra el drawer (AC de mobile: el menú no se queda abierto sobre la vista nueva).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const role: Role | null = sessionRole ?? (isLoading || isError ? initialRole : null);
  const navigation = getRoleNavigation(role);
  // Desktop y drawer consumen exactamente las mismas secciones (UI-DEC-008).
  const sections = useMemo(
    () => (navigation ? resolveNavigationSections(navigation.sections, pathname, t) : []),
    [navigation, pathname, t],
  );

  const ariaLabel = navigation ? t(navigation.ariaLabelKey) : undefined;

  return (
    <AppShell
      skipLink={<SkipLink />}
      topBar={
        <TopBar
          menuTrigger={
            // Sin navegación no hay nada que abrir: el trigger del drawer no se monta.
            navigation ? (
              <MobileNavigationTrigger
                label={t('topbar.menuOpen')}
                isOpen={menuOpen}
                onOpen={() => setMenuOpen(true)}
                controls={DRAWER_ID}
              />
            ) : undefined
          }
          brand={<Logo size="sm" />}
          actions={
            <>
              {/* US-107: sin destino ni contador real. US-073 (D-07): el `NotificationsBell` de
                  US-071 sigue sin montarse aquí — su outside-click compite con el `Menu` de
                  Headless UI del `UserMenu` y rompe el E2E de logout. */}
              <NotificationButton label={t('notifications.label')} />
              <LanguageSelector />
              <UserMenu />
            </>
          }
        />
      }
      sidebar={
        navigation && ariaLabel ? (
          <AppSidebar
            ariaLabel={ariaLabel}
            sections={sections}
            header={<Badge variant="role">{t(navigation.workspaceKey)}</Badge>}
            footer={<SidebarAccount />}
          />
        ) : undefined
      }
      drawer={
        navigation && ariaLabel ? (
          <MobileNavigationDrawer
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            ariaLabel={ariaLabel}
            title={t('mobile.title')}
            closeLabel={t('mobile.close')}
            sections={sections}
            footer={<SidebarAccount />}
            panelId={DRAWER_ID}
          />
        ) : undefined
      }
      mainClassName={mainClassName}
    >
      {children}
    </AppShell>
  );
}
