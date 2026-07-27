/**
 * Escalas visuales compartidas por las acciones canónicas (`Button` y `ActionLink`).
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §11 (variantes) y §10
 * (modelo de tamaños). Sigue el precedente de `forms/fieldStyles.ts`.
 *
 * Existe para que una acción que **navega** (un `<a>`) y una que **ejecuta** (un `<button>`) se
 * vean idénticas sin copiar las clases: si se duplicaran, la landing y el header acabarían con
 * una píldora ligeramente distinta a la del resto del producto.
 */
export type ActionVariant = 'primary' | 'marketing' | 'secondary' | 'ghost' | 'destructive';
export type ActionSize = 'sm' | 'md' | 'lg';

/** Base compartida: forma, tipografía de UI, foco canónico y transición aprobada. */
export const ACTION_BASE =
  'focus-ring inline-flex select-none items-center justify-center rounded-button font-ui font-semibold ' +
  'transition-colors duration-fast ease-standard';

export const ACTION_VARIANT: Record<ActionVariant, string> = {
  primary:
    'bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover ' +
    'active:bg-action-primary-active disabled:bg-action-primary-disabled disabled:text-disabled',
  marketing:
    'bg-action-marketing text-action-marketing-foreground hover:bg-action-marketing-hover ' +
    'disabled:opacity-disabled',
  secondary:
    'border border-action-secondary bg-action-secondary text-primary ' +
    'hover:bg-action-secondary-hover disabled:opacity-disabled',
  ghost: 'bg-transparent text-primary hover:bg-action-ghost-hover disabled:opacity-disabled',
  destructive:
    'bg-action-destructive text-action-destructive-foreground hover:bg-action-destructive-hover ' +
    'disabled:opacity-disabled',
};

/**
 * Alturas de `size.control.*` (32/40/48). `sm` y `md` quedan por debajo del mínimo táctil de
 * 44 px, por lo que añaden `.hit-area` — expansión invisible del área de pulsación
 * (Component Foundations §10: "se logra con área táctil ampliada aun cuando el visual mida 32 px").
 */
export const ACTION_SIZE: Record<ActionSize, string> = {
  sm: 'hit-area h-8 gap-2 px-3 text-body-sm',
  md: 'hit-area h-10 gap-2 px-4 text-body-sm',
  lg: 'h-12 gap-2 px-5 text-body-md',
};

export const ACTION_ICON_SIZE: Record<ActionSize, string> = {
  sm: 'h-icon-sm w-icon-sm',
  md: 'h-icon-sm w-icon-sm',
  lg: 'h-icon-md w-icon-md',
};
