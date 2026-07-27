'use client';

import { Search, X } from 'lucide-react';
import { forwardRef, type KeyboardEvent } from 'react';
import { Spinner } from '../internal/Spinner';
import { FieldAction } from './FieldAction';
import { Input, type InputProps } from './Input';

/**
 * SearchInput — campo de búsqueda (Component Foundations §16 `SearchInput`).
 *
 * - Semántica nativa `type="search"`; icono de lupa decorativo al inicio.
 * - Acción de limpiar visible sólo cuando hay valor, con nombre accesible obligatorio.
 * - `loading` muestra el spinner del sistema; el anuncio del resultado pertenece a la lista que
 *   consume la búsqueda (aquí no se añade `aria-live` para no duplicar anuncios).
 * - `clearOnEscape` está **desactivado por defecto**: dentro de un modal o un drawer, `Esc`
 *   pertenece al overlay. Se activa explícitamente donde no haya conflicto.
 * - No implementa autocompletado remoto ni sugerencias (fuera de alcance).
 */
export interface SearchInputProps extends Omit<
  InputProps,
  'type' | 'leadingIcon' | 'trailingContent'
> {
  /** Nombre accesible del botón de limpiar (por ejemplo `Limpiar búsqueda`). */
  clearLabel: string;
  /** Se invoca al limpiar. Si se omite, no se muestra la acción de limpiar. */
  onClear?: () => void;
  loading?: boolean;
  clearOnEscape?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    clearLabel,
    onClear,
    loading = false,
    clearOnEscape = false,
    disabled,
    value,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const hasValue =
    typeof value === 'string' ? value.length > 0 : value !== undefined && value !== null;
  const showClear = Boolean(onClear) && hasValue && !disabled;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (clearOnEscape && event.key === 'Escape' && hasValue && onClear) {
      event.preventDefault();
      onClear();
    }
    onKeyDown?.(event);
  };

  return (
    <Input
      {...rest}
      ref={ref}
      value={value}
      disabled={disabled}
      type="search"
      onKeyDown={handleKeyDown}
      leadingIcon={<Search />}
      trailingContent={
        <span className="flex items-center gap-1">
          {loading ? <Spinner className="h-icon-sm w-icon-sm text-muted" /> : null}
          {showClear ? (
            <FieldAction icon={<X />} aria-label={clearLabel} onClick={onClear} />
          ) : null}
        </span>
      }
    />
  );
});
