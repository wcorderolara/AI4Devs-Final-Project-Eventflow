'use client';

import Link from 'next/link';
import { forwardRef, useEffect, type ElementType, type ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * Card — contenedor canónico para agrupar información relacionada.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §22 (`Card`) y §37.
 * Referencia visual: screen Stitch *Data & Overlays* (fila «Cards»: Default · Interactive ·
 * Subtle · superficie destacada). Stitch es evidencia de anatomía y proporción; sus valores
 * generados (violeta propio, sombras inventadas) **no** se propagan.
 *
 * Reglas:
 * - **Una card interactiva es un `<a>` o un `<button>` real.** Un `div` con `cursor-pointer` no
 *   es accesible: no recibe foco, no responde a `Enter`/`Space` y no expone rol. Por eso la
 *   interactividad se declara con `href` (navegación) o `onSelect` (acción), nunca con `variant`.
 * - **No** existe una variante «AI»: la superficie de IA es un componente propio (§31) y
 *   recrearla aquí duplicaría el patrón human-in-the-loop.
 * - No lleva copy ni datos de negocio: todo llega por `children` desde el feature.
 */
export type CardVariant = 'default' | 'interactive' | 'subtle' | 'selected' | 'marketing';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardOwnProps {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Elemento semántico cuando la card **no** es interactiva (`li` en listas, `article`…). */
  as?: Extract<ElementType, 'div' | 'section' | 'article' | 'li'>;
  /** Destino de navegación: la card entera se renderiza como `next/link`. */
  href?: string;
  /** Acción: la card entera se renderiza como `<button type="button">`. */
  onSelect?: () => void;
  /**
   * Nombre accesible de la card interactiva cuando el contenido visible no basta
   * (por ejemplo cuando el título se repite entre filas).
   */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Marca la card como seleccionada dentro de un grupo (aplica `aria-current`). */
  selected?: boolean;
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

export type CardProps = CardOwnProps;

const VARIANT: Record<CardVariant, string> = {
  default: 'border border-subtle bg-surface shadow-surface-subtle',
  // Hover eleva a `surface.raised` y el borde pasa a interactivo (Component Foundations §22).
  interactive:
    'border border-subtle bg-surface shadow-surface-subtle hover:border-interactive ' +
    'hover:shadow-surface-raised',
  // Operacional: agrupa sin destacar — sin sombra, superficie ligeramente más oscura.
  subtle: 'border border-subtle bg-surface-subtle',
  selected: 'border border-interactive bg-surface-selected shadow-surface-subtle',
  // Marketing: radio prominente, sin borde (UI-DEC-007).
  marketing: 'rounded-card-prominent bg-surface shadow-marketing-floating',
};

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-6 sm:p-8',
};

const INTERACTIVE_BASE =
  'focus-ring block w-full text-left transition-[box-shadow,border-color] duration-fast ' +
  'ease-standard motion-reduce:transition-none';

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    variant,
    padding = 'md',
    as = 'div',
    href,
    onSelect,
    selected = false,
    className,
    children,
    'data-testid': testId,
    ...rest
  },
  ref,
) {
  const isInteractive = href !== undefined || onSelect !== undefined;
  const resolvedVariant: CardVariant =
    selected && variant === undefined
      ? 'selected'
      : (variant ?? (isInteractive ? 'interactive' : 'default'));

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (variant === 'interactive' && !isInteractive) {
      // eslint-disable-next-line no-console
      console.error(
        '[EventFlow design-system] Card: `variant="interactive"` sin `href` ni `onSelect`. ' +
          'Una card interactiva debe ser un enlace o un botón real (WCAG 2.1 AA 2.1.1).',
      );
    }
  }, [variant, isInteractive]);

  const shared = cx(
    'rounded-card',
    VARIANT[resolvedVariant],
    PADDING[padding],
    isInteractive && INTERACTIVE_BASE,
    className,
  );

  if (href !== undefined) {
    return (
      <Link
        {...rest}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        aria-current={selected ? 'true' : undefined}
        data-testid={testId}
        data-variant={resolvedVariant}
        className={shared}
      >
        {children}
      </Link>
    );
  }

  if (onSelect !== undefined) {
    return (
      <button
        {...rest}
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onSelect}
        aria-pressed={selected || undefined}
        data-testid={testId}
        data-variant={resolvedVariant}
        className={shared}
      >
        {children}
      </button>
    );
  }

  const Element = as;
  return (
    <Element
      {...rest}
      ref={ref as React.Ref<never>}
      data-testid={testId}
      data-variant={resolvedVariant}
      className={shared}
    >
      {children}
    </Element>
  );
});

/* ------------------------------------------------------------------ *
 * Anatomía: Header · Title · Description · Content · Footer
 * ------------------------------------------------------------------ */

export interface CardHeaderProps {
  /** Glifo Lucide decorativo antes del título. */
  icon?: ReactNode;
  /**
   * Acción de cabecera (menú, botón). **No** usarla dentro de una card interactiva: anidar
   * controles rompe la semántica del enlace/botón que envuelve la card.
   */
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CardHeader({
  icon,
  action,
  className,
  children,
}: CardHeaderProps): React.JSX.Element {
  return (
    <div className={cx('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center justify-center rounded-button bg-surface-subtle p-2 text-secondary [&>svg]:h-icon-md [&>svg]:w-icon-md"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface CardTitleProps {
  /** Nivel semántico: debe respetar la jerarquía de la página que monta la card. */
  headingLevel?: 2 | 3 | 4 | 5;
  id?: string;
  className?: string;
  children: ReactNode;
}

export function CardTitle({
  headingLevel = 3,
  id,
  className,
  children,
}: CardTitleProps): React.JSX.Element {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5';
  return (
    <Heading
      id={id}
      className={cx('font-heading text-body-md font-semibold text-primary', className)}
    >
      {children}
    </Heading>
  );
}

export function CardDescription({
  className,
  children,
  id,
}: {
  className?: string;
  children: ReactNode;
  id?: string;
}): React.JSX.Element {
  return (
    <p id={id} className={cx('mt-1 font-body text-body-sm text-secondary', className)}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  return <div className={cx('mt-4', className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={cx(
        'mt-4 flex flex-col items-stretch gap-2 border-t border-subtle pt-4',
        'sm:flex-row sm:items-center sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}
