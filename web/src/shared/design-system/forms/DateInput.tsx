'use client';

import { forwardRef } from 'react';
import { Input, type InputProps } from './Input';

/**
 * DateInput — fecha con el control nativo (Component Foundations §18).
 *
 * **Decisión de implementación (cierra CMP-Q-004 para el MVP):** `<input type="date">`.
 * Motivos: es el patrón ya instalado (wizard de evento, `valid_until`, filtros admin), el
 * navegador aporta calendario accesible por teclado y la **presentación locale-aware** que exige
 * §18 sin añadir dependencias. No se introduce ninguna librería de date-picker ni integración
 * con calendarios externos (fuera de alcance).
 *
 * `min`/`max` expresan las restricciones de ciclo de vida del evento; la validación real es del
 * feature (Zod + backend), aquí sólo se restringe el control.
 */
export interface DateInputProps extends Omit<
  InputProps,
  'type' | 'leadingIcon' | 'prefix' | 'suffix'
> {
  /** Fecha mínima en formato `YYYY-MM-DD`. */
  min?: string;
  /** Fecha máxima en formato `YYYY-MM-DD`. */
  max?: string;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, ...rest },
  ref,
) {
  return <Input {...rest} ref={ref} type="date" className={className} />;
});
