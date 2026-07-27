'use client';

import { useId, type ReactNode } from 'react';
import { Button } from '../actions/Button';
import { StatusBadge, type StatusTone } from '../feedback/StatusBadge';
import { cx } from '../internal/cx';
import { AILabel } from './AILabel';
import { AIRecommendationLoading } from './AIRecommendationLoading';

/**
 * AIRecommendationCard — superficie canónica de una sugerencia de IA pendiente de revisión.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §31 (`AIRecommendation`),
 * UI-DEC-010 y NFR-AI-001. Referencia visual: screen Stitch *AI, Marketing & Final Notes*
 * (fila «AI Recommendation Card (States)»: pending · loading · editing · applied).
 *
 * **Human-in-the-loop es la regla, no una opción.** Una sugerencia sigue siendo una sugerencia
 * hasta que alguien la acepta explícitamente:
 * - En los estados revisables (`pending`, `fallback`) el contenido vive sobre la superficie
 *   `ai.*`, visiblemente distinta de un dato confirmado.
 * - Al aceptarse (`accepted` / `edited`) el contenido **abandona la presentación de sugerencia**:
 *   pasa a superficie neutra y desaparecen los controles pendientes (§31 states). Presentar
 *   output aceptado con el mismo cromo que output pendiente es justo el anti-patrón que la
 *   sección prohíbe.
 * - `rejected` no vuelve a parecer un pendiente activo.
 *
 * **Un solo componente, ocho estados.** No hay una card por estado ni por feature: las ocho
 * familias AI (plan, checklist, presupuesto, categorías, brief, resumen de cotizaciones,
 * priorización) componen ésta y aportan su contenido por `children`.
 *
 * **La primitiva no sabe de negocio**: no llama a la API, no ejecuta mutaciones, no conoce
 * permisos, esquemas ni DTOs. El feature traduce su modelo a esta API.
 *
 * De la pantalla Stitch se toma la anatomía y la secuencia de estados. **No** se toma su copy
 * («Basado en tus eventos anteriores» describe una personalización por historial que el MVP no
 * tiene), ni su lila de IA generado, ni Font Awesome, ni el borde `border-primary` genérico.
 */
export type AIRecommendationState =
  'loading' | 'pending' | 'fallback' | 'editing' | 'accepted' | 'edited' | 'rejected' | 'error';

export interface AIRecommendationCardProps {
  state: AIRecommendationState;
  /** Divulgación visible de origen, ya traducida. Obligatoria en todos los estados. */
  aiLabel: string;
  aiLabelAriaLabel?: string;
  /**
   * Copy del estado actual, ya traducido (`Sugerencia aplicada`, `Editando sugerencia`).
   * El estado **nunca** se comunica sólo con color: sin este texto no se pinta el badge.
   */
  statusLabel?: string;
  title?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  /** Tipo de recomendación ya traducido (`Checklist`, `Presupuesto`). */
  recommendationType?: ReactNode;
  description?: ReactNode;
  /** Contenido estructurado de la sugerencia (lista, tabla, `DescriptionList`…). */
  children?: ReactNode;
  /**
   * Nota de contexto ya traducida. Sólo debe describir señales que el producto realmente usa
   * (tipo de evento, invitados, presupuesto declarado): no afirmar personalización por historial.
   */
  contextNote?: ReactNode;
  /** Metadata secundaria del feature (fecha de generación, indicador de caché). */
  meta?: ReactNode;

  /* --- loading ---------------------------------------------------------- */
  loadingLabel?: string;
  loadingHint?: string;

  /* --- fallback --------------------------------------------------------- */
  /**
   * Copy del fallback ya traducido. Explica que el contenido viene de una plantilla base y que
   * sigue siendo revisable; **nunca** nombra al proveedor ni expone el error que lo motivó.
   */
  fallbackLabel?: string;
  fallbackAriaLabel?: string;

  /* --- error ------------------------------------------------------------ */
  /** Mensaje ya preparado por el feature. Sólo `string`: no admite un `Error` ni un payload. */
  errorMessage?: string;
  correlationId?: string;
  correlationLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  dismissLabel?: string;

  /* --- editing ---------------------------------------------------------- */
  /** Controles de edición del feature (`FormField` + `Input`/`Textarea`). */
  editor?: ReactNode;
  onCancelEdit?: () => void;
  cancelEditLabel?: string;
  onSaveEdit?: () => void;
  saveEditLabel?: string;
  /** Bloquea el guardado y evita el doble envío mientras la mutación está en vuelo. */
  isSubmitting?: boolean;
  submittingLabel?: string;

  /* --- revisión --------------------------------------------------------- */
  /** Área de acciones de revisión. Su contenido canónico es `AIRecommendationActions`. */
  actions?: ReactNode;

  className?: string;
  'data-testid'?: string;
}

/** Los estados AI reutilizan las familias de feedback aprobadas; no hay paleta AI paralela. */
const STATUS_TONE: Record<AIRecommendationState, StatusTone> = {
  loading: 'info',
  pending: 'info',
  fallback: 'warning',
  editing: 'info',
  accepted: 'success',
  edited: 'info',
  rejected: 'neutral',
  error: 'error',
};

/** Estados en los que el contenido todavía es una propuesta y vive sobre la superficie de IA. */
const AI_SURFACE_STATES = new Set<AIRecommendationState>([
  'loading',
  'pending',
  'fallback',
  'editing',
]);

const SURFACE: Record<AIRecommendationState, string> = {
  loading: 'border-ai bg-ai-surface',
  pending: 'border-ai bg-ai-surface',
  fallback: 'border-ai bg-ai-surface',
  editing: 'border-ai bg-ai-surface',
  // Aceptado / editado / rechazado: el contenido ya no es una sugerencia (§31 states).
  accepted: 'border-subtle bg-surface',
  edited: 'border-subtle bg-surface',
  rejected: 'border-subtle bg-surface-subtle',
  error: 'border-feedback-error bg-surface',
};

export function AIRecommendationCard({
  state,
  aiLabel,
  aiLabelAriaLabel,
  statusLabel,
  title,
  headingLevel = 3,
  recommendationType,
  description,
  children,
  contextNote,
  meta,
  loadingLabel,
  loadingHint,
  fallbackLabel,
  fallbackAriaLabel,
  errorMessage,
  correlationId,
  correlationLabel,
  onRetry,
  retryLabel,
  onDismiss,
  dismissLabel,
  editor,
  onCancelEdit,
  cancelEditLabel,
  onSaveEdit,
  saveEditLabel,
  isSubmitting = false,
  submittingLabel,
  actions,
  className,
  'data-testid': testId,
}: AIRecommendationCardProps): React.JSX.Element {
  const generatedId = useId();
  const headingId = `${generatedId}-title`;
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  const isLoading = state === 'loading';
  const isEditing = state === 'editing';
  const isError = state === 'error';
  // Sólo lo revisable conserva acciones pendientes; lo confirmado ya no las tiene.
  const showReviewActions = state === 'pending' || state === 'fallback';

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      aria-busy={isLoading || undefined}
      data-testid={testId}
      data-state={state}
      className={cx(
        'rounded-card border p-4 shadow-surface-subtle sm:p-6',
        SURFACE[state],
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <AILabel
            label={aiLabel}
            ariaLabel={aiLabelAriaLabel}
            // El aviso de fallback acompaña a la divulgación de origen: es información sobre
            // de dónde salió el contenido, no sobre en qué punto del flujo está.
            fallbackLabel={state === 'fallback' ? fallbackLabel : undefined}
            fallbackAriaLabel={state === 'fallback' ? fallbackAriaLabel : undefined}
          />
          {recommendationType ? (
            <span className="font-ui text-caption text-secondary">{recommendationType}</span>
          ) : null}
        </div>
        {statusLabel ? (
          <StatusBadge status={STATUS_TONE[state]} data-testid="ai-recommendation-status">
            {statusLabel}
          </StatusBadge>
        ) : null}
      </header>

      {title ? (
        <Heading
          id={headingId}
          className={cx(
            'mt-3 font-heading text-body-md font-semibold',
            AI_SURFACE_STATES.has(state) ? 'text-ai-text' : 'text-primary',
          )}
        >
          {title}
        </Heading>
      ) : null}

      {description && !isLoading ? (
        <p className="mt-1 font-body text-body-sm text-secondary">{description}</p>
      ) : null}

      {isLoading ? (
        <AIRecommendationLoading
          className="mt-3"
          label={loadingLabel ?? aiLabel}
          hint={loadingHint}
          data-testid="ai-recommendation-loading"
        />
      ) : null}

      {isEditing && editor ? <div className="mt-4">{editor}</div> : null}

      {!isLoading && !isEditing && children ? <div className="mt-4">{children}</div> : null}

      {isError && errorMessage ? (
        // `role="alert"`: el fallo sustituye al contenido esperado tras una acción del usuario.
        <div role="alert" className="mt-3">
          <p className="whitespace-pre-line font-body text-body-sm text-feedback-error">
            {errorMessage}
          </p>
          {correlationId && correlationLabel ? (
            <p className="mt-1 font-body text-caption text-muted">
              {correlationLabel}
              <span className="ml-1 select-all tabular-nums">{correlationId}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {contextNote && !isLoading ? (
        <p className="mt-3 font-body text-caption text-muted">{contextNote}</p>
      ) : null}

      {meta && !isLoading ? <div className="mt-3">{meta}</div> : null}

      {isEditing && (onCancelEdit || onSaveEdit) ? (
        <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {onCancelEdit && cancelEditLabel ? (
            <Button
              variant="secondary"
              onClick={onCancelEdit}
              disabled={isSubmitting}
              fullWidth
              className="sm:w-auto"
              data-testid="ai-action-cancel-edit"
            >
              {cancelEditLabel}
            </Button>
          ) : null}
          {onSaveEdit && saveEditLabel ? (
            <Button
              onClick={onSaveEdit}
              // `isLoading` deshabilita el botón: la guarda contra el doble envío es del
              // componente, no del consumidor.
              isLoading={isSubmitting}
              loadingLabel={submittingLabel}
              fullWidth
              className="sm:w-auto"
              data-testid="ai-action-save-edit"
            >
              {saveEditLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {isError && (onRetry || onDismiss) ? (
        <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {onDismiss && dismissLabel ? (
            <Button
              variant="ghost"
              onClick={onDismiss}
              fullWidth
              className="sm:w-auto"
              data-testid="ai-action-dismiss"
            >
              {dismissLabel}
            </Button>
          ) : null}
          {onRetry && retryLabel ? (
            <Button
              onClick={onRetry}
              isLoading={isSubmitting}
              loadingLabel={submittingLabel}
              fullWidth
              className="sm:w-auto"
              data-testid="ai-action-retry"
            >
              {retryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {showReviewActions && actions ? <div className="mt-4">{actions}</div> : null}
    </section>
  );
}
