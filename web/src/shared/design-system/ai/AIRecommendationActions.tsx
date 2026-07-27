'use client';

import { Button } from '../actions/Button';
import { cx } from '../internal/cx';

/**
 * AIRecommendationActions — el grupo canónico de acciones sobre una sugerencia de IA.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §31 (`AIActionGroup`).
 *
 * - **Orden fijo**: `Aceptar` (primary) → `Editar` (secondary) → `Regenerar` (secondary) →
 *   `Rechazar` (ghost). El orden es del sistema, no del consumidor: la acción con consecuencias
 *   va primera y el orden de tabulación es estable en toda la aplicación.
 * - **Rechazar no es destructivo.** Descartar una sugerencia no borra datos del usuario, así que
 *   usa `ghost`, nunca el rojo de la familia error (§31 y UI-DEC-014).
 * - **Nada es implícito**: una acción se pinta sólo si el feature la aporta. Ninguna sugerencia
 *   se acepta por seguir el flujo.
 * - El copy y los nombres accesibles llegan traducidos desde el feature.
 */
export interface AIActionDescriptor {
  /** Texto visible ya traducido, orientado a la consecuencia (`Aplicar al presupuesto`). */
  label: string;
  /** Nombre accesible completo cuando el label visible es ambiguo entre varias sugerencias. */
  ariaLabel?: string;
  onSelect: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}

export interface AIRecommendationActionsProps {
  /** Nombre accesible del grupo, ya traducido (`Acciones de la sugerencia`). */
  groupLabel: string;
  accept?: AIActionDescriptor;
  edit?: AIActionDescriptor;
  regenerate?: AIActionDescriptor;
  reject?: AIActionDescriptor;
  /** Bloquea todo el grupo mientras una acción está en vuelo. */
  isBusy?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function AIRecommendationActions({
  groupLabel,
  accept,
  edit,
  regenerate,
  reject,
  isBusy = false,
  className,
  'data-testid': testId,
}: AIRecommendationActionsProps): React.JSX.Element {
  const render = (
    action: AIActionDescriptor | undefined,
    variant: 'primary' | 'secondary' | 'ghost',
    key: string,
  ): React.JSX.Element | null => {
    if (!action) return null;
    return (
      <Button
        key={key}
        data-testid={`ai-action-${key}`}
        variant={variant}
        // En móvil las acciones ocupan el ancho completo y se apilan: nunca se recortan ni
        // desbordan horizontalmente aunque la traducción sea larga (§31 responsive).
        fullWidth
        className="sm:w-auto"
        aria-label={action.ariaLabel}
        onClick={action.onSelect}
        disabled={action.disabled || isBusy}
        isLoading={action.isLoading}
        loadingLabel={action.loadingLabel}
      >
        {action.label}
      </Button>
    );
  };

  return (
    <div
      role="group"
      aria-label={groupLabel}
      data-testid={testId}
      className={cx(
        'flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {render(accept, 'primary', 'accept')}
      {render(edit, 'secondary', 'edit')}
      {render(regenerate, 'secondary', 'regenerate')}
      {render(reject, 'ghost', 'reject')}
    </div>
  );
}
