import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../internal/cx';
import {
  ACTION_BASE,
  ACTION_ICON_SIZE,
  ACTION_SIZE,
  ACTION_VARIANT,
  type ActionSize,
  type ActionVariant,
} from './actionStyles';

/**
 * ActionLink — llamada a la acción cuyo efecto es **navegar**.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §11 y §12.
 *
 * **No es un segundo sistema de botones**: comparte con `Button` exactamente las mismas escalas
 * de variante y tamaño (`actionStyles.ts`). La diferencia es semántica, y es la razón de existir:
 * un CTA que lleva a `/register` tiene que ser un `<a href>` real —navegable con clic central,
 * abrible en pestaña nueva, anunciado como enlace y funcional sin JavaScript—, y `Button`
 * renderiza un `<button>`. Estilar un `<button>` para que parezca enlace, o un `<a>` a mano con
 * clases copiadas, son los dos anti-patrones que este componente evita.
 *
 * Se distingue de `TextLink` (§12) en el rol: `TextLink` es un enlace textual dentro de contenido;
 * `ActionLink` es una acción destacada de una superficie (hero, header, cierre de landing).
 *
 * Es un Server Component: no lleva `'use client'` y puede renderizarse en el HTML inicial.
 */
export interface ActionLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'children'
> {
  href: string;
  variant?: ActionVariant;
  size?: ActionSize;
  /** Ocupa el ancho disponible (patrón mobile para acciones primarias). */
  fullWidth?: boolean;
  /** Icono Lucide decorativo antes del label. */
  leadingIcon?: ReactNode;
  /** Icono Lucide decorativo después del label. */
  trailingIcon?: ReactNode;
  /** Copy ya traducido. Nunca vive dentro del componente. */
  children: ReactNode;
}

export const ActionLink = forwardRef<HTMLAnchorElement, ActionLinkProps>(function ActionLink(
  {
    href,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <Link
      {...rest}
      ref={ref}
      href={href}
      className={cx(
        ACTION_BASE,
        ACTION_VARIANT[variant],
        ACTION_SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {leadingIcon ? (
        <span aria-hidden="true" className={cx('shrink-0', ACTION_ICON_SIZE[size])}>
          {leadingIcon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
      {trailingIcon ? (
        <span aria-hidden="true" className={cx('shrink-0', ACTION_ICON_SIZE[size])}>
          {trailingIcon}
        </span>
      ) : null}
    </Link>
  );
});
