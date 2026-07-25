'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '../feedback/Badge';
import { cx } from '../internal/cx';

/**
 * UserMenu — identidad de la sesión y accesos de cuenta.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`UserMenu`) y §30
 * (`DropdownMenu`: teclado, `Esc`, retorno de foco).
 *
 * - **No inventa rutas**: los destinos llegan en `items`. El consumidor decide cuáles existen
 *   según el rol; un enlace de administración no puede aparecer si no se le pasa.
 * - `Menu` de Headless UI aporta `↑`/`↓`, `Enter`/`Space`, `Esc` y el retorno del foco al trigger.
 * - El email y el badge de rol sólo se muestran cuando el producto ya expone esos datos.
 */
export interface UserMenuLinkItem {
  key: string;
  label: string;
  icon?: ReactNode;
  href: string;
}

export interface UserMenuActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export type UserMenuItem = UserMenuLinkItem | UserMenuActionItem;

export interface UserMenuProps {
  /** Nombre accesible del trigger, ya traducido (p. ej. `Menú de usuario`). */
  triggerLabel: string;
  /** Nombre visible de la persona (o su email si no hay nombre). */
  name: string;
  /** Email; se muestra sólo si el producto ya lo expone en esta superficie. */
  email?: string;
  /** Rol traducido; se presenta como `Badge` de contexto, no como tema de color. */
  roleLabel?: string;
  /** Iniciales del avatar. Si se omite se derivan de `name`. */
  initials?: string;
  items: readonly UserMenuItem[];
  className?: string;
}

function isLink(item: UserMenuItem): item is UserMenuLinkItem {
  return 'href' in item;
}

const ITEM_CLASS =
  'flex w-full min-h-touch items-center gap-2 px-3 py-2 text-left font-ui text-body-sm ' +
  'text-primary data-[focus]:bg-action-ghost-hover disabled:opacity-disabled';

export function UserMenu({
  triggerLabel,
  name,
  email,
  roleLabel,
  initials,
  items,
  className,
}: UserMenuProps): React.JSX.Element {
  const avatar = (initials ?? name.trim().charAt(0)).toUpperCase();

  return (
    <Menu as="div" className={cx('relative', className)}>
      <MenuButton className="focus-ring flex min-h-touch items-center gap-2 rounded-button p-1 hover:bg-action-ghost-hover">
        {/* El nombre accesible se compone de `triggerLabel` + `name`: el propósito del control y
            la identidad de la sesión. No se usa `aria-label`, que ocultaría el nombre visible. */}
        <span className="sr-only">{triggerLabel}</span>{' '}
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-badge bg-action-primary font-ui text-body-sm font-semibold text-action-primary-foreground"
        >
          {avatar}
        </span>
        {/* En mobile el nombre se oculta visualmente pero permanece en el árbol de accesibilidad. */}
        <span className="sr-only max-w-40 truncate font-ui text-body-sm text-primary md:not-sr-only md:inline">
          {name}
        </span>
        <ChevronDown aria-hidden="true" className="h-icon-sm w-icon-sm shrink-0 text-secondary" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-card border border-subtle bg-surface-elevated py-1 shadow-overlay-dropdown focus:outline-none"
      >
        <div className="border-b border-subtle px-3 py-2">
          <p className="truncate font-ui text-body-sm font-semibold text-primary">{name}</p>
          {email ? <p className="truncate font-body text-caption text-muted">{email}</p> : null}
          {roleLabel ? (
            <Badge variant="role" className="mt-1.5">
              {roleLabel}
            </Badge>
          ) : null}
        </div>
        {items.map((item) => (
          <MenuItem key={item.key}>
            {isLink(item) ? (
              <Link href={item.href} className={ITEM_CLASS}>
                {item.icon ? (
                  <span
                    aria-hidden="true"
                    className="inline-flex shrink-0 [&>svg]:h-icon-sm [&>svg]:w-icon-sm"
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0 break-words">{item.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={item.onSelect}
                disabled={item.disabled}
                aria-busy={item.busy || undefined}
                className={ITEM_CLASS}
              >
                {item.icon ? (
                  <span
                    aria-hidden="true"
                    className="inline-flex shrink-0 [&>svg]:h-icon-sm [&>svg]:w-icon-sm"
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0 break-words">{item.label}</span>
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
