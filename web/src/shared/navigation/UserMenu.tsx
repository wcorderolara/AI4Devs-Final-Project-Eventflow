'use client';

import { LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession, useLogout } from '@/shared/auth-session';
import { UserMenu as UserMenuView, type UserMenuItem } from '@/shared/design-system';

function profileHrefForRole(role: string | null): string {
  if (role === 'vendor') return '/vendor/profile';
  if (role === 'admin') return '/admin/users';
  return '/organizer/profile';
}

const ROLE_LABEL_KEY: Record<string, string> = {
  organizer: 'userMenu.role.organizer',
  vendor: 'userMenu.role.vendor',
  admin: 'userMenu.role.admin',
};

/**
 * Menú de usuario del área autenticada.
 *
 * PB-P2-029: la presentación pasa a `UserMenu` del design system; aquí quedan **sólo** la sesión,
 * el destino de perfil por rol y el logout real. Ninguna ruta ni permiso cambió: los destinos
 * siguen saliendo de `profileHrefForRole` y no se expone ningún enlace de administración.
 */
export function UserMenu(): React.JSX.Element | null {
  const t = useTranslations('navigation');
  const { user, role, isAuthenticated, isLoading } = useSession();
  // US-005 / FE-003: logout real — `POST /auth/logout` revoca la sesión y limpia la cookie
  // HttpOnly; el hook purga el estado del cliente y redirige a /login (sin modal — Decisión PO #4).
  const logout = useLogout();

  if (isLoading) {
    return (
      <div aria-hidden="true" className="h-8 w-8 animate-pulse rounded-full bg-surface-disabled" />
    );
  }
  if (!isAuthenticated || !user) return null;

  const label = user.displayName || user.email;
  const roleKey = role ? ROLE_LABEL_KEY[role] : undefined;

  const items: UserMenuItem[] = [
    {
      key: 'profile',
      label: t('userMenu.myProfile'),
      icon: <User aria-hidden="true" />,
      href: profileHrefForRole(role),
    },
    {
      key: 'logout',
      label: t('userMenu.logout'),
      icon: <LogOut aria-hidden="true" />,
      onSelect: () => {
        if (!logout.isPending) logout.mutate();
      },
      disabled: logout.isPending,
      busy: logout.isPending,
    },
  ];

  return (
    <UserMenuView
      triggerLabel={t('userMenu.label')}
      name={label}
      // Sólo se muestra el email cuando aporta información distinta del nombre visible.
      email={user.displayName ? user.email : undefined}
      roleLabel={roleKey ? t(roleKey) : undefined}
      items={items}
    />
  );
}
