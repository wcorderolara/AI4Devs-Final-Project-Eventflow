'use client';

// US-025 (PB-P1-016 / FE-002 + FE-004) — Componente reusable `HITLActions`. Trio de acciones
// canónicas (Aplicar / Editar / Descartar) con orden de tab, `aria-live="polite"` para anunciar
// resultados y telemetría `hitl.action.*`. El consumidor pasa `aiRecommendationId`, un opcional
// `EditorComponent` para el modal de edición (por `type`) y las query keys a invalidar.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { QueryKey } from '@tanstack/react-query';
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
  const payload = JSON.stringify({ event: `hitl.action.${action}`, type, ts: new Date().toISOString() });
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/telemetry', blob);
      return;
    }
  } catch {
    // fallback below
  }
  void fetch('/api/v1/telemetry', { method: 'POST', body: payload, keepalive: true, credentials: 'include' }).catch(() => undefined);
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
    <div className="hitl-actions" data-testid="hitl-actions">
      <div role="group" aria-label={t('actions.groupLabel')}>
        {/* Orden de tab canónico: Aplicar → Editar → Descartar */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => handleApply(undefined)}
          aria-label={t('actions.applyAria')}
        >
          {t('actions.apply')}
        </button>
        {EditorComponent && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setEditing(true)}
            aria-label={t('actions.editAria')}
          >
            {t('actions.edit')}
          </button>
        )}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setConfirmingDiscard(true)}
          aria-label={t('actions.discardAria')}
        >
          {t('actions.discard')}
        </button>
      </div>

      {editing && EditorComponent && (
        <div role="dialog" aria-modal="true" aria-label={t('actions.editDialogLabel')}>
          <EditorComponent
            initialValue={initialOutput}
            onSubmit={(payload) => void handleApply(payload)}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {confirmingDiscard && (
        <div role="alertdialog" aria-modal="true" aria-label={t('actions.discardDialogLabel')}>
          <p>{t('actions.discardConfirm')}</p>
          <button type="button" onClick={() => void handleDiscard()}>
            {t('actions.discardConfirmYes')}
          </button>
          <button type="button" onClick={() => setConfirmingDiscard(false)}>
            {t('actions.discardConfirmCancel')}
          </button>
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
    </div>
  );
}
