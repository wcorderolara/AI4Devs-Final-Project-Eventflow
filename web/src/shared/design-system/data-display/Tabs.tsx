'use client';

import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * Tabs — vistas relacionadas dentro del mismo contexto.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §21 (`Tabs`) y §37.
 * Referencia visual: screen Stitch *Data & Overlays* (tab list con contador en «Budget»).
 *
 * Implementa el patrón `tabs` de ARIA APG con **activación automática**: `←`/`→` mueven el foco
 * y seleccionan, `Home`/`End` van a los extremos, los deshabilitados se saltan y el recorrido es
 * circular. El tab list usa *roving tabindex*: sólo el tab activo es una parada de tabulación,
 * de modo que `Tab` lleva del tab activo directamente al panel.
 *
 * El estado activo **no depende sólo del color**: añade peso tipográfico y una barra inferior.
 *
 * Se implementa a mano en lugar de con el `TabGroup` de Headless UI porque éste identifica los
 * tabs por índice; aquí el valor es un `id` estable del dominio, que sobrevive a reordenar o
 * ocultar un tab por permisos.
 */
export interface TabItem {
  id: string;
  /** Texto visible ya traducido. */
  label: ReactNode;
  /** Contador o `Badge` opcional a la derecha del label. */
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** Nombre accesible del `tablist`, ya traducido. */
  ariaLabel: string;
  /** Modo controlado. */
  value?: string;
  /** Modo no controlado: tab inicial. Por defecto, el primero habilitado. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Contenido del panel activo. */
  children: (activeId: string) => ReactNode;
  className?: string;
  panelClassName?: string;
  'data-testid'?: string;
}

export function Tabs({
  items,
  ariaLabel,
  value,
  defaultValue,
  onChange,
  children,
  className,
  panelClassName,
  'data-testid': testId,
}: TabsProps): React.JSX.Element {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const firstEnabled = items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? '';
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? firstEnabled);
  const activeId = value ?? uncontrolled;

  const tabId = (id: string): string => `${baseId}-tab-${id}`;
  const panelId = (id: string): string => `${baseId}-panel-${id}`;

  const select = useCallback(
    (id: string) => {
      if (value === undefined) setUncontrolled(id);
      onChange?.(id);
    },
    [onChange, value],
  );

  const focusAndSelect = useCallback(
    (id: string) => {
      select(id);
      // El foco sigue a la selección (activación automática): el usuario de teclado ve
      // inmediatamente el panel correspondiente sin una pulsación extra.
      listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)?.focus();
    },
    [select],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const enabled = items.filter((item) => !item.disabled);
      if (enabled.length === 0) return;
      const current = enabled.findIndex((item) => item.id === activeId);
      const from = current === -1 ? 0 : current;

      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (from + 1) % enabled.length;
          break;
        case 'ArrowLeft':
          nextIndex = (from - 1 + enabled.length) % enabled.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = enabled.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const target = enabled[nextIndex];
      if (target) focusAndSelect(target.id);
    },
    [activeId, focusAndSelect, items],
  );

  return (
    <div className={className} data-testid={testId}>
      {/* El `tablist` **no** es focalizable: el roving tabindex vive en los `tab`, y el manejo de
          teclas también, para no colgar comportamiento de un contenedor sin foco propio. */}
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        // Overflow horizontal en pantallas estrechas: los tabs siguen siendo alcanzables por
        // teclado y por gesto; `pb-1` evita que el anillo de foco quede recortado por el scroll.
        className="flex gap-1 overflow-x-auto border-b border-subtle pb-1"
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={tabId(item.id)}
              data-tab-id={item.id}
              aria-selected={isActive}
              aria-controls={panelId(item.id)}
              disabled={item.disabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => !item.disabled && select(item.id)}
              onKeyDown={handleKeyDown}
              className={cx(
                'focus-ring inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-button',
                'border-b-2 px-3 py-2 font-ui text-body-sm',
                'transition-colors duration-fast ease-standard motion-reduce:transition-none',
                'disabled:cursor-not-allowed disabled:opacity-disabled',
                isActive
                  ? // Peso + barra de acento además del color (UI-DEC-014 / §37).
                    'border-interactive font-semibold text-link'
                  : 'border-transparent font-medium text-secondary hover:text-primary',
              )}
            >
              <span>{item.label}</span>
              {item.badge !== undefined ? <span className="shrink-0">{item.badge}</span> : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId(activeId)}
        aria-labelledby={tabId(activeId)}
        // `tabIndex={0}`: el panel puede tener contenido no focalizable y aun así debe poder
        // recibir el foco al tabular desde el tab activo (ARIA APG).
        tabIndex={0}
        className={cx('focus-ring mt-4 rounded-card', panelClassName)}
      >
        {children(activeId)}
      </div>
    </div>
  );
}
