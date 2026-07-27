'use client';

import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '../internal/cx';
import { warnMissingAccessibleName } from '../internal/a11y';

/**
 * DropdownMenu — acciones contextuales compactas (menú de fila, opciones de una entidad).
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §30 (`DropdownMenu`) y §37.
 * Referencia visual: screen Stitch *Data & Overlays*. Los ítems del ejemplo («Edit Details»,
 * «Duplicate», «Archive», «Delete Event») **no** se implementan aquí: la primitiva no conoce
 * acciones de dominio; recibe `items` del feature, que decide cuáles existen según permisos.
 *
 * Reutiliza el `Menu` de Headless UI —la misma primitiva que ya usa `UserMenu`— que aporta
 * `↑`/`↓`, `Home`/`End`, `Enter`/`Espacio`, `Escape`, cierre por clic fuera, retorno del foco al
 * trigger y reposicionamiento dentro del viewport (`anchor`).
 *
 * Una acción es un `<button>`; una navegación es un `Link` de Next. Nunca un `<a>` sin `href`
 * simulando un botón: un lector de pantalla lo anunciaría como enlace roto.
 */
export interface DropdownMenuActionItem {
  kind?: 'action';
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Acción de riesgo: usa los tokens de error aprobados, nunca coral ni lila. */
  destructive?: boolean;
  /** Estado seleccionado (por ejemplo la ordenación activa). */
  checked?: boolean;
  /** Texto sr-only que anuncia el estado seleccionado, ya traducido. Requerido con `checked`. */
  checkedLabel?: string;
}

export interface DropdownMenuLinkItem {
  kind: 'link';
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  href: string;
  disabled?: boolean;
}

export interface DropdownMenuSeparatorItem {
  kind: 'separator';
  key: string;
}

export type DropdownMenuItem =
  DropdownMenuActionItem | DropdownMenuLinkItem | DropdownMenuSeparatorItem;

export interface DropdownMenuProps {
  /** Contenido visible del trigger. Con `iconOnly` se usa sólo como icono. */
  trigger: ReactNode;
  /** Nombre accesible del trigger. Obligatorio cuando `iconOnly`. */
  triggerAriaLabel?: string;
  iconOnly?: boolean;
  /** Oculta el chevron del trigger (por ejemplo en un trigger de tres puntos). */
  hideChevron?: boolean;
  items: readonly DropdownMenuItem[];
  align?: 'start' | 'end';
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  'data-testid'?: string;
}

const ITEM_CLASS =
  'flex w-full min-h-touch items-center gap-2 px-3 py-2 text-left font-ui text-body-sm ' +
  'data-[focus]:bg-action-ghost-hover data-[disabled]:cursor-not-allowed ' +
  'data-[disabled]:opacity-disabled';

function ItemIcon({ icon }: { icon: ReactNode }): React.JSX.Element {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:h-icon-sm [&>svg]:w-icon-sm">
      {icon}
    </span>
  );
}

export function DropdownMenu({
  trigger,
  triggerAriaLabel,
  iconOnly = false,
  hideChevron = false,
  items,
  align = 'end',
  disabled = false,
  className,
  menuClassName,
  'data-testid': testId,
}: DropdownMenuProps): React.JSX.Element {
  if (iconOnly && !triggerAriaLabel) warnMissingAccessibleName('DropdownMenu');

  return (
    <Menu as="div" className={cx('relative inline-block', className)}>
      <MenuButton
        aria-label={triggerAriaLabel}
        disabled={disabled}
        data-testid={testId}
        className={cx(
          'focus-ring inline-flex min-h-touch items-center justify-center gap-2 rounded-button',
          'border border-action-secondary bg-action-secondary font-ui text-body-sm font-semibold text-primary',
          'transition-colors duration-fast ease-standard hover:bg-action-secondary-hover',
          'disabled:cursor-not-allowed disabled:opacity-disabled',
          iconOnly ? 'min-w-touch px-2' : 'px-4',
        )}
      >
        {iconOnly ? (
          <span aria-hidden="true" className="inline-flex [&>svg]:h-icon-md [&>svg]:w-icon-md">
            {trigger}
          </span>
        ) : (
          <span className="truncate">{trigger}</span>
        )}
        {hideChevron || iconOnly ? null : (
          <ChevronDown aria-hidden="true" className="h-icon-sm w-icon-sm shrink-0 text-secondary" />
        )}
      </MenuButton>
      <MenuItems
        // `anchor` reposiciona el panel para que permanezca dentro del viewport.
        anchor={`bottom ${align}`}
        className={cx(
          'z-dropdown mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-card border border-subtle',
          'bg-surface-elevated py-1 shadow-overlay-dropdown focus:outline-none',
          menuClassName,
        )}
      >
        {items.map((item) => {
          if (item.kind === 'separator') {
            return <MenuSeparator key={item.key} className="my-1 h-px bg-separator" />;
          }

          if (item.kind === 'link') {
            return (
              <MenuItem key={item.key} disabled={item.disabled}>
                <Link href={item.href} className={cx(ITEM_CLASS, 'text-primary')}>
                  {item.icon ? <ItemIcon icon={item.icon} /> : null}
                  <span className="min-w-0 break-words">{item.label}</span>
                </Link>
              </MenuItem>
            );
          }

          return (
            <MenuItem key={item.key} disabled={item.disabled}>
              <button
                type="button"
                onClick={item.onSelect}
                // `MenuItem` marca `aria-disabled`; el atributo nativo además lo saca del
                // orden de foco y bloquea el clic sin depender de la librería.
                disabled={item.disabled}
                className={cx(
                  ITEM_CLASS,
                  item.destructive ? 'text-feedback-error' : 'text-primary',
                )}
              >
                {item.icon ? <ItemIcon icon={item.icon} /> : null}
                <span className="min-w-0 break-words">{item.label}</span>
                {item.checked ? (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                    <Check aria-hidden="true" className="h-icon-sm w-icon-sm" />
                    {/* El estado seleccionado no puede depender sólo del glifo. */}
                    {item.checkedLabel ? (
                      <span className="sr-only">{item.checkedLabel}</span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
