'use client';

// US-037 (PB-P1-021 / FE-006) — Orquestador de los 3 dialogs. Renderiza CTA "Aplicar sugerencia IA"
// cuando hay una AIRecommendation pending, y coordina: preview dialog → (si replace_count > 0)
// confirm dialog → apply → (si CATEGORY_INACTIVE) modal de error. Consumido por la vista de
// US-019 (donde ya se muestra el preview de la sugerencia) o por la vista de US-035.
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { ApplyAIBudgetDialog, type BudgetItemPreview } from './ApplyAIBudgetDialog';
import { ReplaceConfirmationDialog } from './ReplaceConfirmationDialog';
import { CategoryInactiveErrorDialog } from './CategoryInactiveErrorDialog';
import {
  useApplyBudgetSuggestion,
  classifyBudgetApplyError,
  extractInactiveCategories,
  type EditedBudgetPayload,
  type InactiveCategoryDetail,
} from '../../hooks/useApplyBudgetSuggestion';

export interface BudgetApplyContainerProps {
  eventId: string;
  aiRecommendationId: string;
  currencyCode: string;
  items: BudgetItemPreview[];
  /** Hint calculado por el consumidor a partir de items previos ai_generated. Cero ⇒ omite confirm. */
  replacedItemsCountHint?: number;
  affectedReplaceCategories?: string[];
  disabled?: boolean;
  onApplied?: () => void;
}

type Phase = 'idle' | 'preview' | 'confirm' | 'applying' | 'applied' | 'error';

export function BudgetApplyContainer({
  eventId,
  aiRecommendationId,
  currencyCode,
  items,
  replacedItemsCountHint = 0,
  affectedReplaceCategories = [],
  disabled = false,
  onApplied,
}: BudgetApplyContainerProps): JSX.Element {
  const t = useTranslations('ai.budgetApply');
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingPayload, setPendingPayload] = useState<EditedBudgetPayload | null>(null);
  const [inactiveCategories, setInactiveCategories] = useState<InactiveCategoryDetail[]>([]);
  const [errorKindMsg, setErrorKindMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const mutation = useApplyBudgetSuggestion({ aiRecommendationId, eventId });

  const doApply = useCallback(
    (payload: EditedBudgetPayload) => {
      setPhase('applying');
      setStatusMsg(t('status.applying'));
      mutation.mutate(
        { editedPayload: payload as unknown as Record<string, unknown> },
        {
          onSuccess: () => {
            setPhase('applied');
            setStatusMsg(t('status.success'));
            setPendingPayload(null);
            onApplied?.();
          },
          onError: (err: unknown) => {
            const kind = classifyBudgetApplyError(err);
            if (kind === 'CATEGORY_INACTIVE') {
              setInactiveCategories(extractInactiveCategories(err));
              setPhase('error');
              setErrorKindMsg(null);
              return;
            }
            const msg = err instanceof ApiError ? t(`errors.${kind}`) : t('errors.UNKNOWN');
            setErrorKindMsg(msg);
            setPhase('preview'); // reabrir el preview con el error visible
          },
        },
      );
    },
    [mutation, onApplied, t],
  );

  const openPreview = useCallback(() => {
    setErrorKindMsg(null);
    setStatusMsg(null);
    setPhase('preview');
  }, []);

  const closeAll = useCallback(() => {
    setPhase('idle');
    setPendingPayload(null);
    setInactiveCategories([]);
    setErrorKindMsg(null);
  }, []);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openPreview}
        disabled={disabled || phase === 'applying'}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {t('cta.openPreview')}
      </button>

      {/* status live region para éxito y "aplicando…" (AC-09) */}
      <p role="status" aria-live="polite" className="sr-only">
        {statusMsg ?? ''}
      </p>

      <ApplyAIBudgetDialog
        open={phase === 'preview' || phase === 'applying'}
        currencyCode={currencyCode}
        initialItems={items}
        submitting={phase === 'applying'}
        errorMessage={errorKindMsg}
        replacedItemsCountHint={replacedItemsCountHint}
        onCancel={closeAll}
        onSubmit={({ editedPayload }) => {
          setPendingPayload(editedPayload);
          if (replacedItemsCountHint > 0) {
            setPhase('confirm');
          } else {
            doApply(editedPayload);
          }
        }}
      />

      <ReplaceConfirmationDialog
        open={phase === 'confirm'}
        replaceCount={replacedItemsCountHint}
        affectedCategories={affectedReplaceCategories}
        submitting={false}
        onCancel={() => setPhase('preview')}
        onConfirm={() => {
          if (pendingPayload) doApply(pendingPayload);
        }}
      />

      <CategoryInactiveErrorDialog
        open={phase === 'error'}
        eventId={eventId}
        inactiveCategories={inactiveCategories}
        onClose={closeAll}
      />
    </div>
  );
}
