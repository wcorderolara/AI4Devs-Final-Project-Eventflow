'use client';

import { AlertCircle } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { describedBy } from '../internal/a11y';
import { cx } from '../internal/cx';

/**
 * FormField — composición estándar de formulario (Component Foundations §15).
 *
 * `Label + [indicador required/optional] + Control + [descripción] + [helper] + [error]`.
 *
 * Diseño:
 * - **Render prop**: el control recibe los `id`/`aria-*` ya calculados, de modo que la
 *   asociación label ↔ control ↔ helper ↔ error no puede quedarse a medias por descuido.
 * - **Sin dependencia de React Hook Form**: `FormField` no importa RHF. Se compone con él
 *   spreadando `register(...)` sobre el control (ver `README.md`).
 * - **El label es siempre visible**; el placeholder no lo sustituye (§15, WCAG 3.3.2).
 * - El copy (label, helper, error, indicadores) llega traducido desde el consumidor.
 */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  'aria-required': true | undefined;
  disabled: boolean | undefined;
  readOnly: boolean | undefined;
}

export interface FormFieldCharacterCount {
  current: number;
  max: number;
  /** Descripción accesible del contador (por ejemplo `t('form.charactersLeft', { n })`). */
  label?: string;
  /**
   * Anuncia el contador con `aria-live="polite"` mientras se escribe. Desactivado por defecto
   * (es verboso); se activa donde el límite es una restricción real del contenido.
   */
  live?: boolean;
}

export interface FormFieldProps {
  /** Texto visible del label. Obligatorio (§15: nunca placeholder como único label). */
  label: ReactNode;
  /** Control del formulario; recibe los props de asociación ya resueltos. */
  children: (control: FieldControlProps) => ReactNode;
  /** Id explícito del control. Si se omite se genera con `useId()`. */
  id?: string;
  required?: boolean;
  /** Marca visible de campo obligatorio (`*`, `Obligatorio`…). La aporta el consumidor. */
  requiredIndicator?: ReactNode;
  /** Marca visible de campo opcional. Usar una u otra en todo el formulario, nunca ambas. */
  optionalIndicator?: ReactNode;
  /** Contexto adicional del campo, encima del control. */
  description?: ReactNode;
  /** Texto de ayuda neutro, debajo del control. */
  helperText?: ReactNode;
  /** Mensaje de error. Su presencia activa `aria-invalid` y la asociación por `aria-describedby`. */
  error?: ReactNode;
  characterCount?: FormFieldCharacterCount;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function FormField({
  label,
  children,
  id,
  required = false,
  requiredIndicator,
  optionalIndicator,
  description,
  helperText,
  error,
  characterCount,
  disabled = false,
  readOnly = false,
  className,
}: FormFieldProps): React.JSX.Element {
  const generatedId = useId();
  const controlId = id ?? `${generatedId}-control`;
  const descriptionId = `${generatedId}-description`;
  const helperId = `${generatedId}-helper`;
  const errorId = `${generatedId}-error`;
  const countId = `${generatedId}-count`;

  const hasError = Boolean(error);

  const control: FieldControlProps = {
    id: controlId,
    'aria-describedby': describedBy(
      description ? descriptionId : undefined,
      helperText ? helperId : undefined,
      characterCount ? countId : undefined,
      hasError ? errorId : undefined,
    ),
    'aria-invalid': hasError ? true : undefined,
    'aria-required': required ? true : undefined,
    disabled: disabled || undefined,
    readOnly: readOnly || undefined,
  };

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor={controlId}
          className={cx(
            'font-ui text-label font-medium',
            disabled ? 'text-disabled' : 'text-primary',
          )}
        >
          {label}
          {required && requiredIndicator ? (
            <span className="ml-1 text-feedback-error">{requiredIndicator}</span>
          ) : null}
          {!required && optionalIndicator ? (
            <span className="ml-1 font-normal text-secondary">{optionalIndicator}</span>
          ) : null}
        </label>
        {characterCount ? (
          <span
            id={countId}
            className="font-ui text-caption text-secondary"
            aria-label={characterCount.label}
            aria-live={characterCount.live ? 'polite' : undefined}
          >
            {`${characterCount.current}/${characterCount.max}`}
          </span>
        ) : null}
      </div>

      {description ? (
        <p id={descriptionId} className="font-body text-body-sm text-secondary">
          {description}
        </p>
      ) : null}

      {children(control)}

      {helperText ? (
        <p id={helperId} className="font-body text-caption text-secondary">
          {helperText}
        </p>
      ) : null}

      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 font-ui text-body-sm font-medium text-feedback-error"
        >
          {/* Icono + texto: el estado nunca se comunica sólo por color (UI-DEC-015). */}
          <AlertCircle aria-hidden="true" className="mt-0.5 h-icon-sm w-icon-sm shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
