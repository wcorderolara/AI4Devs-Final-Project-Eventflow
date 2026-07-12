'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSession, useLogout } from '@/shared/auth-session';

function profileHrefForRole(role: string | null): string {
  if (role === 'vendor') return '/vendor/profile';
  if (role === 'admin') return '/admin/users';
  return '/organizer/profile';
}

export function UserMenu() {
  const t = useTranslations('navigation');
  const { user, role, isAuthenticated, isLoading } = useSession();
  // US-005 / FE-003: logout real — `POST /auth/logout` revoca la sesión y limpia la cookie
  // HttpOnly; el hook purga el estado del cliente y redirige a /login (sin modal — Decisión PO #4).
  const logout = useLogout();

  if (isLoading) {
    return <div aria-hidden="true" className="h-8 w-8 animate-pulse rounded-full bg-neutral-200" />;
  }
  if (!isAuthenticated || !user) return null;

  const label = user.displayName || user.email;
  const initial = label.charAt(0).toUpperCase();

  const handleLogout = () => {
    if (!logout.isPending) logout.mutate();
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
            disabled={logout.isPending}
            aria-busy={logout.isPending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm data-[focus]:bg-neutral-100 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('userMenu.logout')}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
