'use client';

import { ChevronDown } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../internal/cx';

/**
 * Accordion — divulgación progresiva de contenido secundario.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §21 (`Accordion`) y §37.
 * Referencia visual: screen Stitch *Data & Overlays* (items cerrado y abierto con chevron).
 *
 * - El trigger es un `<button>` nativo dentro de un heading semántico: `Enter`/`Espacio`
 *   funcionan sin código propio y el índice de encabezados de la página sigue siendo navegable.
 * - `↑`/`↓` mueven entre cabeceras del mismo acordeón; `Home`/`End` van a los extremos.
 * - El panel **se desmonta** al cerrarse. No se anima la altura: animar `height` sobre contenido
 *   de altura desconocida provoca saltos de layout y deja el contenido a medio ocultar cuando el
 *   usuario reduce el movimiento. El único movimiento es la rotación del chevron, que se anula
 *   con `motion-reduce`.
 * - **No** usar para contenido que deba estar visible de entrada (campos obligatorios, errores).
 */
export type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  baseId: string;
  handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion(component: string): AccordionContextValue {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error(`[EventFlow design-system] ${component} debe usarse dentro de <Accordion>.`);
  }
  return context;
}

export interface AccordionProps {
  /** `single` cierra el resto al abrir uno; `multiple` permite varios abiertos. */
  type?: AccordionType;
  /** Modo controlado: ids abiertos. */
  value?: readonly string[];
  /** Modo no controlado: ids abiertos inicialmente. */
  defaultValue?: readonly string[];
  onChange?: (value: string[]) => void;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

export function Accordion({
  type = 'single',
  value,
  defaultValue,
  onChange,
  className,
  children,
  'data-testid': testId,
}: AccordionProps): React.JSX.Element {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState<string[]>(() => [...(defaultValue ?? [])]);
  const open = useMemo(() => [...(value ?? uncontrolled)], [value, uncontrolled]);

  const toggle = useCallback(
    (id: string) => {
      const next = open.includes(id)
        ? open.filter((entry) => entry !== id)
        : type === 'single'
          ? [id]
          : [...open, id];
      if (value === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [onChange, open, type, value],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const triggers = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-accordion-trigger]:not([disabled])',
      ) ?? [],
    );
    if (triggers.length === 0) return;
    const current = triggers.indexOf(event.currentTarget);
    const from = current === -1 ? 0 : current;
    const target =
      event.key === 'ArrowDown'
        ? triggers[(from + 1) % triggers.length]
        : event.key === 'ArrowUp'
          ? triggers[(from - 1 + triggers.length) % triggers.length]
          : event.key === 'Home'
            ? triggers[0]
            : triggers[triggers.length - 1];
    event.preventDefault();
    target?.focus();
  }, []);

  const contextValue = useMemo<AccordionContextValue>(
    () => ({ isOpen: (id) => open.includes(id), toggle, baseId, handleKeyDown }),
    [baseId, handleKeyDown, open, toggle],
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-testid={testId}
        className={cx('divide-y divide-separator rounded-card border border-subtle', className)}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextValue {
  value: string;
  disabled: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

export interface AccordionItemProps {
  /** Identificador estable del item. */
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function AccordionItem({
  value,
  disabled = false,
  className,
  children,
}: AccordionItemProps): React.JSX.Element {
  const item = useMemo(() => ({ value, disabled }), [disabled, value]);
  return (
    <AccordionItemContext.Provider value={item}>
      <div data-accordion-item={value} className={className}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

function useAccordionItem(component: string): AccordionItemContextValue {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error(
      `[EventFlow design-system] ${component} debe usarse dentro de <AccordionItem>.`,
    );
  }
  return context;
}

export interface AccordionTriggerProps {
  /** Nivel del heading que envuelve el botón. Debe respetar la jerarquía de la página. */
  headingLevel?: 2 | 3 | 4 | 5;
  className?: string;
  children: ReactNode;
}

export function AccordionTrigger({
  headingLevel = 3,
  className,
  children,
}: AccordionTriggerProps): React.JSX.Element {
  const { isOpen, toggle, baseId, handleKeyDown } = useAccordion('AccordionTrigger');
  const { value, disabled } = useAccordionItem('AccordionTrigger');
  const open = isOpen(value);
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5';

  return (
    <Heading className="m-0">
      <button
        type="button"
        data-accordion-trigger=""
        id={`${baseId}-trigger-${value}`}
        aria-expanded={open}
        aria-controls={`${baseId}-panel-${value}`}
        disabled={disabled}
        onClick={() => toggle(value)}
        onKeyDown={handleKeyDown}
        className={cx(
          'focus-ring flex w-full min-h-touch items-center justify-between gap-3 px-4 py-3 text-left',
          'font-ui text-body-sm font-semibold text-primary',
          'transition-colors duration-fast ease-standard motion-reduce:transition-none',
          'hover:bg-action-ghost-hover disabled:cursor-not-allowed disabled:opacity-disabled',
          className,
        )}
      >
        <span className="min-w-0">{children}</span>
        <ChevronDown
          aria-hidden="true"
          className={cx(
            'h-icon-sm w-icon-sm shrink-0 text-secondary',
            'transition-transform duration-fast ease-standard motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
    </Heading>
  );
}

export function AccordionPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): React.JSX.Element | null {
  const { isOpen, baseId } = useAccordion('AccordionPanel');
  const { value } = useAccordionItem('AccordionPanel');
  if (!isOpen(value)) return null;

  return (
    <div
      id={`${baseId}-panel-${value}`}
      role="region"
      aria-labelledby={`${baseId}-trigger-${value}`}
      className={cx('px-4 pb-4 font-body text-body-sm text-secondary', className)}
    >
      {children}
    </div>
  );
}
