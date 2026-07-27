'use client';

import { useTranslations } from 'next-intl';
import { useSession } from '@/shared/auth-session';

const ROLE_LABEL_KEY = {
  organizer: 'userMenu.role.organizer',
  vendor: 'userMenu.role.vendor',
  admin: 'userMenu.role.admin',
} as const;

/**
 * Bloque de identidad al pie de la navegación (sidebar desktop y drawer mobile).
 *
 * Referencia visual: screen Stitch *EventFlow - Layout Principal (Base)*, que cierra la sidebar
 * con una tarjeta de usuario (avatar + nombre + rol). Se monta en el slot `footer` que
 * `AppSidebar` y `MobileNavigationDrawer` ya exponían y que hasta ahora nadie usaba, así que no
 * hace falta ninguna primitiva nueva.
 *
 * Es **informativo, no interactivo**: las acciones de cuenta (perfil, idioma, cerrar sesión)
 * siguen viviendo una única vez en el `UserMenu` del `Topbar`, común a los tres roles. Duplicar
 * aquí un segundo menú sólo añadiría dos formas de hacer lo mismo.
 *
 * Sólo se muestran metadatos que la sesión ya expone en la UI actual (nombre visible y rol). No
 * se pinta el email —el `UserMenu` ya decide cuándo aporta información— ni ningún identificador
 * de sesión, token o claim interno.
 */
/**
 * En el screen Stitch el bloque de identidad es una **tarjeta blanca** sobre el pie tintado de
 * la sidebar. Se reproduce con tokens ya existentes (`surface`, `radii.card`,
 * `elevation.surfaceSubtle`); el pie aporta el tinte.
 */
const CARD = 'flex items-center gap-3 rounded-card bg-surface px-3 py-2 shadow-surface-subtle';

export function SidebarAccount(): React.JSX.Element | null {
  const t = useTranslations('navigation');
  const { user, role, isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    // Placeholder de la misma caja para que el pie no salte al hidratar la sesión.
    return (
      <div aria-hidden="true" className={CARD}>
        <span className="h-8 w-8 shrink-0 animate-pulse rounded-badge bg-surface-disabled" />
        <span className="h-4 w-24 animate-pulse rounded-badge bg-surface-disabled" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const name = user.displayName || user.email;
  const roleLabel = role ? t(ROLE_LABEL_KEY[role]) : undefined;

  return (
    <div className={CARD}>
      {/* El avatar es decorativo: la identidad la aporta el nombre visible que va justo al lado. */}
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-badge bg-action-primary font-ui text-body-sm font-semibold text-action-primary-foreground"
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-ui text-body-sm font-semibold text-primary">{name}</span>
        {roleLabel ? (
          <span className="truncate font-body text-caption text-muted">{roleLabel}</span>
        ) : null}
      </span>
    </div>
  );
}
