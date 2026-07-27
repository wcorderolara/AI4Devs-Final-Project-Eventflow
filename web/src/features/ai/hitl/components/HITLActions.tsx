'use client';

// US-025 (PB-P1-016 / FE-002 + FE-004) — Componente reusable `HITLActions`. Trio de acciones
// canónicas (Aplicar / Editar / Descartar) con orden de tab, `aria-live="polite"` para anunciar
// resultados y telemetría `hitl.action.*`. El consumidor pasa `aiRecommendationId`, un opcional
// `EditorComponent` para el modal de edición (por `type`) y las query keys a invalidar.
//
// PB-P2-032: el trío de acciones pasa a `AIRecommendationActions` del design system (mismo orden
// canónico, tokens aprobados y apilado en móvil) y los dos overlays propios —un `div` con
// `role="dialog"` sin focus trap ni bloqueo de scroll— pasan a `Modal` y `ConfirmationDialog`.
// La API pública, las mutaciones, la telemetría y el flujo HITL no cambian.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { QueryKey } from '@tanstack/react-query';
import { AIRecommendationActions, ConfirmationDialog, Modal } from '@/shared/design-system';
import { useApplyAIRecommendation } from '../hooks/useApplyAIRecommendation';
import { useDiscardAIRecommendation } from '../hooks/useDiscardAIRecommendation';

export interface HITLEditorProps {
  initialValue: unknown;
  onSubmit: (editedPayload: Record<string, unknown>) => void;
  onCancel: () => void;
}

interface HITLActionsProps {
  aiRecommendationId: string;
  type: string;
  initialOutput: unknown;
  invalidateQueryKeys?: QueryKey[];
  onApplied?: () => void;
  onDiscarded?: () => void;
  /** Editor específico por `type` (provisto por la US dueña). */
  EditorComponent?: (props: HITLEditorProps) => JSX.Element;
}

function emitTelemetry(action: 'applied' | 'discarded' | 'edited_apply', type: string): void {
  const payload = JSON.stringify({
    event: `hitl.action.${action}`,
    type,
    ts: new Date().toISOString(),
  });
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/telemetry', blob);
      return;
    }
  } catch {
    // fallback below
  }
  void fetch('/api/v1/telemetry', {
    method: 'POST',
    body: payload,
    keepalive: true,
    credentials: 'include',
  }).catch(() => undefined);
}

export function HITLActions({
  aiRecommendationId,
  type,
  initialOutput,
  invalidateQueryKeys,
  onApplied,
  onDiscarded,
  EditorComponent,
}: HITLActionsProps): JSX.Element {
  // Sub-namespace `hitl` bajo `ai` (evita registrar un catálogo top-level nuevo).
  const t = useTranslations('ai.hitl');
  const [editing, setEditing] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const apply = useApplyAIRecommendation({ aiRecommendationId, invalidateQueryKeys });
  const discard = useDiscardAIRecommendation({ aiRecommendationId, invalidateQueryKeys });

  const isBusy = apply.isPending || discard.isPending;

  const handleApply = async (editedPayload?: Record<string, unknown>): Promise<void> => {
    try {
      await apply.mutateAsync({ editedPayload });
      emitTelemetry(editedPayload ? 'edited_apply' : 'applied', type);
      setStatusMessage(t('toasts.applied'));
      setEditing(false);
      onApplied?.();
    } catch {
      setStatusMessage(t('errors.applyFailed'));
    }
  };

  const handleDiscard = async (): Promise<void> => {
    try {
      await discard.mutateAsync();
      emitTelemetry('discarded', type);
      setStatusMessage(t('toasts.discarded'));
      setConfirmingDiscard(false);
      onDiscarded?.();
    } catch {
      setStatusMessage(t('errors.discardFailed'));
    }
  };

  return (
    <div data-testid="hitl-actions">
      {/* Orden de tab canónico: Aplicar → Editar → Descartar. Lo garantiza el propio
          `AIRecommendationActions`: el orden es del sistema, no de cada consumidor. */}
      <AIRecommendationActions
        groupLabel={t('actions.groupLabel')}
        isBusy={isBusy}
        accept={{
          label: t('actions.apply'),
          ariaLabel: t('actions.applyAria'),
          onSelect: () => void handleApply(undefined),
        }}
        edit={
          EditorComponent
            ? {
                label: t('actions.edit'),
                ariaLabel: t('actions.editAria'),
                onSelect: () => setEditing(true),
              }
            : undefined
        }
        reject={{
          label: t('actions.discard'),
          ariaLabel: t('actions.discardAria'),
          onSelect: () => setConfirmingDiscard(true),
        }}
      />

      {editing && EditorComponent && (
        <Modal
          open
          onClose={() => setEditing(false)}
          title={t('actions.editDialogLabel')}
          showCloseButton={false}
          // Cerrar por fuera con un formulario a medias perdería la edición; `Esc` sigue
          // disponible porque el editor conserva su propio botón de cancelar.
          closeOnOverlayClick={false}
        >
          <EditorComponent
            initialValue={initialOutput}
            onSubmit={(payload) => void handleApply(payload)}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}

      {confirmingDiscard && (
        <ConfirmationDialog
          open
          onClose={() => setConfirmingDiscard(false)}
          title={t('actions.discardDialogLabel')}
          description={t('actions.discardConfirm')}
          confirmLabel={t('actions.discardConfirmYes')}
          cancelLabel={t('actions.discardConfirmCancel')}
          isLoading={discard.isPending}
          onConfirm={() => void handleDiscard()}
        />
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
    </div>
  );
}
