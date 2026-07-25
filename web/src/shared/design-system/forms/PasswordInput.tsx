'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { FieldAction } from './FieldAction';
import { Input, type InputProps } from './Input';

/**
 * PasswordInput — contraseña con alternancia mostrar/ocultar (Component Foundations §16).
 *
 * - Alternar **no** cambia el valor ni reemplaza el nodo del `<input>`: sólo su `type`, de modo
 *   que se conservan el caret, el historial de deshacer y la compatibilidad con gestores de
 *   contraseñas (el `autoComplete` del consumidor se respeta tal cual).
 * - El botón anuncia su estado con un nombre accesible distinto por estado (`showLabel` /
 *   `hideLabel`), traducido por el consumidor.
 */
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailingContent'> {
  /** Nombre accesible del botón cuando la contraseña está oculta (por ejemplo `Mostrar contraseña`). */
  showLabel: string;
  /** Nombre accesible del botón cuando la contraseña es visible (por ejemplo `Ocultar contraseña`). */
  hideLabel: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ showLabel, hideLabel, disabled, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        {...rest}
        ref={ref}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        trailingContent={
          <FieldAction
            icon={visible ? <EyeOff /> : <Eye />}
            aria-label={visible ? hideLabel : showLabel}
            aria-pressed={visible}
            disabled={disabled}
            onClick={() => setVisible((current) => !current)}
          />
        }
      />
    );
  },
);
