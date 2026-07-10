'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/shared/auth-session';

function profileHrefForRole(role: string | null): string {
  if (role === 'vendor') return '/vendor/profile';
  if (role === 'admin') return '/admin/users';
  return '/organizer/profile';
}

export function UserMenu() {
  const t = useTranslations('navigation');
  const { user, role, isAuthenticated, isLoading } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  if (isLoading) {
    return <div aria-hidden="true" className="h-8 w-8 animate-pulse rounded-full bg-neutral-200" />;
  }
  if (!isAuthenticated || !user) return null;

  const label = user.displayName || user.email;
  const initial = label.charAt(0).toUpperCase();

  /**
   * Logout PLACEHOLDER (US-107): limpia la cookie UX `eventflow_role` (no HttpOnly), invalida
   * `['me']` y redirige a `/login`. La cookie de sesión HttpOnly `eventflow_session` NO se puede
   * limpiar desde cliente y **permanece** hasta el logout real. Reemplazar por `authApi.logout()`
   * en US-AUTH-* (que llama `POST /auth/logout` y limpia ambas cookies).
   */
  const handleLogout = () => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('userMenu.logout.placeholder');
    }
    document.cookie = 'eventflow_role=; path=/; max-age=0; SameSite=Lax';
    queryClient.invalidateQueries({ queryKey: ['me'] });
    router.replace('/login');
  };

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-2 rounded p-1 hover:bg-neutral-100 focus:outline-none focus:ring-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white"
        >
          {initial}
        </span>
        <span className="hidden text-sm md:inline">{label}</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="mt-2 w-48 rounded border border-neutral-200 bg-white py-1 shadow-lg focus:outline-none"
      >
        <MenuItem>
          <Link
            href={profileHrefForRole(role)}
            className="flex items-center gap-2 px-3 py-2 text-sm data-[focus]:bg-neutral-100"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            {t('userMenu.myProfile')}
          </Link>
        </MenuItem>
        <MenuItem>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm data-[focus]:bg-neutral-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('userMenu.logout')}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
