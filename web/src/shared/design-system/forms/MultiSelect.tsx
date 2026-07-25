'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { isAriaInvalid } from '../internal/a11y';
import { cx } from '../internal/cx';
import { FIELD_HEIGHT, FIELD_TEXT, fieldSurface, type FieldSize } from './fieldStyles';

/**
 * MultiSelect — selección múltiple reutilizable (Component Foundations §17, §24 `FilterBar`).
 *
 * Implementación **propia** siguiendo el patrón ARIA de listbox: no existe un equivalente
 * nativo aceptable (`<select multiple>` es hostil en móvil y no admite chips) y se prefiere no
 * acoplar el comportamiento a una librería de overlays para poder testear teclado, foco y
 * anuncios de forma determinista. No se instala ninguna dependencia nueva.
 *
 * Comportamiento cubierto:
 * - Toggle con `Enter`/`Space`; navegación con `↑`/`↓`/`Home`/`End`.
 * - `Esc` cierra y **devuelve el foco al trigger**; `Tab` y el clic fuera también cierran.
 * - Chips removibles + `limpiar todo`, o resumen compacto (`display="summary"`).
 * - Región `aria-live` con el resumen de la selección.
 *
 * El componente es genérico: **no** contiene opciones de negocio. Los estados de evento
 * (`Borrador`, `Activo`, `Completado`, `Cancelado`) se pasan desde el feature — ver `README.md`.
 */
export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  /** Id del trigger; lo inyecta `FormField` para asociar el label visible. */
  id?: string;
  options: readonly MultiSelectOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Texto del trigger sin selección. */
  placeholder: string;
  /** Texto del trigger y de la región `aria-live` con la selección actual. */
  summaryLabel: (count: number) => string;
  /** Nombre accesible del botón que quita una opción (`Quitar {label}`). */
  removeOptionLabel: (label: string) => string;
  /** Label del botón "limpiar todo". Si se omite, la acción no se muestra. */
  clearAllLabel?: string;
  /** `chips` (default) muestra las selecciones como chips removibles. */
  display?: 'chips' | 'summary';
  selectSize?: FieldSize;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean;
}

export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  summaryLabel,
  removeOptionLabel,
  clearAllLabel,
  display = 'chips',
  selectSize = 'md',
  disabled = false,
  invalid,
  className,
  ...aria
}: MultiSelectProps): React.JSX.Element {
  const generatedId = useId();
  const triggerId = id ?? `${generatedId}-trigger`;
  const listId = `${generatedId}-listbox`;
  const optionId = (optionValue: string): string => `${generatedId}-option-${optionValue}`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const hasError = invalid === true || isAriaInvalid(aria['aria-invalid']);
  const selected = new Set(value);
  const selectedOptions = options.filter((option) => selected.has(option.value));

  const closeAndFocusTrigger = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Clic fuera: cierra sin mover el foco (el usuario ya está apuntando a otro sitio).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Al abrir, el foco pasa a la lista para que `aria-activedescendant` sea válido.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const openList = (): void => {
    if (disabled) return;
    const firstSelected = options.findIndex((option) => selected.has(option.value));
    setActiveIndex(firstSelected >= 0 ? firstSelected : 0);
    setOpen(true);
  };

  const toggle = (optionValue: string): void => {
    const next = selected.has(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue];
    onChange([...next]);
  };

  const moveActive = (delta: number): void => {
    if (options.length === 0) return;
    let next = activeIndex;
    for (let step = 0; step < options.length; step += 1) {
      next = (next + delta + options.length) % options.length;
      if (options[next]?.disabled !== true) break;
    }
    setActiveIndex(next);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const option = options[activeIndex];
        if (option && option.disabled !== true) toggle(option.value);
        break;
      }
      case 'Escape':
        event.preventDefault();
        closeAndFocusTrigger();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const activeOption = options[activeIndex];

  return (
    <div ref={containerRef} className={cx('flex flex-col gap-2', className)}>
      <div className="relative">
        <button
          id={triggerId}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          // Patrón ARIA 1.2 "select-only combobox": el trigger expone `combobox` y el popup
          // `listbox`. Con el rol implícito `button` no se admitirían `aria-invalid`/`aria-required`.
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-describedby={aria['aria-describedby']}
          aria-invalid={hasError ? true : undefined}
          aria-required={aria['aria-required'] ? true : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onTriggerKeyDown}
          className={cx(
            fieldSurface({ invalid: hasError, disabled }),
            'focus-ring flex w-full items-center justify-between gap-2 px-3 text-left font-body',
            FIELD_HEIGHT[selectSize],
            FIELD_TEXT[selectSize],
          )}
        >
          <span className={cx('truncate', value.length === 0 && 'text-muted')}>
            {value.length === 0 ? placeholder : summaryLabel(value.length)}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cx(
              'h-icon-sm w-icon-sm shrink-0',
              disabled ? 'text-disabled' : 'text-secondary',
            )}
          />
        </button>

        {open ? (
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={triggerId}
            aria-activedescendant={activeOption ? optionId(activeOption.value) : undefined}
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            onBlur={(event) => {
              // Foco que sale del popup por medios distintos a `Esc`/clic fuera.
              if (!containerRef.current?.contains(event.relatedTarget as Node | null))
                setOpen(false);
            }}
            className={cx(
              'absolute left-0 right-0 top-full z-dropdown mt-1 max-h-60 overflow-auto',
              'rounded-card border border-subtle bg-surface-elevated py-1 shadow-overlay-dropdown outline-none',
            )}
          >
            {options.map((option, index) => {
              const isSelected = selected.has(option.value);
              return (
                // El teclado se gestiona en el contenedor `role="listbox"` (patrón ARIA APG con
                // `aria-activedescendant`); las opciones no son tabulables ni llevan listener propio.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={option.value}
                  id={optionId(option.value)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled === true ? true : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    if (option.disabled !== true) toggle(option.value);
                  }}
                  className={cx(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 font-body text-body-sm',
                    index === activeIndex && 'bg-action-ghost-hover',
                    isSelected ? 'text-primary' : 'text-secondary',
                    option.disabled === true && 'cursor-not-allowed text-disabled',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'inline-flex h-icon-sm w-icon-sm shrink-0 items-center justify-center rounded-sm border',
                      isSelected
                        ? 'border-interactive bg-action-primary text-inverse'
                        : 'border-default',
                    )}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="min-w-0 break-words">{option.label}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {display === 'chips' && selectedOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex max-w-full items-center gap-1 rounded-badge bg-surface-subtle py-1 pl-3 pr-1 font-ui text-caption text-primary"
            >
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={removeOptionLabel(option.label)}
                onClick={() => toggle(option.value)}
                className="focus-ring inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-badge text-secondary hover:bg-action-ghost-hover hover:text-primary disabled:cursor-not-allowed"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {clearAllLabel ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange([])}
              className="focus-ring rounded-button px-2 py-1 font-ui text-caption text-link underline disabled:cursor-not-allowed disabled:text-disabled"
            >
              {clearAllLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {value.length === 0 ? placeholder : summaryLabel(value.length)}
      </span>
    </div>
  );
}
