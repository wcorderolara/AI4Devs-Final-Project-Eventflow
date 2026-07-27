/**
 * Estilos compartidos por los controles de formulario (Component Foundations §16).
 *
 * Todos los valores salen de las utilidades semánticas generadas por `tailwind.config.ts` a
 * partir de `shared/design-tokens` (alias `input.*`, `focus.ring.*`, `radius.input`,
 * `size.control.*`). Ningún control declara color, radio ni altura por su cuenta.
 */
import { cx } from '../internal/cx';

export type FieldSize = 'sm' | 'md' | 'lg';

/**
 * Alturas de `size.control.*` (32 / 40 / 48 px).
 *
 * A diferencia de `Button`/`IconButton`, los campos de texto **no** usan `.hit-area`: el
 * pseudo-elemento de ampliación se pintaría por encima del contenido interno (icono de limpiar,
 * toggle de contraseña) y bloquearía sus clics. Un campo ocupa todo el ancho de la columna, así
 * que el área de puntero real es amplia; cuando un flujo es táctil-crítico se usa `lg` (48 px).
 */
export const FIELD_HEIGHT: Record<FieldSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

export const FIELD_TEXT: Record<FieldSize, string> = {
  sm: 'text-body-sm',
  md: 'text-body-md',
  lg: 'text-body-md',
};

/** Superficie, borde, radio y estados del contenedor de un control. */
export function fieldSurface(options: {
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}): string {
  return cx(
    'rounded-input border bg-surface text-primary',
    'transition-colors duration-fast ease-standard',
    options.invalid ? 'border-feedback-error' : 'border-default',
    !options.disabled && !options.invalid && 'hover:border-strong',
    options.disabled && 'cursor-not-allowed border-disabled bg-surface-disabled text-disabled',
    options.readOnly && !options.disabled && 'bg-surface-subtle',
  );
}

/** Foco canónico de un control: anillo `focus-visible` + borde interactivo. */
export const FIELD_FOCUS = 'focus-ring focus-visible:border-interactive';

/** Estilos del `<input>`/`<textarea>` desnudo cuando vive dentro de un contenedor decorado. */
export const FIELD_INNER_CONTROL = cx(
  'w-full min-w-0 border-0 bg-transparent p-0 font-body text-primary outline-none',
  'placeholder:text-muted disabled:cursor-not-allowed disabled:text-disabled',
);
